import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: authUserId } = await auth()
    const { id } = await params
    
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Clerk user to find database user
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Find database user by email
    const dbUser = await prisma.user.findUnique({
      where: { email: clerkUser.primaryEmailAddress?.emailAddress || '' },
    })
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 400 })
    }
    
    // Find the chat
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        user1: true,
        user2: true,
      },
    })

    if (!chat) {
      console.error(`Chat not found with ID: ${id}`)
      return NextResponse.json({ 
        error: "Chat not found",
        details: `No chat exists with ID: ${id}. Please check the link and try again.`
      }, { status: 404 })
    }

    // Check if chat is pending (userId2 is the pending user)
    const pendingUser = await prisma.user.findFirst({
      where: { email: 'pending@system.local' },
    })
    
    if (pendingUser && chat.userId2 === pendingUser.id && chat.userId1 !== dbUser.id) {
      // Update the pending chat with the joining user
      const updatedChat = await prisma.chat.update({
        where: { id },
        data: {
          userId2: dbUser.id,
        },
        include: {
          user1: true,
          user2: true,
        },
      })
      
      return NextResponse.json(updatedChat, { status: 200 })
    }

    // If chat already exists with both users, return it
    if ((chat.userId1 === dbUser.id || chat.userId2 === dbUser.id)) {
      return NextResponse.json(chat, { status: 200 })
    }

    // If user is trying to join a chat they're not part of, create a new chat
    // This handles the case where someone shares a link to an existing chat
    const existingChat = await prisma.chat.findFirst({
      where: {
        OR: [
          { userId1: chat.userId1, userId2: dbUser.id },
          { userId1: dbUser.id, userId2: chat.userId1 },
        ],
      },
    })

    if (existingChat) {
      return NextResponse.json(existingChat, { status: 200 })
    }

      // Create a new chat between the original creator and the joining user
      const newChat = await prisma.chat.create({
        data: {
          userId1: chat.userId1,
          userId2: dbUser.id,
        },
      include: {
        user1: true,
        user2: true,
      },
    })

    return NextResponse.json(newChat, { status: 201 })
  } catch (error: any) {
    console.error("Error joining chat:", error)
    return NextResponse.json({ 
      error: "Failed to join chat",
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}

