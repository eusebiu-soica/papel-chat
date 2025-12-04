import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db/provider"
import { getOrCreateDbUser } from "@/lib/server/get-or-create-db-user"

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth()
    if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const dbUser = await getOrCreateDbUser(clerkUser)

    const { messageId } = await request.json()

    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 })
    }

    // Get messages to verify ownership
    const messages = await db.getMessages({ chatId: undefined, groupId: undefined })
    const message = messages.find(m => m.id === messageId)

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    if (message.senderId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Mark as deleted for everyone
    await db.deleteMessage(messageId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting message:", error)
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 })
  }
}

