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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [messages])

  return (
    <ScrollArea className={cn("flex-1 p-4", className)} ref={scrollRef}>
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            content={message.content}
            timestamp={message.timestamp}
            sender={message.sender}
            isOwn={message.sender.id === currentUserId}
          />
        ))}
      </div>
    </ScrollArea>
  )
}