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

    // Use database user ID
    const userIdToUse = dbUser.id

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id },
    })

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    // For rooms, we need to check if there's a Group with this room ID
    // or create a membership. Since the schema uses Group for multi-user chats,
    // we should check if a Group exists for this room, or create one.
    
    // Check if Group exists for this room
    let group = await prisma.group.findFirst({
      where: {
        // We'll need to link rooms to groups, but for now, let's create a group
        // based on the room name or ID
      },
    })

    // If no group exists, create one
    if (!group) {
      group = await prisma.group.create({
        data: {
          name: room.name,
          avatar: null,
          createdBy: room.createdBy,
        },
      })
    }

    // Add user to group if not already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userIdToUse,
        },
      },
    })

    if (!existingMember) {
      await prisma.groupMember.create({
        data: {
          groupId: group.id,
          userId: userIdToUse,
        },
      })
    }

    return NextResponse.json({ success: true, groupId: group.id }, { status: 200 })
  } catch (error) {
    console.error("Error joining room:", error)
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
  }
}

