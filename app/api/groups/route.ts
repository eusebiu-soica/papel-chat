import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error("Error fetching groups:", error)
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, avatar, createdBy, memberIds } = await request.json()

    if (!name || !createdBy) {
      return NextResponse.json({ error: "name and createdBy are required" }, { status: 400 })
    }

    const group = await prisma.group.create({
      data: {
        id: uuidv4(),
        name,
        avatar,
        createdBy,
        members: {
          create: [
            { userId: createdBy },
            ...(memberIds || []).map((userId: string) => ({ userId })),
          ],
        },
      },
      include: {
        members: true,
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error("Error creating group:", error)
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 })
  }
}
