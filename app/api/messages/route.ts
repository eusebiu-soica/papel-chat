import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const chatId = request.nextUrl.searchParams.get("chatId")
    const groupId = request.nextUrl.searchParams.get("groupId")

    if (!chatId && !groupId) {
      return NextResponse.json({ error: "chatId or groupId is required" }, { status: 400 })
    }

    const messages = await prisma.message.findMany({
      where: chatId ? { chatId } : { groupId },
      include: {
        sender: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, senderId, chatId, groupId } = await request.json()

    if (!content || !senderId || (!chatId && !groupId)) {
      return NextResponse.json(
        { error: "content, senderId, and (chatId or groupId) are required" },
        { status: 400 }
      )
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        ...(chatId && { chatId }),
        ...(groupId && { groupId }),
      },
      include: {
        sender: true,
      },
    })

    // Update chat/group lastMessageAt
    if (chatId) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      })
    } else if (groupId) {
      await prisma.group.update({
        where: { id: groupId },
        data: { updatedAt: new Date() },
      })
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 })
  }
}
