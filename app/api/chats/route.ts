import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { userId: authUserId } = await auth()
  
  if (!authUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Optimizare: Selectăm doar ID-ul pentru viteză
    const dbUser = await prisma.user.findUnique({
      where: { email: clerkUser.primaryEmailAddress?.emailAddress || '' },
      select: { id: true }
    })
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 400 })
    }
    
    // --- CAZ SPECIAL: Fetch pentru un singur chat (Rapid) ---
    const chatId = request.nextUrl.searchParams.get("id")

    if (chatId) {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          user1: { select: { id: true, name: true, avatar: true } },
          user2: { select: { id: true, name: true, avatar: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1, // Luăm doar ultimul mesaj
            select: { content: true, createdAt: true }
          },
        }
      })

      if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })

      // Logică pentru a determina "celălalt utilizator"
      let otherUser
      if (!chat.userId2) {
         // Chat în așteptare
         otherUser = { id: null, name: "Waiting for user...", avatar: null }
      } else {
         otherUser = chat.userId1 === dbUser.id ? chat.user2 : chat.user1
      }

      // Returnăm ca array pentru consistență cu frontend-ul
      return NextResponse.json([{
        id: chat.id,
        userId: otherUser?.id || null,
        name: otherUser?.name || "Unknown",
        avatar: otherUser?.avatar || null,
        message: chat.messages[0]?.content || "No messages yet",
        lastMessageTime: chat.messages[0]?.createdAt || chat.createdAt,
      }])
    }
    // -------------------------------------------------------

    // Logică pentru lista completă de chat-uri (Sidebar)
    const userId = dbUser.id

    const chats = await prisma.chat.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      include: {
        user1: { select: { id: true, name: true, avatar: true } },
        user2: { select: { id: true, name: true, avatar: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true }
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    const formattedChats = chats.map((chat: any) => {
      let otherUser
      if (!chat.userId2) {
        otherUser = { id: null, name: "Waiting for user...", avatar: null }
      } else {
        otherUser = chat.userId1 === userId ? chat.user2 : chat.user1
      }
      
      return {
        id: chat.id,
        userId: otherUser?.id || null,
        name: otherUser?.name || "Unknown",
        avatar: otherUser?.avatar || null,
        message: chat.messages[0]?.content || "No messages yet",
        lastMessageTime: chat.messages[0]?.createdAt || chat.createdAt,
      }
    })

    return NextResponse.json(formattedChats)
  } catch (error) {
    console.error("Error fetching chats:", error)
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { userId1, userId2, isPending } = await request.json()

    const clerkUser = await currentUser()
    const dbUser = await prisma.user.findUnique({
      where: { email: clerkUser?.primaryEmailAddress?.emailAddress || '' }
    })

    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 400 })

    // CAZ 1: Creare chat "Pending" (Link Share)
    if (isPending) {
        const chat = await prisma.chat.create({
            data: {
                userId1: dbUser.id,
                // userId2 este opțional, deci îl lăsăm null
            }
        })
        return NextResponse.json({ ...chat, isPending: true }, { status: 201 })
    }

    // CAZ 2: Creare chat normal între doi useri
    if (!userId1 || !userId2) {
        return NextResponse.json({ error: "Both user IDs required" }, { status: 400 })
    }

    // Verificăm dacă există deja
    const existingChat = await prisma.chat.findFirst({
        where: {
            OR: [
                { userId1, userId2 },
                { userId1: userId2, userId2: userId1 }
            ]
        }
    })

    if (existingChat) return NextResponse.json(existingChat)

    const chat = await prisma.chat.create({
        data: { userId1, userId2 }
    })

    return NextResponse.json(chat, { status: 201 })

  } catch (error: any) {
    console.error("Error creating chat:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}