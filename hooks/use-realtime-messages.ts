"use client"

import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"
import type { MessageWithDetails } from "@/lib/db/adapter"
import { auth } from "@/lib/firebase/config" // Importăm auth

const adapter = new FirestoreAdapter()

type MessageParams = { chatId?: string; groupId?: string }

export function useRealtimeMessages(params: MessageParams) {
  const queryClient = useQueryClient()
  const chatId = params.chatId
  const groupId = params.groupId
  const identifier = chatId ? `chat:${chatId}` : groupId ? `group:${groupId}` : null

  // 1. State pentru a ști când Firebase Auth este gata
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)

  // 2. Ascultăm starea de autentificare (cu verificare de null)
  useEffect(() => {
    // Verificăm dacă auth există înainte de a-l folosi
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
    queryKey: ["messages", identifier],
    // 3. Activăm query-ul doar dacă identifier există ȘI Firebase e gata
    enabled: !!identifier && isFirebaseReady,
    queryFn: async () => {
      return [] as MessageWithDetails[]
    },
    initialData: [] as MessageWithDetails[],
    staleTime: Infinity,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  useEffect(() => {
    // 4. Pornim subscripția doar când totul e gata
    if (!identifier || !isFirebaseReady) return

    const unsubscribe = adapter.subscribeToMessages({ chatId, groupId }, (newMessages) => {
      queryClient.setQueryData(["messages", identifier], newMessages)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [chatId, groupId, identifier, queryClient, isFirebaseReady])

  return {
    messages: data ?? [],
    // Considerăm loading și dacă așteptăm după Firebase
    isLoading: isLoading || !isFirebaseReady,
  }
}