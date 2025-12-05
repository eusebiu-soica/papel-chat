"use client"

import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"
import type { ChatWithDetails } from "@/lib/db/adapter"
import { auth } from "@/lib/firebase/config" // Importăm auth

const adapter = new FirestoreAdapter()

export function useRealtimeChats(userId: string | null) {
  const queryClient = useQueryClient()
  
  // 1. State pentru Firebase Auth Ready
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)

  // 2. Ascultăm Auth (cu verificare de null)
  useEffect(() => {
    // Verificăm dacă auth există
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

  const { data, isLoading } = useQuery({
    queryKey: ["chats", userId],
    // 3. Activăm query-ul doar dacă userId există ȘI Firebase e gata
    enabled: !!userId && isFirebaseReady,
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
    // 4. Pornim subscripția doar când totul e gata
    if (!userId || !isFirebaseReady) return

    const unsubscribe = adapter.subscribeToChats(userId, (newChats) => {
      queryClient.setQueryData(["chats", userId], newChats)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [userId, queryClient, isFirebaseReady])

  return {
    chats: data ?? [],
    isLoading: isLoading || !isFirebaseReady,
  }
}