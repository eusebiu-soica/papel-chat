"use client"

import ChatRoomClient from "@/components/chat-room-client"
import { useChat } from "@/lib/context/chat-context"
import { useEffect, useState, useCallback, use } from "react"
import type { Message } from "@/components/chat-messages"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUserId } = useChat()
  const [chat, setChat] = useState<{ name: string; avatar?: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  // 1. Fetch doar pentru chat-ul curent (Rapid)
  const fetchChatData = useCallback(async () => {
    if (!currentUserId) return
    try {
      // Cerem un singur chat după ID
      const res = await fetch(`/api/chats?id=${id}&userId=${currentUserId}`, {
        cache: 'no-store'
      })
      if (!res.ok) return
      const chats = await res.json()
      
      // API-ul returnează un array, luăm primul element
      if (chats && chats.length > 0) {
        setChat({
          name: chats[0].name || "Chat",
          avatar: chats[0].avatar || undefined,
        })
      }
    } catch (err) {
      console.error('Failed to fetch chat data', err)
    }
  }, [id, currentUserId])

  // 2. Fetch mesaje cu NO-STORE cache
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?chatId=${id}`, {
        cache: 'no-store' // CRITIC: Forțează date proaspete de fiecare dată
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
    } catch (err) {
      console.error('Failed to fetch messages', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  // Funcție pentru actualizare instantă (Optimistic UI)
  const addOptimisticMessage = (newMsg: Message) => {
    setMessages((prev) => [...prev, newMsg])
  }

  // Inițializare
  useEffect(() => {
    if (currentUserId) {
      fetchChatData()
      fetchMessages()
    }
  }, [currentUserId, fetchChatData, fetchMessages])

  // Polling rapid (3s) pentru timp real
  useEffect(() => {
    if (!currentUserId || !id) return
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchMessages()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [currentUserId, id, fetchMessages])

  if (loading && !currentUserId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!currentUserId) return null

  return (
    <ChatRoomClient
      id={id}
      title={chat?.name || "Chat"}
      imageUrl={chat?.avatar}
      messages={messages}
      currentUserId={currentUserId}
      onOptimisticUpdate={addOptimisticMessage} // Trimitem funcția în jos
    />
  )
}