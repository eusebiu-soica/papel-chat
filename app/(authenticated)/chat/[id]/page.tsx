"use client"

import ChatRoomClient from "@/components/chat-room-client"
import { useChat } from "@/lib/context/chat-context"
import { useEffect, useState, useCallback, use, useRef, useMemo } from "react"
import type { Message } from "@/components/chat-messages"
import { useRealtimeMessages } from "@/hooks/use-realtime-messages"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import ChatAvatar from "@/components/chat-avatar"
import UserInfoModal from "@/components/user-info-modal"
import { useQuery } from "@tanstack/react-query"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUserId } = useChat()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [chat, setChat] = useState<{ name: string; avatar?: string; isGroupChat?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const isInitialLoadRef = useRef(true)
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false)
  
  // Determine if it's a group chat or single chat
  const [isGroupChat, setIsGroupChat] = useState(false)
  
  // Use real-time subscription for messages (Firebase) or polling (Prisma)
  const { messages: realtimeMessages, isLoading: messagesLoading } = useRealtimeMessages(
    isGroupChat ? { groupId: id } : { chatId: id }
  )

  // Use React Query for chat data with caching
  const { data: chatData } = useQuery({
    queryKey: ["chat-details", id, currentUserId],
    enabled: !!currentUserId && !!id,
    queryFn: async () => {
      const res = await fetch(`/api/chats?id=${id}&userId=${currentUserId}`)
      if (!res.ok) return null
      const chats = await res.json()
      return chats && chats.length > 0 ? {
        name: chats[0].name || "Chat",
        avatar: chats[0].avatar || undefined,
      } : null
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes (chat name doesn't change often)
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData ?? null,
  })

  useEffect(() => {
    if (chatData) {
      setChat(chatData)
    }
  }, [chatData])

  // Format real-time messages for the component
  const formattedMessages: Message[] = useMemo(() => realtimeMessages.map((msg) => {
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
  }), [realtimeMessages])

  // Determine chat type - use the messages query result instead of separate call
  useEffect(() => {
    if (realtimeMessages.length > 0 || !messagesLoading) {
      // Check if messages have groupId or chatId to determine type
      const firstMsg = realtimeMessages[0]
      if (firstMsg) {
        setIsGroupChat(!!firstMsg.groupId)
        setLoading(false)
      } else if (!messagesLoading) {
        // No messages yet, try to determine from API
        const checkType = async () => {
          try {
            const res = await fetch(`/api/messages?chatId=${id}`)
            if (res.ok) {
              setIsGroupChat(false)
            } else {
              const groupRes = await fetch(`/api/messages?groupId=${id}`)
              setIsGroupChat(groupRes.ok)
            }
          } catch {
            setIsGroupChat(false)
          }
          setLoading(false)
        }
        checkType()
      }
    }
  }, [realtimeMessages, messagesLoading, id])

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
    <div className="flex flex-col h-full w-full">
      {/* Mobile back button bar */}
      {isMobile && (
        <>
          <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 border-b border-border bg-background flex-shrink-0 min-h-[56px]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation active:scale-95 flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
            <button
              type="button"
              onClick={() => setIsUserInfoOpen(true)}
              className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="flex-shrink-0">
                <ChatAvatar imageUrl={chat?.avatar} name={chat?.name || "Chat"} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm sm:text-base font-medium truncate">{chat?.name || "Chat"}</h2>
              </div>
            </button>
          </div>

          <UserInfoModal
            name={chat?.name || "Chat"}
            avatar={chat?.avatar}
            isOpen={isUserInfoOpen}
            onOpenChange={setIsUserInfoOpen}
          />
        </>
      )}
      
      <div className="flex-1 min-h-0 overflow-hidden h-full pt-[56px] md:pt-0">
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
      </div>
    </div>
  )
}
