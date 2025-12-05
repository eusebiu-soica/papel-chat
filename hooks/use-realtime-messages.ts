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
    // Skip initial fetch - subscription will provide data instantly
    queryFn: async () => {
      // Return empty array - subscription will populate immediately
      return [] as MessageWithDetails[]
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
    // The subscription callback will be called immediately with current data
    const unsubscribe = adapter.subscribeToMessages({ chatId, groupId }, (newMessages) => {
      // Update query data immediately - this will trigger re-render
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