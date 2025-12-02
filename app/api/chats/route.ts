import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { userId: authUserId } = await auth()
  
  if (!authUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
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
    
    // Get all chats for the authenticated user (use database user ID)
    const queryUserId = request.nextUrl.searchParams.get("userId")
    const userId = queryUserId || dbUser.id

    let chats
    if (userId) {
      chats = await prisma.chat.findMany({
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
    } else {
      // If no userId provided, return all chats (useful for demo/dev)
      chats = await prisma.chat.findMany({
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
    }

    // Map the response to include the other user's info
    const formattedChats = chats.map((chat: any) => {
      let otherUser
      if (userId) {
        otherUser = chat.userId1 === userId ? chat.user2 : chat.user1
      } else {
        // default to user2 when no userId is provided
        otherUser = chat.user2 || chat.user1
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
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId1, userId2, shareableId, isPending } = await request.json()

    // If creating a pending chat (for shareable links), use authenticated userId
    if (isPending) {
      // Get Clerk user to find database user by email
      const clerkUser = await currentUser()
      if (!clerkUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      
      // Find database user by email (since Clerk ID != DB ID)
      let dbUser = await prisma.user.findUnique({
        where: { email: clerkUser.primaryEmailAddress?.emailAddress || '' },
      })
      
      // If user doesn't exist in DB, create them
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.fullName || clerkUser.firstName || 'User',
            avatar: clerkUser.imageUrl || undefined,
          },
        })
      }
      
      const dbUserId = dbUser.id
      
      // For pending chats, we need a placeholder user for userId2
      // Check if a system/pending user exists, or create one
      let pendingUser = await prisma.user.findFirst({
        where: { email: 'pending@system.local' },
      })
      
      if (!pendingUser) {
        pendingUser = await prisma.user.create({
          data: {
            email: 'pending@system.local',
            name: 'Pending User',
          },
        })
      }
      
      // Check if a pending chat already exists for this user
      const existingPendingChat = await prisma.chat.findUnique({
        where: {
          userId1_userId2: {
            userId1: dbUserId,
            userId2: pendingUser.id,
          },
        },
        include: {
          user1: true,
          user2: true,
        },
      })
      
      if (existingPendingChat) {
        // Return existing pending chat
        return NextResponse.json({ ...existingPendingChat, isPending: true, shareableId }, { status: 200 })
      }
      
      // Create a new pending chat with the placeholder user
      const chat = await prisma.chat.create({
        data: {
          userId1: dbUserId, // Use database user ID, not Clerk ID
          userId2: pendingUser.id, // Placeholder - will be updated when someone joins
        },
        include: {
          user1: true,
          user2: true,
        },
      })
      
      return NextResponse.json({ ...chat, isPending: true, shareableId }, { status: 201 })
    }

    if (!userId1 || !userId2) {
      return NextResponse.json({ error: "userId1 and userId2 are required" }, { status: 400 })
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
    
    // Ensure the authenticated user is part of the chat (using database user ID)
    if (userId1 !== dbUser.id && userId2 !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
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
  } catch (error: any) {
    console.error("Error creating chat:", error)
    return NextResponse.json({ 
      error: "Failed to create chat", 
      details: error?.message || 'Unknown error' 
    }, { status: 500 })
  }
}
