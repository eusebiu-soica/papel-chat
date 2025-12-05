"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"
import type { MessageWithDetails } from "@/lib/db/adapter"

const adapter = new FirestoreAdapter()

type MessageParams = { chatId?: string; groupId?: string }

export function useRealtimeMessages(params: MessageParams) {
  const queryClient = useQueryClient()
  const chatId = params.chatId
  const groupId = params.groupId
  const identifier = chatId ? `chat:${chatId}` : groupId ? `group:${groupId}` : null

  const { data, isLoading } = useQuery({
    queryKey: ["messages", identifier],
    enabled: !!identifier,
    // SCHIMBARE: Folosim adaptorul direct, nu API-ul
    queryFn: async () => {
      if (!chatId && !groupId) return []
      return adapter.getMessages({ chatId, groupId })
    },
    initialData: [] as MessageWithDetails[],
    staleTime: Infinity, // Lăsăm subscripția să se ocupe de actualizări
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  useEffect(() => {
    if (!identifier) return

    // Subscripție directă la Firebase (instantanee)
    const unsubscribe = adapter.subscribeToMessages({ chatId, groupId }, (newMessages) => {
      queryClient.setQueryData(["messages", identifier], newMessages)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [chatId, groupId, identifier, queryClient])

  return {
    messages: data ?? [],
    isLoading,
  }
}