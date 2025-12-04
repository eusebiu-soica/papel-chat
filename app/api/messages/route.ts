import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db/provider"
import { getOrCreateDbUser } from "@/lib/server/get-or-create-db-user"

export async function GET(request: NextRequest) {
  const { userId: authUserId } = await auth()
  
  if (!authUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const chatId = request.nextUrl.searchParams.get("chatId")
    const groupId = request.nextUrl.searchParams.get("groupId")
    const after = request.nextUrl.searchParams.get("after") // For incremental updates

    if (!chatId && !groupId) {
      return NextResponse.json({ error: "chatId or groupId is required" }, { status: 400 })
    }

    const messages = await db.getMessages({
      chatId: chatId || undefined,
      groupId: groupId || undefined,
      after: after || undefined,
      limit: after ? 50 : 100,
    })

    // Format for API response
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.deletedForEveryone ? '' : msg.content,
      createdAt: msg.createdAt,
      deletedForEveryone: msg.deletedForEveryone,
      deletedAt: msg.deletedAt,
      replyTo: msg.replyTo ? {
        id: msg.replyTo.id,
        content: msg.replyTo.content,
        sender: {
          id: msg.replyTo.sender?.id || '',
          name: msg.replyTo.sender?.name || '',
          avatar: msg.replyTo.sender?.avatar || undefined,
        }
      } : null,
      sender: {
        id: msg.sender?.id || '',
        name: msg.sender?.name || '',
        avatar: msg.sender?.avatar || undefined,
      },
      reactions: msg.reactions?.map(r => ({
        emoji: r.emoji,
        userId: r.userId,
      })) || [],
    }))

    return NextResponse.json(formattedMessages, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
      }
    })
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
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const dbUser = await getOrCreateDbUser(clerkUser)

    let { content, senderId, chatId, groupId, replyToId } = await request.json()

    if (!content || !senderId || (!chatId && !groupId)) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Note: Content should already be encrypted on client-side
    // The adapter will check if it's encrypted and handle accordingly
    
    // Create message using adapter
    const message = await db.createMessage({
      content, // May already be encrypted from client
      senderId: dbUser.id,
      chatId: chatId || null,
      groupId: groupId || null,
      replyToId: replyToId || null,
    })

    // Format for API response
    const formattedMessage = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      deletedForEveryone: message.deletedForEveryone,
      deletedAt: message.deletedAt,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        sender: {
          id: message.replyTo.sender?.id || '',
          name: message.replyTo.sender?.name || '',
          avatar: message.replyTo.sender?.avatar || undefined,
        }
      } : null,
      sender: {
        id: message.sender?.id || '',
        name: message.sender?.name || '',
        avatar: message.sender?.avatar || undefined,
      },
      reactions: message.reactions?.map(r => ({
        emoji: r.emoji,
        userId: r.userId,
      })) || [],
    }

    return NextResponse.json(formattedMessage, { status: 201 })
  } catch (error: any) {
    console.error("Error creating message:", error)
    return NextResponse.json({ 
      error: "Failed to create message", 
      details: error.message || "Unknown error" 
    }, { status: 500 })
  }
}
