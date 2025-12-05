"use client"

import ChatRoomClient from "@/components/chat-room-client"
import { useChat } from "@/lib/context/chat-context"
import { useEffect, useState, useCallback, use, useMemo } from "react"
import type { Message } from "@/components/chat-messages"
import { useRealtimeMessages } from "@/hooks/use-realtime-messages"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import ChatAvatar from "@/components/chat-avatar"
import UserInfoModal from "@/components/user-info-modal"
import { useQuery } from "@tanstack/react-query"
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"

const adapter = new FirestoreAdapter()

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUserId } = useChat()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [chat, setChat] = useState<{ name: string; avatar?: string; isGroupChat?: boolean } | null>(null)
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false)
  
  const [isGroupChat, setIsGroupChat] = useState(false)
  
  // 1. Abonare la mesaje (Direct la Firebase)
  const { messages: realtimeMessages, isLoading: messagesLoading } = useRealtimeMessages(
    isGroupChat ? { groupId: id } : { chatId: id }
  )

  // 2. Fetch detalii Chat (Direct la Firebase)
  const { data: chatData } = useQuery({
    queryKey: ["chat-details", id, currentUserId],
    enabled: !!currentUserId && !!id,
    queryFn: async () => {
      // SCHIMBARE: Folosim adaptorul direct
      const chatDetails = await adapter.getChatById(id)
      if (!chatDetails) return null
      
      const otherUser = chatDetails.userId1 === currentUserId ? chatDetails.user2 : chatDetails.user1
      return {
        name: otherUser?.name || "Chat",
        avatar: otherUser?.avatar || undefined,
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (chatData) setChat(chatData)
  }, [chatData])

  // Transformare mesaje pentru UI
  const formattedMessages: Message[] = useMemo(() => realtimeMessages.map((msg) => {
    const senderId = msg.sender?.id || msg.senderId || ''
    return {
      id: msg.id,
      content: msg.deletedForEveryone ? '' : msg.content,
      timestamp: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : new Date(msg.createdAt).toISOString(),
      sender: {
        id: senderId,
        name: msg.sender?.name || 'Unknown',
        avatar: msg.sender?.avatar || undefined,
      },
      replyTo: msg.replyTo ? {
        id: msg.replyTo.id,
        content: msg.replyTo.content,
        senderName: msg.replyTo.sender?.name || msg.replyTo.senderId || 'Unknown'
      } : undefined,
      reactions: msg.reactions?.map((r) => ({
        emoji: r.emoji,
        userId: r.userId
      })) || [],
      deletedForEveryone: msg.deletedForEveryone || false,
    }
  }), [realtimeMessages])

  // Detectare tip chat (Simplificată)
  useEffect(() => {
    // Presupunem că e chat normal, dacă nu găsim altceva
    // Logica de grup poate fi extinsă verificând colecția 'groups' din adaptor
    // Dar pentru viteză, lăsăm default single chat momentan dacă nu sunt indicii
  }, [])

  const addOptimisticMessage = useCallback((newMsg: Message) => {
    // Handled by react-query cache update in ChatRoomClient
  }, [])

  if (messagesLoading && !currentUserId) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0b141a]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!currentUserId) return null

  return (
    <div className="flex flex-col h-full w-full">
      {isMobile && (
        <>
          <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 border-b border-border bg-background flex-shrink-0 min-h-[56px]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation active:scale-95 flex-shrink-0"
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
        />
      </div>
    </div>
  )
}