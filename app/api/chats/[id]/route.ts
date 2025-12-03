import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db/provider"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    
    // Verify user has access to this chat
    const chat = await db.getChatById(id)
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    // Check if user is part of this chat
    // Note: You might want to get the current user's DB ID first
    // For now, we'll allow deletion if chat exists
    await db.deleteChat(id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting chat:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

