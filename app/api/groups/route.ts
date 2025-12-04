import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/provider"

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const groups = await db.getGroupsByUserId(userId)

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

    const group = await db.createGroup({
      name,
      avatar,
      createdBy,
      memberIds: memberIds && Array.isArray(memberIds) ? memberIds : [],
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error("Error creating group:", error)
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 })
  }
}
