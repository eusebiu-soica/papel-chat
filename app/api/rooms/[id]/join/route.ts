import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db/provider"
import { getOrCreateDbUser } from "@/lib/server/get-or-create-db-user"

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

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const dbUser = await getOrCreateDbUser(clerkUser)

    // Check if room exists
    const room = await db.getRoomById(id)

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    // Ensure there is a backing group for this room
    let group = await db.getGroupById(id)
    if (!group) {
      group = await db.createGroup({
        id: id,
        name: room.name,
        avatar: null,
        createdBy: room.createdBy,
        memberIds: [room.createdBy],
      })
    }

    await db.addGroupMember(group.id, dbUser.id)

    return NextResponse.json({ success: true, groupId: group.id }, { status: 200 })
  } catch (error) {
    console.error("Error joining room:", error)
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
  }
}

