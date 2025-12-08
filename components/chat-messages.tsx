"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { ChatBubble } from "./chat-bubble"
import { cn } from "@/lib/utils"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"

export interface Message {
  id: string
  content: string
  timestamp: string
  sender: {
    id: string
    name: string
    avatar?: string
  }
  imageUrl?: string | null
  replyTo?: {
    id: string
    content: string
    senderName: string
  }
  reactions?: Array<{
    emoji: string
    userId: string
  }>
  deletedForEveryone?: boolean
  status?: 'sending' | 'sent' | 'error'
}

interface ChatMessagesProps {
  messages: Message[]
  currentUserId: string
  className?: string
  isGroupChat?: boolean
  chatId?: string | null
  groupId?: string | null
  onReply?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
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

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

export function ChatMessages({ 
  messages, 
  currentUserId, 
  className,
  isGroupChat = false,
  chatId = null,
  groupId = null,
  onReply,
  onReact,
  onDelete,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesStartRef = useRef<HTMLDivElement | null>(null)
  const isUserScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wasAtBottomRef = useRef(true)
  const prevMessagesLengthRef = useRef(messages.length)
  const prevScrollHeightRef = useRef(0)
  const isLoadingMoreRef = useRef(false)

  // Check if user is near bottom (within 100px)
  const isNearBottom = useCallback(() => {
    const el = containerRef.current
    if (!el) return true
    const { scrollTop, scrollHeight, clientHeight } = el
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
    return distanceFromBottom < 100
  }, [])

  // Handle scroll events and pagination
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleScroll = () => {
      wasAtBottomRef.current = isNearBottom()
      
      // Check if scrolled to top and load more messages
      if (el.scrollTop < 100 && hasMore && onLoadMore && !isLoadingMoreRef.current) {
        isLoadingMoreRef.current = true
        const currentScrollHeight = el.scrollHeight
        prevScrollHeightRef.current = currentScrollHeight
        onLoadMore()
        // Reset flag after a delay
        setTimeout(() => {
          isLoadingMoreRef.current = false
        }, 1000)
      }
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // Mark as user scrolling
      isUserScrollingRef.current = true
      
      // Reset after 150ms of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false
      }, 150)
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      el.removeEventListener("scroll", handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [isNearBottom, hasMore, onLoadMore])
  
  // Maintain scroll position when loading more messages
  useEffect(() => {
    if (isLoadingMore && containerRef.current && prevScrollHeightRef.current > 0) {
      const el = containerRef.current
      const newScrollHeight = el.scrollHeight
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current
      el.scrollTop = el.scrollTop + scrollDiff
      prevScrollHeightRef.current = 0
    }
  }, [isLoadingMore, messages.length])

  // Auto-scroll to bottom only if:
  // 1. User was at bottom before new message
  // 2. User is not actively scrolling
  // 3. New messages were added (not just re-render)
  useEffect(() => {
    const visibleCount = messages.filter(msg => !msg.deletedForEveryone).length
    const messagesAdded = visibleCount > prevMessagesLengthRef.current
    prevMessagesLengthRef.current = visibleCount

    if (messagesAdded && wasAtBottomRef.current && !isUserScrollingRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 50)
    }
  }, [messages])

  // Initial scroll to bottom
  useEffect(() => {
    const visibleMessages = messages.filter(msg => !msg.deletedForEveryone)
    if (visibleMessages.length > 0 && containerRef.current) {
      const el = containerRef.current
      el.scrollTop = el.scrollHeight
    }
  }, []) // Only on mount

  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const visibleMessages = useMemo(() => messages.filter(msg => !msg.deletedForEveryone), [messages])

  const toDate = (ts: string) => {
    try {
      const d = new Date(ts)
      return isNaN(d.getTime()) ? new Date() : d
    } catch {
      return new Date()
    }
  }

  // Prepare messages with separators for virtualization
  const messagesWithSeparators = useMemo(() => {
    const result: Array<{ type: 'message' | 'separator'; data: any }> = []
    
    visibleMessages.forEach((message, idx) => {
      const msgDate = toDate(message.timestamp)
      const prev = visibleMessages[idx - 1]
      const prevDate = prev ? toDate(prev.timestamp) : null
      const showSeparator = !prevDate || msgDate.toDateString() !== prevDate.toDateString()

      if (showSeparator) {
        result.push({
          type: 'separator',
          data: { date: msgDate }
        })
      }
      
      result.push({
        type: 'message',
        data: message
      })
    })
    
    return result
  }, [visibleMessages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (wasAtBottomRef.current && !isUserScrollingRef.current && visibleMessages.length > prevMessagesLengthRef.current) {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messagesWithSeparators.length - 1,
          behavior: 'smooth',
          align: 'end'
        })
      }, 50)
    }
    prevMessagesLengthRef.current = visibleMessages.length
  }, [visibleMessages.length, messagesWithSeparators.length])

  // Initial scroll to bottom
  useEffect(() => {
    if (messagesWithSeparators.length > 0) {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messagesWithSeparators.length - 1,
          behavior: 'auto',
          align: 'end'
        })
      }, 100)
    }
  }, []) // Only on mount

  if (visibleMessages.length === 0) {
    return (
      <div className={cn("h-full w-full flex items-center justify-center px-4 py-6", className)}>
        <div className="text-muted-foreground text-sm">No messages yet. Start the conversation!</div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "h-full w-full relative",
        "bg-background",
        className
      )}
    >
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%', width: '100%' }}
        data={messagesWithSeparators}
        initialTopMostItemIndex={messagesWithSeparators.length - 1}
        followOutput="auto"
        increaseViewportBy={200}
        overscan={5}
        atBottomStateChange={(atBottom) => {
          wasAtBottomRef.current = atBottom
        }}
        onScroll={(e) => {
          const target = e.currentTarget
          const { scrollTop, scrollHeight, clientHeight } = target
          
          // Check if scrolled to top and load more messages
          if (scrollTop < 100 && hasMore && onLoadMore && !isLoadingMoreRef.current) {
            isLoadingMoreRef.current = true
            prevScrollHeightRef.current = scrollHeight
            onLoadMore()
            setTimeout(() => {
              isLoadingMoreRef.current = false
            }, 1000)
          }
          
          // Mark as user scrolling
          isUserScrollingRef.current = true
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
          }
          scrollTimeoutRef.current = setTimeout(() => {
            isUserScrollingRef.current = false
          }, 150)
        }}
        itemContent={(index, item) => {
          if (item.type === 'separator') {
            return (
              <div className="flex items-center justify-center my-3 px-2 sm:px-3 md:px-4">
                <div className="px-3 py-1 rounded-full text-xs bg-muted/80 text-muted-foreground backdrop-blur-sm">
                  {formatDateLabel(item.data.date)}
                </div>
              </div>
            )
          }
          
          const message = item.data
          return (
            <div className="px-2 sm:px-3 md:px-4 py-0.5">
              <ChatBubble
                message={message}
                isOwn={message.sender.id === currentUserId}
                isGroupChat={isGroupChat}
                currentUserId={currentUserId}
                chatId={chatId}
                groupId={groupId}
                onReply={onReply}
                onReact={onReact}
                onDelete={onDelete}
              />
            </div>
          )
        }}
        components={{
          Header: () => isLoadingMore ? (
            <div className="flex items-center justify-center py-2">
              <div className="text-xs text-muted-foreground">Loading older messages...</div>
            </div>
          ) : null,
          Footer: () => <div className="h-1" />
        }}
      />
    </div>
  )
}
