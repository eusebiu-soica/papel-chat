"use client"

import ChatRoomClient from "@/components/chat-room-client"
import { useChat } from "@/lib/context/chat-context"
import { useEffect, useState, useCallback, use, useMemo } from "react"
import type { Message } from "@/components/chat-messages"
import { useRealtimeMessages } from "@/hooks/use-realtime-messages"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronLeft } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import ChatAvatar from "@/components/chat-avatar"
import UserInfoModal from "@/components/user-info-modal"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"

const adapter = new FirestoreAdapter()

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentUserId } = useChat()
  const router = useRouter()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
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

  // Helper to safely convert date to ISO string
  const safeToISOString = (date: any): string => {
    if (!date) return new Date().toISOString()
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
    }
    const parsed = new Date(date)
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
  }

  // Helper to ensure content is decrypted
  const ensureDecrypted = useCallback(async (content: string, chatId: string | null, groupId: string | null): Promise<string> => {
    if (!content || typeof content !== 'string') return content
    if (typeof window === 'undefined') return content
    
    try {
      const { decrypt, isEncrypted } = await import('@/lib/encryption')
      if (isEncrypted(content)) {
        const decrypted = decrypt(content, chatId, groupId)
        // Only use if decryption succeeded (different and not still encrypted)
        if (decrypted && decrypted !== content && !decrypted.startsWith('ENC:')) {
          return decrypted
        }
      }
    } catch (e) {
      console.error('Client-side decryption error:', e)
    }
    return content
  }, [])

  // Transformare mesaje pentru UI - merge optimistic + realtime
  const formattedMessages: Message[] = useMemo(() => {
    const identifier = isGroupChat ? `group:${id}` : `chat:${id}`
    const cachedMessages = queryClient.getQueryData<Message[]>(['messages', identifier, 'initial']) || []
    
    // Merge cached (optimistic) messages with realtime messages
    const messageMap = new Map<string, Message>()
    
    // FIRST: Add optimistic messages (sending/error) - these need to show instantly
    cachedMessages.forEach((msg) => {
      if (msg.status === 'sending' || msg.status === 'error') {
        messageMap.set(msg.id, msg)
      }
    })
    
    // THEN: Add all realtime messages (from subscription) - these should be decrypted but verify
    realtimeMessages.forEach((msg) => {
      const senderId = msg.sender?.id || msg.senderId || ''
      let content = msg.deletedForEveryone ? '' : msg.content
      
      // CRITICAL: Double-check decryption - use message's own chatId/groupId
      if (content && typeof window !== 'undefined' && content.startsWith('ENC:')) {
        try {
          const { decrypt } = require('@/lib/encryption')
          // Use the message's own chatId/groupId from the message data
          const msgChatId = msg.chatId || null
          const msgGroupId = msg.groupId || null
          const decrypted = decrypt(content, msgChatId, msgGroupId)
          if (decrypted && decrypted !== content && !decrypted.startsWith('ENC:')) {
            content = decrypted
          } else {
            console.error('❌ Page decryption FAILED:', {
              messageId: msg.id,
              msgChatId,
              msgGroupId,
              contentPreview: content.substring(0, 50),
              decryptedPreview: decrypted?.substring(0, 50)
            })
            // Still use decrypted even if check failed
            if (decrypted && !decrypted.startsWith('ENC:')) {
              content = decrypted
            }
          }
        } catch (e) {
          console.error('❌ Page decryption exception:', e, 'messageId:', msg.id)
        }
      }
      
      messageMap.set(msg.id, {
        id: msg.id,
        content,
        imageUrl: msg.imageUrl || null,
        timestamp: safeToISOString(msg.createdAt),
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
        status: 'sent' as const
      })
    })
    
    // Finally: Add any other cached messages that aren't in realtime (optimistic messages)
    cachedMessages.forEach((msg: any) => {
      if (!messageMap.has(msg.id) && (msg.status === 'sending' || msg.status === 'error')) {
        messageMap.set(msg.id, msg)
      }
    })
    
    return Array.from(messageMap.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()
      if (isNaN(timeA) || isNaN(timeB)) return 0
      return timeA - timeB
    })
  }, [realtimeMessages, id, isGroupChat, queryClient])

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
            <ChevronLeft className="h-8 w-8" />
          </Button>
            <button
              type="button"
              onClick={() => setIsUserInfoOpen(true)}
              className="flex items-center gap-3 sm:gap-3  min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="flex-shrink-0">
                <ChatAvatar imageUrl={chat?.avatar} name={chat?.name || "Chat"} />
              </div>
              <div className="flex-1 flex flex-col justify-start items-start min-w-0">
                <h2 className="text-base sm:text-base font-medium truncate">{chat?.name || "Chat"}</h2>
                {/* <h2 className="text-sm sm:text-xs font-regular text-muted-foreground truncate">Click for more info</h2> */}
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