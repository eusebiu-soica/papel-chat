import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { v4 as uuidv4 } from "uuid"

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const rooms = await prisma.room.findMany({
      include: {
        creator: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

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

    // Get Clerk user to find database user
    const { currentUser } = await import("@clerk/nextjs/server")
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

    const { name, topic, createdBy, shareableId, isTemporary } = await request.json()

    if (!name || !createdBy) {
      return NextResponse.json({ error: "name and createdBy are required" }, { status: 400 })
    }
    
    // Ensure the authenticated user is the creator (using database user ID)
    if (createdBy !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const room = await prisma.room.create({
      data: {
        id: uuidv4(),
        name,
        topic,
        createdBy: dbUser.id, // Use database user ID
        // Store shareableId in topic or name if needed (since schema doesn't have shareableId field)
        // For now, we'll use the room ID as the shareable identifier
      },
      include: {
        creator: true,
      },
    })

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}
