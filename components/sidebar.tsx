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
          
          return {
            id: chat.id,
            name: otherUser?.name || "Chat",
            message: lastMsg?.content || "No messages",
            avatar: otherUser?.avatar,
            userId: otherUser?.id || "",
            lastMessageTime: lastMsg?.createdAt || chat.updatedAt
          }
        })
        
        setChats(mappedChats)
      }
    }, [realtimeChats, currentUserId, setChats])

    return (
        <Card className="relative rounded-none bg-transparent border-none w-[420px] max-w-[420px]  p-[8px] gap-0">
            <CardHeader className="px-0">
                <SidebarHeader />
            </CardHeader>
            <CardContent className="px-0 max-h-[calc(100vh-85px)] overflow-y-auto pb-24">
                {isLoading && realtimeChats.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Loading chats...</div>
                ) : (
                  <ChatsList chats={realtimeChats.map(chat => {
                    const otherUser = chat.userId1 === currentUserId ? chat.user2 : chat.user1
                    const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[0] : null
                    return {
                      id: chat.id,
                      name: otherUser?.name || "Chat",
                      message: lastMsg?.content || "No messages",
                      imageUrl: otherUser?.avatar,
                      unreadCount: 0 // Poți implementa asta ulterior
                    }
                  })} />
                )}
            </CardContent>
            <CardFooter className="px-0 absolute bottom-4 right-4 mb-4 mr-4 pointer-events-none">
                <div className="pointer-events-auto">
                  <AddNew />
                </div>
            </CardFooter>
        </Card>
    )
}