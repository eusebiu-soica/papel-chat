"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useChat } from "@/lib/context/chat-context"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

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
          const res = await fetch(`/api/chats/${id}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            const errorMessage = errorData.details || errorData.error || 'Failed to join chat'
            console.error('Join chat error:', errorMessage, errorData, 'Chat ID:', id)
            throw new Error(errorMessage)
          }
          
          const chat = await res.json()
          router.push(`/chat/${chat.id}`)
        } else if (type === 'room' || type === 'temp') {
          // For rooms, add user to the room
          const res = await fetch(`/api/rooms/${id}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId }),
          })
          
          if (!res.ok) {
            throw new Error('Failed to join room')
          }
          
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

