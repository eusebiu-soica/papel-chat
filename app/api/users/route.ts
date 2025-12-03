import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/provider"

export async function GET() {
  try {
    // Note: This endpoint doesn't have a direct equivalent in the adapter
    // For now, we'll return an empty array or implement a getAllUsers method
    // This endpoint might not be used in the app, but keeping it for compatibility
    return NextResponse.json([])
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, avatar } = await request.json()

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
    })

    console.log('[API] Created new user:', user.id, 'email:', email)
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
