// Hook for real-time message subscriptions (Firebase only)
"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/db/provider"
import type { MessageWithDetails } from "@/lib/db/adapter"

export function useRealtimeMessages(params: { chatId?: string; groupId?: string }) {
  const [messages, setMessages] = useState<MessageWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if adapter supports real-time subscriptions
    const adapter = db as any
    if (typeof adapter.subscribeToMessages !== 'function') {
      // Fallback to polling if real-time not supported (Prisma)
      const fetchMessages = async () => {
        try {
          const res = await fetch(
            `/api/messages?${params.chatId ? `chatId=${params.chatId}` : `groupId=${params.groupId}`}`
          )
          if (res.ok) {
            const data = await res.json()
            // Format API response to MessageWithDetails
            const formatted: MessageWithDetails[] = data.map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              senderId: msg.sender?.id || '',
              chatId: params.chatId || null,
              groupId: params.groupId || null,
              replyToId: msg.replyTo?.id || null,
              deletedForEveryone: msg.deletedForEveryone || false,
              deletedAt: msg.deletedAt ? new Date(msg.deletedAt) : null,
              createdAt: new Date(msg.createdAt),
              updatedAt: new Date(msg.createdAt),
              sender: msg.sender ? {
                id: msg.sender.id,
                email: '',
                name: msg.sender.name,
                avatar: msg.sender.avatar,
                createdAt: new Date(),
                updatedAt: new Date(),
              } : undefined,
              replyTo: msg.replyTo ? {
                id: msg.replyTo.id,
                content: msg.replyTo.content,
                senderId: '',
                chatId: null,
                groupId: null,
                replyToId: null,
                deletedForEveryone: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                sender: msg.replyTo.sender ? {
                  id: msg.replyTo.sender.id,
                  email: '',
                  name: msg.replyTo.sender.name,
                  avatar: msg.replyTo.sender.avatar,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                } : undefined,
              } : null,
              reactions: msg.reactions || [],
            }))
            setMessages(formatted)
          }
        } catch (err) {
          console.error('Failed to fetch messages', err)
        } finally {
          setIsLoading(false)
        }
      }

      fetchMessages()
      const interval = setInterval(fetchMessages, 2000) // Poll every 2s

      return () => clearInterval(interval)
    }

    // Use real-time subscription (Firebase)
    setIsLoading(true)
    try {
      const unsubscribe = adapter.subscribeToMessages(params, (newMessages: MessageWithDetails[]) => {
        setMessages(newMessages)
        setIsLoading(false)
      })

      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe()
        }
      }
    } catch (error) {
      console.error('Failed to subscribe to messages:', error)
      setIsLoading(false)
      return () => {}
    }
  }, [params.chatId, params.groupId])

  return { messages, isLoading }
}

