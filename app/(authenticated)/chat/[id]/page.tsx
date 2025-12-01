"use client"

import ChatRoomClient from "@/components/chat-room-client"
import { useChat } from "@/lib/context/chat-context"
import { useEffect, useState, useCallback, use, useMemo } from "react"
import type { Message } from "@/components/chat-messages"

// Cache for chat data to reduce loading time
const chatCache = new Map<string, { name: string; avatar?: string; timestamp: number }>()
const messagesCache = new Map<string, { messages: Message[]; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUserId } = useChat()
  const [chat, setChat] = useState<{ name: string; avatar?: string } | null>(() => {
    const cached = chatCache.get(id)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return { name: cached.name, avatar: cached.avatar }
    }
    return null
  })
  const [messages, setMessages] = useState<Message[]>(() => {
    const cached = messagesCache.get(id)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.messages
    }
    return []
  })
  const [loading, setLoading] = useState(!chat || messages.length === 0)

  const fetchChatData = useCallback(async () => {
    if (!currentUserId) return
    
    // Check cache first
    const cached = chatCache.get(id)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setChat({ name: cached.name, avatar: cached.avatar })
      return
    }

    try {
      const res = await fetch(`/api/chats?userId=${currentUserId}`, {
        next: { revalidate: 10 } // Cache for 10 seconds
      })
      if (!res.ok) return
      const chats = await res.json()
      const foundChat = chats.find((c: any) => c.id === id)
      if (foundChat) {
        const chatData = {
          name: foundChat.name || "Chat",
          avatar: foundChat.avatar || undefined,
        }
        setChat(chatData)
        // Update cache
        chatCache.set(id, { ...chatData, timestamp: Date.now() })
      }
    } catch (err) {
      console.error('Failed to fetch chat data', err)
    }
  }, [id, currentUserId])

  const fetchMessages = useCallback(async () => {
    // Check cache first
    const cached = messagesCache.get(id)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setMessages(cached.messages)
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/messages?chatId=${id}`, {
        next: { revalidate: 5 } // Cache for 5 seconds
      })
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data = await res.json()
      const formattedMessages: Message[] = data.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        timestamp: new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        sender: {
          id: msg.sender.id,
          name: msg.sender.name,
          avatar: msg.sender.avatar || undefined,
        },
      }))
      setMessages(formattedMessages)
      // Update cache
      messagesCache.set(id, { messages: formattedMessages, timestamp: Date.now() })
    } catch (err) {
      console.error('Failed to fetch messages', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  // Initial load - only fetch if not in cache
  useEffect(() => {
    if (currentUserId) {
      if (!chat) {
        fetchChatData()
      }
      if (messages.length === 0) {
        fetchMessages()
      } else {
        setLoading(false)
      }
    }
  }, [currentUserId]) // Only run once when currentUserId is available

  // Poll for new messages (less frequently)
  useEffect(() => {
    if (!currentUserId || !id) return
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchMessages()
      }
    }, 5000) // Poll every 5 seconds instead of 3

    return () => clearInterval(interval)
  }, [currentUserId, id, fetchMessages])

  // Listen for message refresh events
  useEffect(() => {
    const handleRefresh = () => {
      // Clear cache and refetch
      chatCache.delete(id)
      messagesCache.delete(id)
      fetchMessages()
      fetchChatData()
    }
    window.addEventListener('messages:refresh', handleRefresh)
    return () => window.removeEventListener('messages:refresh', handleRefresh)
  }, [id, fetchMessages, fetchChatData])

  if (loading && !currentUserId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!chat && currentUserId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Chat not found</p>
      </div>
    )
  }

  if (!currentUserId) {
    return null
  }

  return (
    <ChatRoomClient
      id={id}
      title={chat?.name || "Chat"}
      imageUrl={chat?.avatar}
      messages={messages}
      currentUserId={currentUserId}
    />
  )
}

