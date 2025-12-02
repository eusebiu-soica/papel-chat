"use client"

import { useEffect, useRef, useState } from "react"
import { ChatBubble } from "./chat-bubble"
import { cn } from "@/lib/utils"

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

function formatDateLabel(date: Date) {
  const now = new Date()
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isSameDay) return "Today"

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()

  if (isYesterday) return "Yesterday"

  return date.toLocaleDateString()
}

export function ChatMessages({ messages, currentUserId, className }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const userScrolledUpRef = useRef(false)
  const [scrolledUp, setScrolledUp] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
      // consider near-bottom as within 50px
      const isScrolledUp = distanceFromBottom > 50
      userScrolledUpRef.current = isScrolledUp
      setScrolledUp(isScrolledUp)
    }

    el.addEventListener("scroll", onScroll, { passive: true })
    // initialize
    onScroll()

    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    // Auto-scroll only if user is at (or near) the bottom
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className={cn("h-full w-full flex items-center justify-center px-6 py-6", className)}>
        <div className="text-muted-foreground">No messages yet. Start the conversation!</div>
      </div>
    )
  }

  // Helper to parse timestamp to Date, with fallback to now
  const toDate = (ts: string) => {
    const d = new Date(ts)
    return isNaN(d.getTime()) ? new Date() : d
  }

  return (
    <div ref={containerRef} className={cn("h-full w-full relative overflow-y-auto px-6 py-6", className)}>
      <div className="flex flex-col gap-4">
        {messages.map((message, idx) => {
          const msgDate = toDate(message.timestamp)
          const prev = messages[idx - 1]
          const prevDate = prev ? toDate(prev.timestamp) : null
          const showSeparator = !prevDate || msgDate.toDateString() !== prevDate.toDateString()

          return (
            <div key={message.id}>
              {showSeparator && (
                <div className="flex items-center justify-center my-4">
                  <div className="px-3 py-1 rounded-full text-xs bg-slate-200/40 text-slate-800 border border-slate-200/30">
                    {formatDateLabel(msgDate)}
                  </div>
                </div>
              )}

              <ChatBubble
                content={message.content}
                timestamp={message.timestamp}
                sender={message.sender}
                isOwn={message.sender.id === currentUserId}
              />
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>
        {scrolledUp && (
          <button
            aria-label="Jump to latest"
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
              setScrolledUp(false)
            }}
            className="absolute right-6 bottom-6 z-10 bg-indigo-600 text-white px-3 py-2 rounded-full shadow-md text-sm"
          >
            Jump to latest
          </button>
        )}
    </div>
  )
}