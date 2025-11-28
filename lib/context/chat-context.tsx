"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react"

interface Chat {
  id: string
  userId: string
  name: string
  avatar?: string
  message: string
  lastMessageTime: Date
}

interface ChatContextType {
  selectedChatId: string | null
  setSelectedChatId: (id: string | null) => void
  chats: Chat[]
  setChats: (chats: Chat[]) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  currentUserId?: string | null
  setCurrentUserId?: (id: string | null) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/users')
        if (!res.ok) return
        const users = await res.json()
        if (mounted && users && users.length > 0) {
          // Prefer the seeded "john@example.com" user, fallback to first
          const seeded = users.find((u: any) => u.email === 'john@example.com')
          setCurrentUserId(seeded?.id || users[0].id)
        }
      } catch (err) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <ChatContext.Provider
      value={{
        selectedChatId,
        setSelectedChatId,
        chats,
        setChats,
        loading,
        setLoading,
        currentUserId,
        setCurrentUserId,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
