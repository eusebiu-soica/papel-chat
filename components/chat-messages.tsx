"use client"

import { useEffect, useRef } from "react"
import { ChatBubble } from "./chat-bubble"
import { cn } from "@/lib/utils"
import { ScrollArea } from "./ui/scroll-area"

export interface Message {
  id: string
  content: string
  timestamp: string
  sender: {
    id: string
    name: string
    avatar?: string
  }
}

interface ChatMessagesProps {
  messages: Message[]
  currentUserId: string
  className?: string
}

export function ChatMessages({ messages, currentUserId, className }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <ScrollArea className={cn("h-full w-full", className)}>
      <div className="px-6 py-6">
        <div className="flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  content={message.content}
                  timestamp={message.timestamp}
                  sender={message.sender}
                  isOwn={message.sender.id === currentUserId}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}