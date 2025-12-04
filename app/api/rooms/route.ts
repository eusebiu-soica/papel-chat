import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db/provider"
import { getOrCreateDbUser } from "@/lib/server/get-or-create-db-user"

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const rooms = await db.getRooms()

    return NextResponse.json(rooms)
  } catch (error) {
    console.error("Error fetching rooms:", error)
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth()
    
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const dbUser = await getOrCreateDbUser(clerkUser)

    const { name, topic, shareableId, isTemporary } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }
    
    const room = await db.createRoom({
      name,
      topic,
      createdBy: dbUser.id,
      shareableId,
      isTemporary,
    })

    // Ensure there is a backing group chat with the same identifier
    await db.createGroup({
      id: room.id,
      name: room.name,
      avatar: null,
      createdBy: dbUser.id,
      memberIds: [dbUser.id],
    })

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}
