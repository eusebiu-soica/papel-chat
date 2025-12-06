"use client"

import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"
import type { MessageWithDetails } from "@/lib/db/adapter"
import { auth } from "@/lib/firebase/config"

const adapter = new FirestoreAdapter()

type MessageParams = { chatId?: string; groupId?: string }

export function useRealtimeMessages(params: MessageParams) {
  const queryClient = useQueryClient()
  const chatId = params.chatId
  const groupId = params.groupId
  const identifier = chatId ? `chat:${chatId}` : groupId ? `group:${groupId}` : null

  // State pentru a ști când Firebase Auth este gata
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)

  // Ascultăm starea de autentificare
  useEffect(() => {
    if (!auth) return

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsFirebaseReady(true)
      } else {
        setIsFirebaseReady(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Fetch initial 20 messages directly from DB
  const { data, isLoading } = useQuery({
    queryKey: ["messages", identifier, "initial"],
    enabled: !!identifier && isFirebaseReady,
    queryFn: async () => {
      // Fetch last 20 messages directly from DB
      const messages = await adapter.getMessages({
        chatId: chatId || undefined,
        groupId: groupId || undefined,
        limit: 20
      })
      // Sort by createdAt descending to get latest first, then reverse to show oldest first
      return messages.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
        return timeA - timeB // Ascending order (oldest first)
      })
    },
    initialData: [] as MessageWithDetails[],
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Fetch on mount
  })

  useEffect(() => {
    // Start subscription only when everything is ready
    if (!identifier || !isFirebaseReady) return

    const unsubscribe = adapter.subscribeToMessages({ chatId, groupId }, (newMessages) => {
      // Merge with existing messages, avoiding duplicates
      queryClient.setQueryData<MessageWithDetails[]>(["messages", identifier, "initial"], (old = []) => {
        const messageMap = new Map<string, MessageWithDetails>()
        
        // Add existing messages
        old.forEach(msg => messageMap.set(msg.id, msg))
        
        // Update/add new messages from subscription
        newMessages.forEach(msg => messageMap.set(msg.id, msg))
        
        // Return sorted array (oldest first)
        return Array.from(messageMap.values()).sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
          return timeA - timeB
        })
      })
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [chatId, groupId, identifier, queryClient, isFirebaseReady])

  return {
    messages: data ?? [],
    isLoading: isLoading || !isFirebaseReady,
  }
}