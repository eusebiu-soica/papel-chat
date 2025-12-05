"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useChat } from "@/lib/context/chat-context"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { db } from "@/lib/db/provider"

export default function JoinChatPage({ 
  params 
}: { 
  params: Promise<{ type: string; id: string }> 
}) {
  const { type, id } = use(params)
  const router = useRouter()
  const { currentUserId } = useChat()
  const { user, isLoaded } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !currentUserId || !user) return

    const joinChat = async () => {
      try {
        setLoading(true)
        setError(null)

        if (type === 'single') {
          // For single chat, join via the chat ID
          const chat = await db.getChatById(id)

          if (!chat) {
            throw new Error(`Chat with ID "${id}" does not exist. The link may be invalid or the chat may have been deleted.`)
          }

          // If user is already in chat (is creator or already joined)
          if (chat.userId1 === currentUserId || chat.userId2 === currentUserId) {
            router.push(`/chat/${chat.id}`)
            return
          }

          // If chat is "pending" (userId2 is null)
          if (chat.userId2 === null) {
            const updatedChat = await db.updateChat(id, { userId2: currentUserId })
            router.push(`/chat/${updatedChat.id}`)
            return
          }

          // If chat is full (has 2 different users), check if there's already a private chat between them
          const allChats = await db.getChatsByUserId(currentUserId)
          const existingChat = allChats.find(
            c => (c.userId1 === chat.userId1 && c.userId2 === currentUserId) ||
                 (c.userId1 === currentUserId && c.userId2 === chat.userId1)
          )

          if (existingChat) {
            router.push(`/chat/${existingChat.id}`)
            return
          }

          // Otherwise, create a new chat
          const newChat = await db.createChat({
            userId1: chat.userId1, // Original creator
            userId2: currentUserId  // User who clicked
          })
          router.push(`/chat/${newChat.id}`)
        } else if (type === 'room' || type === 'temp') {
          // For rooms, add user to the room
          const room = await db.getRoomById(id)

          if (!room) {
            throw new Error('Room not found')
          }

          // Ensure there is a backing group for this room
          let group = await db.getGroupById(id)
          if (!group) {
            group = await db.createGroup({
              id: id,
              name: room.name,
              avatar: null,
              createdBy: room.createdBy,
              memberIds: [room.createdBy],
            })
          }

          await db.addGroupMember(group.id, currentUserId)
          router.push(`/chat/${id}`)
        } else {
          throw new Error('Invalid chat type')
        }
      } catch (err: any) {
        console.error('Error joining chat:', err)
        setError(err.message || 'Failed to join chat')
        setLoading(false)
      }
    }

    joinChat()
  }, [type, id, currentUserId, isLoaded, user, router])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Joining chat...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-sm text-muted-foreground">
            The chat link may be invalid or expired. Please ask the person who shared it to generate a new link.
          </p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  return null
}

