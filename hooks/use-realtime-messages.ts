// Hook for real-time message subscriptions (Firebase only)
"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { db } from "@/lib/db/provider"
import type { MessageWithDetails } from "@/lib/db/adapter"

type MessageParams = { chatId?: string; groupId?: string }

async function fetchMessages(params: MessageParams): Promise<MessageWithDetails[]> {
  if (!params.chatId && !params.groupId) {
    return []
  }

  const queryString = params.chatId ? `chatId=${params.chatId}` : `groupId=${params.groupId}`
  const res = await fetch(`/api/messages?${queryString}`)

  if (!res.ok) {
    throw new Error("Failed to fetch messages")
  }

  return res.json()
}

export function useRealtimeMessages(params: MessageParams) {
  const adapter = db as any
  const queryClient = useQueryClient()
  const chatId = params.chatId
  const groupId = params.groupId
  const identifier = chatId ? `chat:${chatId}` : groupId ? `group:${groupId}` : null

  const { data, isLoading } = useQuery({
    queryKey: ["messages", identifier],
    enabled: !!identifier,
    queryFn: () => fetchMessages({ chatId, groupId }),
    initialData: [] as MessageWithDetails[],
    staleTime: 0, // Always consider stale - real-time subscription handles updates
    gcTime: 1000 * 60 * 2, // Keep in cache for 2 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData ?? [],
  })

  useEffect(() => {
    if (!identifier) return
    if (typeof adapter.subscribeToMessages !== "function") return

    const target = chatId ? { chatId } : { groupId }

    const unsubscribe = adapter.subscribeToMessages(target, (newMessages: MessageWithDetails[]) => {
      queryClient.setQueryData(["messages", identifier], newMessages)
    })

    return () => {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe()
      }
    }
  }, [adapter, chatId, groupId, identifier, queryClient])

  return {
    messages: data ?? [],
    isLoading,
  }
}
