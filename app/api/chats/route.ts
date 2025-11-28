import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Get all chats for a user
    const userId = request.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const chats = await prisma.chat.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      include: {
        user1: true,
        user2: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Map the response to include the other user's info
    const formattedChats = chats.map((chat: any) => {
      const otherUser = chat.userId1 === userId ? chat.user2 : chat.user1
      return {
        id: chat.id,
        userId: otherUser.id,
        name: otherUser.name,
        avatar: otherUser.avatar,
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
    const { userId1, userId2 } = await request.json()

    if (!userId1 || !userId2) {
      return NextResponse.json({ error: "userId1 and userId2 are required" }, { status: 400 })
    }

    // Check if chat already exists
    const existingChat = await prisma.chat.findFirst({
      where: {
        OR: [
          { userId1, userId2 },
          { userId1: userId2, userId2: userId1 },
        ],
      },
    })

    if (existingChat) {
      return NextResponse.json(existingChat)
    }

    // Create new chat
    const chat = await prisma.chat.create({
      data: {
        userId1,
        userId2,
      },
      include: {
        user1: true,
        user2: true,
      },
    })

    return NextResponse.json(chat, { status: 201 })
  } catch (error) {
    console.error("Error creating chat:", error)
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
  }
}
