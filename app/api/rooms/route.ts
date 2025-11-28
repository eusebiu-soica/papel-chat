import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { v4 as uuidv4 } from "uuid"

export async function GET() {
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
    const { name, topic, createdBy } = await request.json()

    if (!name || !createdBy) {
      return NextResponse.json({ error: "name and createdBy are required" }, { status: 400 })
    }

    const room = await prisma.room.create({
      data: {
        id: uuidv4(),
        name,
        topic,
        createdBy,
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
