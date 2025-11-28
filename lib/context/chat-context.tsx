"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(false)

  return (
    <ChatContext.Provider
      value={{
        selectedChatId,
        setSelectedChatId,
        chats,
        setChats,
        loading,
        setLoading,
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
