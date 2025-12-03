// Hook for real-time chat subscriptions (Firebase only)
"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/db/provider"
import type { ChatWithDetails } from "@/lib/db/adapter"

export function useRealtimeChats(userId: string | null) {
  const [chats, setChats] = useState<ChatWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('[useRealtimeChats] Effect triggered, userId:', userId)
    
    if (!userId) {
      console.log('[useRealtimeChats] No userId, skipping subscription')
      setIsLoading(false)
      return
    }

    // Get adapter instance - need to check if it's Firestore
    // On client side, db is a singleton that was initialized server-side
    // We need to check if it has the subscribeToChats method
    const adapter = db as any
    
    console.log('[useRealtimeChats] Checking adapter:', {
      hasSubscribeToChats: typeof adapter.subscribeToChats === 'function',
      adapterType: adapter.constructor?.name,
      userId
    })
    
    if (typeof adapter.subscribeToChats !== 'function') {
      console.log('[useRealtimeChats] Real-time not supported, falling back to polling')
      // Fallback to polling if real-time not supported (Prisma)
      const fetchChats = async () => {
        try {
          const res = await fetch(`/api/chats?userId=${userId}`)
          if (res.ok) {
            const data = await res.json()
            // Format API response to ChatWithDetails
            const formatted: ChatWithDetails[] = data.map((chat: any) => ({
              id: chat.id,
              userId1: chat.userId || '',
              userId2: null,
              createdAt: new Date(chat.lastMessageTime),
              updatedAt: new Date(chat.lastMessageTime),
              user1: chat.userId ? {
                id: chat.userId,
                email: '',
                name: chat.name,
                avatar: chat.avatar,
                createdAt: new Date(),
                updatedAt: new Date(),
              } : undefined,
              user2: null,
              messages: chat.message ? [{
                id: '',
                content: chat.message,
                senderId: '',
                chatId: chat.id,
                groupId: null,
                replyToId: null,
                deletedForEveryone: false,
                createdAt: new Date(chat.lastMessageTime),
                updatedAt: new Date(chat.lastMessageTime),
              }] : [],
            }))
            setChats(formatted)
          }
        } catch (err) {
          console.error('Failed to fetch chats', err)
        } finally {
          setIsLoading(false)
        }
      }

      fetchChats()
      const interval = setInterval(fetchChats, 10000) // Poll every 10s

      return () => clearInterval(interval)
    }

    // Use real-time subscription (Firebase)
    setIsLoading(true)
    try {
      console.log('[useRealtimeChats] Setting up subscription for userId:', userId)
      const unsubscribe = adapter.subscribeToChats(userId, (newChats: ChatWithDetails[]) => {
        console.log('[useRealtimeChats] ✅ Received', newChats.length, 'chats from subscription')
        console.log('[useRealtimeChats] Chat IDs:', newChats.map(c => c.id))
        console.log('[useRealtimeChats] Chat details:', newChats.map(c => ({
          id: c.id,
          userId1: c.userId1,
          userId2: c.userId2,
          hasUser1: !!c.user1,
          hasUser2: !!c.user2,
          messageCount: c.messages?.length || 0
        })))
        setChats(newChats)
        setIsLoading(false)
      })

      console.log('[useRealtimeChats] Subscription set up, unsubscribe function:', typeof unsubscribe)

      return () => {
        console.log('[useRealtimeChats] Cleaning up subscription')
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe()
        }
      }
    } catch (error) {
      console.error('[useRealtimeChats] ❌ Failed to subscribe to chats:', error)
      setIsLoading(false)
      return () => {}
    }
  }, [userId])

  return { chats, isLoading }
}

