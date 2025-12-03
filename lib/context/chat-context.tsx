"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { useUser } from "@clerk/nextjs"

interface Chat {
  id: string
  userId: string
  name: string
  avatar?: string
  message: string
  lastMessageTime: Date
  unreadCount?: number
  isUnread?: boolean
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
  const { user, isLoaded } = useUser()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && user) {
      // Ensure user exists in database and get the database user ID
      ;(async () => {
        try {
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.primaryEmailAddress?.emailAddress || '',
              name: user.fullName || user.firstName || 'User',
              avatar: user.imageUrl || undefined,
            }),
          })
          
          if (res.ok) {
            const dbUser = await res.json()
            // Use the database user ID, not Clerk ID
            setCurrentUserId(dbUser.id)
          } else {
            console.error('Failed to sync user with database')
          }
        } catch (err) {
          console.error('Failed to sync user with database', err)
        }
      })()
    }
  }, [isLoaded, user])

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
