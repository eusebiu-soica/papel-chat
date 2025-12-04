import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/provider"

export async function GET(request: NextRequest) {
  try {
    const searchQuery = request.nextUrl.searchParams.get("username") ?? request.nextUrl.searchParams.get("q")

    if (!searchQuery) {
      return NextResponse.json([])
    }

    const users = await db.searchUsersByUsername(searchQuery, 10)
    const payload = users.map((user) => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      username: user.username,
    }))

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, avatar, username } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ error: "email and name are required" }, { status: 400 })
    }

    // Check if user already exists
    let existingUser = await db.getUserByEmail(email)

    if (existingUser) {
      console.log('[API] User already exists:', existingUser.id, 'email:', email)
      return NextResponse.json(existingUser)
    }

    // Create new user using the adapter
    const user = await db.createUser({
      email,
      name,
      avatar,
      username,
    })

    console.log('[API] Created new user:', user.id, 'email:', email)
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
