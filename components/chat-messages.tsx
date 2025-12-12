"use client"

import { useLayoutEffect, useEffect, useRef, useState, useCallback, useMemo } from "react"
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
  fileData?: {
    dataUri: string
    fileName: string
    fileType: string
    fileSize: number
    width?: number
    height?: number
  } | null
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
  
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const prevMessagesLengthRef = useRef(messages.length)
  const prevScrollHeightRef = useRef(0)
  const isLoadingMoreRef = useRef(false)
  const wasAtBottomRef = useRef(true) 
  
  // Am eliminat scrollTimeoutRef și isUserScrollingRef pentru a simplifica Virtuoso
  // const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // const isUserScrollingRef = useRef(false) 

  const visibleMessages = useMemo(() => messages.filter(msg => !msg.deletedForEveryone), [messages])

  const toDate = (ts: string) => {
    try {
      const d = new Date(ts)
      return isNaN(d.getTime()) ? new Date() : d
    } catch {
      return new Date()
    }
  }

  // Pregătește mesajele cu separatori pentru virtualizare
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




  useEffect(() => {
    if (wasAtBottomRef.current) {
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messagesWithSeparators.length - 1,
          behavior: "auto",
          align: "end",
        });
      });
    }
  }, [messagesWithSeparators.length]);
  
  

  if (visibleMessages.length === 0) {
    return (
      <div className={cn("h-full w-full flex items-center justify-center px-4 py-6", className)}>
        <div className="text-muted-foreground text-sm">No messages yet. Start the conversation!</div>
      </div>
    )
  }

  return (
    <div 
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
        initialTopMostItemIndex={messagesWithSeparators.length > 0 ? messagesWithSeparators.length - 1 : 0}
        
        // Logică de auto-follow
        followOutput="auto"
        increaseViewportBy={200}
        overscan={5}
        
        // Starea 'la fund' (atBottom)
        atBottomStateChange={(atBottom) => {
        }}
        
        // Gestionarea scroll-ului și a paginării (load more)
        onScroll={(e) => {
          const el = e.currentTarget;
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        
          // toleranță 30px
          if (distanceFromBottom < 30) {
            wasAtBottomRef.current = true;
          } else {
            wasAtBottomRef.current = false;
          }
        
          if (el.scrollTop < 100 && hasMore && !isLoadingMoreRef.current) {
            isLoadingMoreRef.current = true;
            onLoadMore?.();
            setTimeout(() => (isLoadingMoreRef.current = false), 300);
          }
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
          Footer: () => null
        }}
      />
    </div>
  )
}