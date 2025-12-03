"use client"

import ChatRoomClient from "@/components/chat-room-client"
import { useChat } from "@/lib/context/chat-context"
import { useEffect, useState, useCallback, use, useRef } from "react"
import type { Message } from "@/components/chat-messages"
import { useRealtimeMessages } from "@/hooks/use-realtime-messages"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUserId } = useChat()
  const [chat, setChat] = useState<{ name: string; avatar?: string; isGroupChat?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const isInitialLoadRef = useRef(true)
  
  // Determine if it's a group chat or single chat
  const [isGroupChat, setIsGroupChat] = useState(false)
  
  // Use real-time subscription for messages (Firebase) or polling (Prisma)
  const { messages: realtimeMessages, isLoading: messagesLoading } = useRealtimeMessages(
    isGroupChat ? { groupId: id } : { chatId: id }
  )

  // Optimized: Fetch chat data with caching
  const fetchChatData = useCallback(async () => {
    if (!currentUserId) return
    try {
      const res = await fetch(`/api/chats?id=${id}&userId=${currentUserId}`, {
        next: { revalidate: 60 } // Cache for 60 seconds
      })
      if (!res.ok) return
      const chats = await res.json()
      
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

  // Format real-time messages for the component
  const formattedMessages: Message[] = realtimeMessages.map((msg) => {
    // Ensure sender ID matches currentUserId for comparison
    const senderId = msg.sender?.id || msg.senderId || ''
    
    return {
      id: msg.id,
      content: msg.deletedForEveryone ? '' : msg.content,
      timestamp: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : new Date(msg.createdAt).toISOString(),
      sender: {
        id: senderId, // Use the actual sender ID
        name: msg.sender?.name || 'Unknown',
        avatar: msg.sender?.avatar || undefined,
      },
      replyTo: msg.replyTo ? {
        id: msg.replyTo.id,
        content: msg.replyTo.content,
        senderName: msg.replyTo.sender?.name || 'Unknown'
      } : undefined,
      reactions: msg.reactions?.map((r) => ({
        emoji: r.emoji,
        userId: r.userId
      })) || [],
      deletedForEveryone: msg.deletedForEveryone || false,
    }
  })

  // Determine chat type on initial load
  useEffect(() => {
    if (currentUserId && isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      fetchChatData()
      
      // Try to determine if it's a group chat by checking messages endpoint
      const checkChatType = async () => {
        try {
          // Try as single chat first
          const res = await fetch(`/api/messages?chatId=${id}`)
          if (res.ok) {
            setIsGroupChat(false)
            setLoading(false)
          } else {
            // Try as group chat
            const groupRes = await fetch(`/api/messages?groupId=${id}`)
            if (groupRes.ok) {
              setIsGroupChat(true)
              setLoading(false)
            } else {
              setLoading(false)
            }
          }
        } catch (err) {
          console.error('Failed to check chat type', err)
          setLoading(false)
        }
      }
      
      checkChatType()
    }
  }, [currentUserId, id, fetchChatData])

  // Optimistic update handler (for when user sends a message)
  const addOptimisticMessage = useCallback((newMsg: Message) => {
    // Real-time hook will handle this automatically, but we keep this for compatibility
    window.dispatchEvent(new CustomEvent('messages:refresh'))
  }, [])

  // Update messages handler (for optimistic updates)
  const updateMessages = useCallback((updatedMessages: Message[]) => {
    // Real-time hook handles updates automatically
    // This is kept for compatibility with ChatRoomClient
  }, [])

  if ((loading || messagesLoading) && !currentUserId) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0b141a]">
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
      messages={formattedMessages}
      currentUserId={currentUserId}
      isGroupChat={isGroupChat}
      onOptimisticUpdate={addOptimisticMessage}
      onMessagesUpdate={updateMessages}
    />
  )
}
