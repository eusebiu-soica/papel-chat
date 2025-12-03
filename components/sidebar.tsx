"use client"

import { Pencil, Plus } from "lucide-react";
import ChatsList from "./chat-list-container";
import SidebarHeader from "./sidebar-header";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import AddNew from "./add-new";
import { useEffect } from "react"
import { useChat } from "@/lib/context/chat-context"
import { useRealtimeChats } from "@/hooks/use-realtime-chats"

export default function Sidebar() {
    const { chats, setChats, currentUserId } = useChat()
    
    // Use real-time subscription (Firebase) or polling (Prisma)
    const { chats: realtimeChats, isLoading } = useRealtimeChats(currentUserId)

    // Update chats when real-time data changes
    useEffect(() => {
      if (!isLoading) {
        // Format chats for the sidebar with activity filtering
        const formattedChats = realtimeChats
          .map((chat) => {
            let otherUser
            if (!chat.userId2) {
              otherUser = { id: null, name: "Waiting for user...", avatar: null }
            } else {
              otherUser = chat.userId1 === currentUserId ? chat.user2 : chat.user1
            }
            
            // Handle Date conversion
            const lastMessageTime = chat.messages?.[0]?.createdAt 
              ? (chat.messages[0].createdAt instanceof Date 
                  ? chat.messages[0].createdAt 
                  : new Date(chat.messages[0].createdAt))
              : (chat.updatedAt instanceof Date 
                  ? chat.updatedAt 
                  : new Date(chat.updatedAt))
            
            // Check if last message is from other user (unread indicator)
            const lastMessage = chat.messages?.[0]
            const isUnread = lastMessage && lastMessage.senderId !== currentUserId
            
            // Decrypt message content for display
            let displayMessage = lastMessage?.content || "No messages yet"
            if (lastMessage?.content && typeof window !== 'undefined') {
              try {
                const { decrypt, isEncrypted } = require('@/lib/encryption')
                if (isEncrypted(lastMessage.content)) {
                  const decrypted = decrypt(lastMessage.content, chat.id, null)
                  if (decrypted && decrypted !== lastMessage.content) {
                    displayMessage = decrypted
                  }
                }
              } catch (error) {
                // Silently fail - show encrypted content if decryption fails
                displayMessage = lastMessage.content
              }
            }
            
            return {
              id: chat.id,
              userId: otherUser?.id || null,
              name: otherUser?.name || "Unknown",
              avatar: otherUser?.avatar || null,
              message: displayMessage,
              lastMessageTime,
              unreadCount: isUnread ? 1 : 0, // Simple unread indicator
              isUnread,
            }
          })
          // Filter: Only show chats with messages or created in last 7 days
          .filter((chat) => {
            const daysSinceLastActivity = (Date.now() - chat.lastMessageTime.getTime()) / (1000 * 60 * 60 * 24)
            return chat.message !== "No messages yet" || daysSinceLastActivity < 7
          })
          // Sort by last message time (most recent first)
          .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime())
        
        setChats(formattedChats)
      }
    }, [realtimeChats, isLoading, currentUserId, setChats])

    // Note: Real-time subscription handles updates automatically
    // No need for manual refresh listener - it was causing infinite loops

    return (
        <Card className="relative rounded-none bg-transparent border-none max-w-[420px] w-full p-[8px] gap-0">
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