"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"
import type { ChatWithDetails } from "@/lib/db/adapter"

const adapter = new FirestoreAdapter()

export function useRealtimeChats(userId: string | null) {
  const queryClient = useQueryClient()
  
  const { data, isLoading } = useQuery({
    queryKey: ["chats", userId],
    enabled: !!userId,
    // SCHIMBARE: Folosim adaptorul direct
    queryFn: async () => {
      if (!userId) return []
      return adapter.getChatsByUserId(userId)
    },
    initialData: [] as ChatWithDetails[],
    staleTime: Infinity,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  useEffect(() => {
    if (!userId) return

    // Subscripție directă la lista de chat-uri
    const unsubscribe = adapter.subscribeToChats(userId, (newChats) => {
      queryClient.setQueryData(["chats", userId], newChats)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [userId, queryClient])

  return {
    chats: data ?? [],
    isLoading,
  }
}