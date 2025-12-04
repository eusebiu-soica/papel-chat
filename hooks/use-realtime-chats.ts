// Hook for real-time chat subscriptions
"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { db } from "@/lib/db/provider"
import type { ChatWithDetails } from "@/lib/db/adapter"

async function fetchChats(userId: string): Promise<ChatWithDetails[]> {
  const res = await fetch(`/api/chats?userId=${userId}`)
  if (!res.ok) {
    throw new Error("Failed to fetch chats")
  }

  const data = await res.json()
  return Array.isArray(data)
    ? data.map((chat: any) => ({
        id: chat.id,
        userId1: chat.userId || "",
        userId2: null,
        createdAt: chat.lastMessageTime ? new Date(chat.lastMessageTime) : new Date(),
        updatedAt: chat.lastMessageTime ? new Date(chat.lastMessageTime) : new Date(),
        user1: chat.userId
          ? {
              id: chat.userId,
              email: "",
              name: chat.name,
              avatar: chat.avatar || undefined,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          : undefined,
        user2: null,
        messages: chat.message
          ? [
              {
                id: `temp-${chat.id}`,
                content: chat.message,
                senderId: chat.userId || "",
                chatId: chat.id,
                groupId: null,
                replyToId: null,
                deletedForEveryone: false,
                deletedAt: null,
                createdAt: chat.lastMessageTime ? new Date(chat.lastMessageTime) : new Date(),
                updatedAt: chat.lastMessageTime ? new Date(chat.lastMessageTime) : new Date(),
              },
            ]
          : [],
      }))
    : []
}

export function useRealtimeChats(userId: string | null) {
  const adapter = db as any
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["chats", userId],
    enabled: !!userId,
    queryFn: () => fetchChats(userId as string),
    initialData: [] as ChatWithDetails[],
    staleTime: 0, // Always consider stale - real-time subscription handles updates
    gcTime: 1000 * 60 * 2, // Keep in cache for 2 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData ?? [],
  })

  useEffect(() => {
    if (!userId) return
    if (typeof adapter.subscribeToChats !== "function") return

    const unsubscribe = adapter.subscribeToChats(userId, (newChats: ChatWithDetails[]) => {
      queryClient.setQueryData(["chats", userId], newChats)
    })

    return () => {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe()
      }
    }
  }, [adapter, queryClient, userId])

  return {
    chats: data ?? [],
    isLoading,
  }
}

