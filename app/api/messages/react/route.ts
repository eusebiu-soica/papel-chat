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

    const { messageId, emoji } = await request.json()

    if (!messageId || !emoji) {
      return NextResponse.json({ error: "messageId and emoji are required" }, { status: 400 })
    }

    // Check if reaction already exists
    const reactions = await db.getReactionsByMessageId(messageId)
    const existingReaction = reactions.find(
      r => r.messageId === messageId && r.userId === dbUser.id && r.emoji === emoji
    )

    if (existingReaction) {
      // Remove reaction (toggle off)
      await db.removeReaction(messageId, dbUser.id, emoji)
      return NextResponse.json({ success: true, action: 'removed' })
    } else {
      // Add reaction
      await db.addReaction(messageId, dbUser.id, emoji)
      return NextResponse.json({ success: true, action: 'added' })
    }
  } catch (error: any) {
    console.error("Error reacting to message:", error)
    return NextResponse.json({ error: "Failed to react to message" }, { status: 500 })
  }
}
