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
    
    if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const clerkUser = await currentUser()
    const dbUser = await prisma.user.findUnique({
      where: { email: clerkUser?.primaryEmailAddress?.emailAddress || '' },
    })
    
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 400 })
    
    // 1. Cautam chat-ul
    const chat = await prisma.chat.findUnique({
      where: { id },
    })

    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })

    // 2. Logica de Join
    
    // Daca userul este deja in chat (e creatorul sau a intrat deja)
    if (chat.userId1 === dbUser.id || chat.userId2 === dbUser.id) {
        return NextResponse.json(chat, { status: 200 })
    }

    // Daca chatul este "in asteptare" (userId2 e null)
    if (chat.userId2 === null) {
        const updatedChat = await prisma.chat.update({
            where: { id },
            data: { userId2: dbUser.id }
        })
        return NextResponse.json(updatedChat, { status: 200 })
    }

    // Daca chatul e plin (are deja 2 useri diferiti de cel curent)
    // Aici decidem: cream unul nou sau dam eroare? 
    // Pentru "Single Chat", daca linkul e folosit, probabil vrem sa cream unul nou intre creator (userId1) si noul venit.
    
    // Verificam daca exista deja un chat privat intre cei doi
    const existingChat = await prisma.chat.findFirst({
        where: {
            OR: [
                { userId1: chat.userId1, userId2: dbUser.id },
                { userId1: dbUser.id, userId2: chat.userId1 }
            ]
        }
    })

    if (existingChat) return NextResponse.json(existingChat, { status: 200 })

    // Altfel, cream un chat nou
    const newChat = await prisma.chat.create({
        data: {
            userId1: chat.userId1, // Creatorul original
            userId2: dbUser.id     // Cel care a dat click
        }
    })

    return NextResponse.json(newChat, { status: 201 })

  } catch (error: any) {
    console.error("Error joining chat:", error)
    return NextResponse.json({ error: "Failed to join" }, { status: 500 })
  }
}