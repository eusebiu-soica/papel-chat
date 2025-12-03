import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db/provider"

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
    
    // Get or create user in database
    let dbUser = await db.getUserByEmail(clerkUser.primaryEmailAddress?.emailAddress || '')
    
    if (!dbUser) {
      // Create user if doesn't exist
      dbUser = await db.createUser({
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        avatar: clerkUser.imageUrl || undefined,
      })
    }
    
    // --- CAZ SPECIAL: Fetch pentru un singur chat (Rapid) ---
    const chatId = request.nextUrl.searchParams.get("id")

    if (chatId) {
      const chat = await db.getChatById(chatId)

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
        message: chat.messages?.[0]?.content || "No messages yet",
        lastMessageTime: chat.messages?.[0]?.createdAt || chat.createdAt,
      }])
    }
    // -------------------------------------------------------

    // Logică pentru lista completă de chat-uri (Sidebar)
    const userId = dbUser.id

    const chats = await db.getChatsByUserId(userId)

    const formattedChats = chats.map((chat) => {
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
        message: chat.messages?.[0]?.content || "No messages yet",
        lastMessageTime: chat.messages?.[0]?.createdAt || chat.createdAt,
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
    let dbUser = await db.getUserByEmail(clerkUser?.primaryEmailAddress?.emailAddress || '')
    
    if (!dbUser) {
      // Create user if doesn't exist
      dbUser = await db.createUser({
        email: clerkUser?.primaryEmailAddress?.emailAddress || '',
        name: clerkUser?.fullName || clerkUser?.firstName || 'User',
        avatar: clerkUser?.imageUrl || undefined,
      })
    }

    // CAZ 1: Creare chat "Pending" (Link Share)
    if (isPending) {
        console.log('[API] Creating pending chat with userId1:', dbUser.id)
        const chat = await db.createChat({
            userId1: dbUser.id,
            userId2: null,
        })
        console.log('[API] Created chat:', chat.id, 'userId1:', chat.userId1, 'userId2:', chat.userId2)
        return NextResponse.json({ ...chat, isPending: true }, { status: 201 })
    }

    // CAZ 2: Creare chat normal între doi useri
    if (!userId1 || !userId2) {
        return NextResponse.json({ error: "Both user IDs required" }, { status: 400 })
    }

    // Verificăm dacă există deja (check both directions)
    const allChats = await db.getChatsByUserId(userId1)
    const existingChat = allChats.find(
      chat => (chat.userId1 === userId1 && chat.userId2 === userId2) ||
               (chat.userId1 === userId2 && chat.userId2 === userId1)
    )

    if (existingChat) return NextResponse.json(existingChat)

    const chat = await db.createChat({
        userId1, 
        userId2 
    })

    return NextResponse.json(chat, { status: 201 })

  } catch (error: any) {
    console.error("Error creating chat:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}