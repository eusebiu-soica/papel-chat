import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { userId: authUserId } = await auth()
  
  if (!authUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const chatId = request.nextUrl.searchParams.get("chatId")
    const groupId = request.nextUrl.searchParams.get("groupId")

    if (!chatId && !groupId) {
      return NextResponse.json({ error: "chatId or groupId is required" }, { status: 400 })
    }

    const messages = await prisma.message.findMany({
      where: chatId ? { chatId } : { groupId },
      // Optimizare: Selectăm doar câmpurile necesare pentru UI
      select: {
        id: true,
        content: true,
        createdAt: true,
        sender: {
            select: {
                id: true,
                name: true,
                avatar: true
            }
        }
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100 // Limităm la ultimele 100 mesaje pentru viteză
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth()
    if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const clerkUser = await currentUser()
    const dbUser = await prisma.user.findUnique({
      where: { email: clerkUser?.primaryEmailAddress?.emailAddress || '' },
    })
    
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 400 })

    const { content, senderId, chatId, groupId } = await request.json()

    if (!content || !senderId || (!chatId && !groupId)) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    
    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        senderId: dbUser.id,
        chatId: chatId || undefined,
        groupId: groupId || undefined,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    })

    // Update last message timestamp asynchronously (fără await pentru a răspunde mai repede)
    if (chatId) {
      prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }).catch(console.error)
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 })
  }
}