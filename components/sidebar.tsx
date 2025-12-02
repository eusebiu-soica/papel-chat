"use client"

import { Pencil, Plus } from "lucide-react";
import ChatsList from "./chat-list-container";
import SidebarHeader from "./sidebar-header";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import AddNew from "./add-new";
import { useEffect } from "react"
import { useChat } from "@/lib/context/chat-context"

export default function Sidebar() {
    const { chats, setChats, currentUserId } = useChat()

    const fetchChats = async () => {
      try {
        if (!currentUserId) return
        const res = await fetch(`/api/chats?userId=${currentUserId}`)
        if (!res.ok) return
        const data = await res.json()
        // Parse dates from API response
        const parsedChats = data.map((chat: any) => ({
          ...chat,
          lastMessageTime: new Date(chat.lastMessageTime),
        }))
        setChats(parsedChats)
      } catch (err) {
        console.error('Failed to fetch chats', err)
      }
    }

    useEffect(() => {
      let mounted = true
      let intervalId: ReturnType<typeof setInterval> | null = null

      const startPolling = () => {
        if (intervalId) return
        intervalId = setInterval(() => {
          if (!document.hidden) fetchChats()
        }, 5000)
      }

      const stopPolling = () => {
        if (intervalId) {
          clearInterval(intervalId as any)
          intervalId = null
        }
      }

      if (mounted) fetchChats()
      startPolling()

      const onRefresh = () => {
        fetchChats()
      }

      const onVisibility = () => {
        if (document.hidden) {
          stopPolling()
        } else {
          fetchChats()
          startPolling()
        }
      }

      window.addEventListener('chats:refresh', onRefresh)
      document.addEventListener('visibilitychange', onVisibility)

      return () => {
        mounted = false
        window.removeEventListener('chats:refresh', onRefresh)
        document.removeEventListener('visibilitychange', onVisibility)
        stopPolling()
      }
    }, [currentUserId, setChats])

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