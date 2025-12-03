"use client"

import { Pencil, Plus } from "lucide-react";
import ChatsList from "./chat-list-container";
import SidebarHeader from "./sidebar-header";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import AddNew from "./add-new";
import { useEffect, useMemo } from "react"
import { useChat } from "@/lib/context/chat-context"
// Removed duplicate import of useMemo
import { useRealtimeChats } from "@/hooks/use-realtime-chats"

export default function Sidebar() {
    const { chats, setChats, currentUserId } = useChat()
    
    // Use real-time subscription (Firebase) or polling (Prisma)
    const { chats: realtimeChats, isLoading } = useRealtimeChats(currentUserId ?? null)

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

    return (
        <Card className="relative rounded-none bg-transparent border-none w-[420px] max-w-[420px] w-full p-[8px] gap-0">
            <CardHeader className="px-0">
                <SidebarHeader />
            </CardHeader>
            <CardContent className="px-0 max-h-[calc(100vh-85px)] overflow-y-auto pb-24">
                <ChatsList chats={chats.map(chat => ({
                  id: chat.id,
                  name: chat.name,
                  message: chat.message,
                  imageUrl: chat.avatar,
                  unreadCount: chat.unreadCount || 0,
                }))} />
            </CardContent>
            <CardFooter className="px-0 absolute bottom-4 right-4 mb-4 mr-4 pointer-events-none">
                <div className="pointer-events-auto">
                  <AddNew />
                </div>
            </CardFooter>
        </Card>
    )
}