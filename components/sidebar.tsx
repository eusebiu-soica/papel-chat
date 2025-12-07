"use client"

import { useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card"
import SidebarHeader from "./sidebar-header"
import ChatsList from "./chat-list-container"
import AddNew from "./add-new"
import { useChat } from "@/lib/context/chat-context"
import { useRealtimeChats } from "@/hooks/use-realtime-chats"

export default function Sidebar() {
    const { setChats, currentUserId } = useChat()
    
    // Folosim hook-ul optimizat care se conectează direct la Firebase
    const { chats: realtimeChats, isLoading } = useRealtimeChats(currentUserId || "")

    // Sincronizăm datele rapide în contextul global
    useEffect(() => {
      if (realtimeChats) {
        // Mapăm datele la formatul simplu așteptat de UI
        const mappedChats = realtimeChats.map(chat => {
          // Determinăm cine este celălalt user
          const otherUser = chat.userId1 === currentUserId ? chat.user2 : chat.user1
          
          // Luăm ultimul mesaj
          const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[0] : null
          
          // Determine message preview text
          let messagePreview = "No messages"
          if (lastMsg) {
            if (lastMsg.imageUrl) {
              messagePreview = "📷 Image"
            } else if (lastMsg.content) {
              messagePreview = lastMsg.content
            }
          }
          
          return {
            id: chat.id,
            name: otherUser?.name || "Chat",
            message: messagePreview,
            avatar: otherUser?.avatar,
            userId: otherUser?.id || "",
            lastMessageTime: lastMsg?.createdAt || chat.updatedAt
          }
        })
        
        setChats(mappedChats)
      }
    }, [realtimeChats, currentUserId, setChats])

    return (
        <Card className="relative rounded-none bg-transparent border-none w-full md:w-[420px] md:max-w-[420px] p-2 md:p-[8px] gap-0 h-full flex flex-col">
            <CardHeader className="px-0 flex-shrink-0">
                <SidebarHeader />
            </CardHeader>
            <CardContent className="px-0 flex-1 min-h-0 overflow-y-auto pb-20 md:pb-24">
                {isLoading && realtimeChats.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Loading chats...</div>
                ) : (
                  <ChatsList chats={realtimeChats.map(chat => {
                    const otherUser = chat.userId1 === currentUserId ? chat.user2 : chat.user1
                    const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[0] : null
                    
                    // Determine message preview text
                    let messagePreview = "No messages"
                    if (lastMsg) {
                      if (lastMsg.imageUrl) {
                        messagePreview = "📷 Image"
                      } else if (lastMsg.content) {
                        messagePreview = lastMsg.content
                      }
                    }
                    
                    return {
                      id: chat.id,
                      name: otherUser?.name || "Chat",
                      message: messagePreview,
                      imageUrl: otherUser?.avatar,
                      unreadCount: 0 // Poți implementa asta ulterior
                    }
                  })} />
                )}
            </CardContent>
            <CardFooter className="px-0 flex-shrink-0 fixed md:absolute bottom-4 right-4 md:right-4 left-4 md:left-auto mb-4 md:mb-4 pointer-events-none z-50 safe-area-bottom">
                <div className="pointer-events-auto ml-auto md:ml-0">
                  <AddNew />
                </div>
            </CardFooter>
        </Card>
    )
}