import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db/provider"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: authUserId } = await auth()
    const { id } = await params
    
    if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const clerkUser = await currentUser()
    let dbUser = await db.getUserByEmail(clerkUser?.primaryEmailAddress?.emailAddress || '')
    
    if (!dbUser) {
      // Create user if doesn't exist
      dbUser = await db.createUser({
        email: clerkUser?.primaryEmailAddress?.emailAddress || '',
        name: clerkUser?.fullName || clerkUser?.firstName || 'User',
        avatar: clerkUser?.imageUrl || undefined,
      })
    }
    
    // 1. Cautam chat-ul
    const chat = await db.getChatById(id)

    if (!chat) {
      console.error(`Chat not found: ${id}`)
      return NextResponse.json({ 
        error: "Chat not found",
        details: `Chat with ID "${id}" does not exist. The link may be invalid or the chat may have been deleted.`
      }, { status: 404 })
    }

    // 2. Logica de Join
    
    // Daca userul este deja in chat (e creatorul sau a intrat deja)
    if (chat.userId1 === dbUser.id || chat.userId2 === dbUser.id) {
        return NextResponse.json(chat, { status: 200 })
    }

    // Daca chatul este "in asteptare" (userId2 e null)
    if (chat.userId2 === null) {
        const updatedChat = await db.updateChat(id, { userId2: dbUser.id })
        return NextResponse.json(updatedChat, { status: 200 })
    }

    // Daca chatul e plin (are deja 2 useri diferiti de cel curent)
    // Verificam daca exista deja un chat privat intre cei doi
    const allChats = await db.getChatsByUserId(dbUser.id)
    const existingChat = allChats.find(
      c => (c.userId1 === chat.userId1 && c.userId2 === dbUser.id) ||
           (c.userId1 === dbUser.id && c.userId2 === chat.userId1)
    )

    if (existingChat) return NextResponse.json(existingChat, { status: 200 })

    // Altfel, cream un chat nou
    const newChat = await db.createChat({
        userId1: chat.userId1, // Creatorul original
        userId2: dbUser.id     // Cel care a dat click
    })

    return NextResponse.json(newChat, { status: 201 })

  } catch (error: any) {
    console.error("Error joining chat:", error)
    return NextResponse.json({ 
      error: "Failed to join",
      details: error?.message || "An unexpected error occurred"
    }, { status: 500 })
  }
}