"use client"

import { Pencil, Plus, MessageCircle } from "lucide-react";
import ChatsList from "./chat-list-container";
import SidebarHeader from "./sidebar-header";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import AddNew from "./add-new";
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { useChat } from "@/lib/context/chat-context"
// Removed duplicate import of useMemo
import { useRealtimeChats } from "@/hooks/use-realtime-chats"

export default function Sidebar() {
    const { chats, setChats, currentUserId } = useChat()
    const [isMobile, setIsMobile] = useState(false)
    
    // Use real-time subscription (Firebase) or polling (Prisma)
    const { chats: realtimeChats, isLoading } = useRealtimeChats(currentUserId ?? null)

    // Detect mobile
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Note: Real-time subscription handles updates automatically
    // Compute formatted chat list from realtimeChats. useMemo avoids recomputation on unrelated renders.
    const formattedChats = useMemo(() => {
      if (!realtimeChats || realtimeChats.length === 0) return []

      return realtimeChats
        .map((chat) => {
          let otherUser
          if (!chat.userId2) {
            otherUser = { id: null, name: "Waiting for user...", avatar: null }
          } else {
            otherUser = chat.userId1 === currentUserId ? chat.user2 : chat.user1
          }

          // Determine last message (messages array may be ascending)
          const lastMsgIndex = (chat.messages && chat.messages.length) ? chat.messages.length - 1 : -1
          const lastMessage = chat.messages?.[lastMsgIndex]

          const lastMessageTime = lastMessage?.createdAt
            ? (lastMessage.createdAt instanceof Date ? lastMessage.createdAt : new Date(lastMessage.createdAt))
            : (chat.updatedAt instanceof Date ? chat.updatedAt : new Date(chat.updatedAt))

          const isUnread = lastMessage && lastMessage.senderId !== currentUserId

          // Decrypt message content for display where possible; keep robust fallback
          let displayMessage = lastMessage?.content || "No messages yet"
          if (lastMessage?.content && typeof window !== 'undefined') {
            try {
              // dynamic require/import to avoid SSR errors
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const enc = require('@/lib/encryption')
              const { decrypt, isEncrypted } = enc
              if (isEncrypted && isEncrypted(lastMessage.content)) {
                const decrypted = decrypt(lastMessage.content, chat.id, null)
                if (decrypted && decrypted !== lastMessage.content) displayMessage = decrypted
              }
            } catch (error) {
              displayMessage = lastMessage.content
            }
          }

          const backendUnread = (chat as any).unreadCount
          return {
            id: chat.id,
            userId: otherUser?.id || '',
            name: otherUser?.name || "Unknown",
              avatar: otherUser?.avatar || undefined,
            message: displayMessage,
            lastMessageTime,
            unreadCount: backendUnread ?? (isUnread ? 1 : 0),
            isUnread,
          }
        })
        .filter((chat) => {
          const daysSinceLastActivity = (Date.now() - chat.lastMessageTime.getTime()) / (1000 * 60 * 60 * 24)
          return chat.message !== "No messages yet" || daysSinceLastActivity < 7
        })
        .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime())
    }, [realtimeChats, currentUserId])

    useEffect(() => {
      if (isLoading) return
      try {
        // Only update context if different to avoid needless re-renders
        const prev = JSON.stringify(chats || [])
        const next = JSON.stringify(formattedChats || [])
        if (prev !== next) {
          setChats(formattedChats)
        }
      } catch (err) {
        // Fallback: setChats if stringify fails
        setChats(formattedChats)
      }
    }, [formattedChats, isLoading, setChats, chats])
    // No need for manual refresh listener - it was causing infinite loops

    // Show empty state if no chats on mobile
    const showEmptyState = isMobile && (!chats || chats.length === 0)

    return (
        <Card className="relative rounded-none bg-transparent border-none w-full md:w-[320px] lg:w-[380px] xl:w-[420px] max-w-full md:max-w-[420px] p-2 md:p-[8px] gap-0 h-full flex flex-col">
            <CardHeader className="px-0 flex-shrink-0">
                <SidebarHeader />
            </CardHeader>
            {showEmptyState ? (
              <CardContent className="px-4 flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
                <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-4 sm:p-6">
                  <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                </div>
                <div className="space-y-2 text-center">
                  <h2 className="text-lg sm:text-xl font-bold">No chats yet</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground px-4">Start a conversation by creating a new chat</p>
                </div>
                <div className="pt-2">
                  <AddNew />
                </div>
              </CardContent>
            ) : (
              <>
                <CardContent className="px-0 flex-1 min-h-0 overflow-y-auto pb-24 md:pb-24">
                  {chats && chats.length > 0 ? (
                    <ChatsList chats={chats.map(chat => ({
                      id: chat.id,
                      name: chat.name,
                      message: chat.message,
                      imageUrl: chat.avatar,
                      unreadCount: chat.unreadCount || 0,
                    }))} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
                      <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-4 sm:p-6">
                        <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                      </div>
                      <div className="space-y-2 text-center">
                        <h2 className="text-lg sm:text-xl font-bold">No chats yet</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">Start a conversation by creating a new chat</p>
                      </div>
                      <div className="pt-2">
                        <AddNew />
                      </div>
                    </div>
                  )}
                </CardContent>
                {/* Add button - bottom right on desktop, bottom center on mobile */}
                {chats && chats.length > 0 && (
                  <CardFooter className={cn(
                    "px-0 pointer-events-none flex-shrink-0 z-10",
                    isMobile 
                      ? "absolute bottom-4 left-0 right-0 w-full flex justify-end px-4" 
                      : "absolute bottom-2 md:bottom-4 right-2 md:right-4"
                  )}>
                    <div className="pointer-events-auto">
                      <AddNew />
                    </div>
                  </CardFooter>
                )}
              </>
            )}
        </Card>
    )
}