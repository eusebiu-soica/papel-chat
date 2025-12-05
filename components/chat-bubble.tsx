"use client"

import { cn } from "@/lib/utils"
import { Trash2, Reply, Smile, Send } from "lucide-react"
import { Message } from "./chat-messages"
import { Button } from "./ui/button"
import React, { useState, useRef, useEffect, memo, useMemo } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "./ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"

interface ChatBubbleProps {
  message: Message
  isOwn?: boolean
  isGroupChat?: boolean // New prop to determine if it's a group/room chat
  currentUserId?: string // To check which reactions are selected
  chatId?: string | null // Chat ID for decryption
  groupId?: string | null // Group ID for decryption
  onReply?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

function ChatBubbleComponent({ 
  message, 
  isOwn = false,
  isGroupChat = false,
  currentUserId,
  chatId = null,
  groupId = null,
  onReply,
  onReact,
  onDelete
}: ChatBubbleProps) {
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastClickRef = useRef<{ time: number; id: string } | null>(null)
  const isSwipingRef = useRef(false)

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return timestamp
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } catch {
      return timestamp
    }
  }

  // Group reactions by emoji
  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = []
    }
    acc[reaction.emoji].push(reaction.userId)
    return acc
  }, {} as Record<string, string[]>) || {}

  const hasReactions = Object.keys(groupedReactions).length > 0

  // Check if current user has reacted with each emoji
  const isReactionSelected = (emoji: string) => {
    if (!currentUserId) return false
    return message.reactions?.some(r => r.emoji === emoji && r.userId === currentUserId) || false
  }

  // Mobile: Double tap/click handler and swipe handler
  useEffect(() => {
    if (!isMobile || !bubbleRef.current) return

    const bubble = bubbleRef.current

    const handleDoubleClick = (e: MouseEvent) => {
      // Check if clicking on interactive elements (buttons, reactions)
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('[role="button"]')) {
        return // Don't open sheet if clicking on buttons
      }

      setSheetOpen(true)
    }

    const handleTouchStart = (e: TouchEvent) => {
      // Don't handle swipe if touching interactive elements
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('[role="button"]')) {
        return
      }

      const touch = e.touches[0]
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }
      isSwipingRef.current = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

      // Only consider it a swipe if horizontal movement is significantly more than vertical
      // and we've moved enough to be intentional
      if (deltaX > 30 && deltaX > deltaY * 2) {
        isSwipingRef.current = true
        // Swipe right to reply
        setSwipeOffset(Math.min(deltaX, 100))
      } else if (deltaY > 30 || (deltaX < 30 && deltaY > 10)) {
        // Vertical scroll detected or small movement, cancel swipe
        touchStartRef.current = null
        setSwipeOffset(0)
        isSwipingRef.current = false
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // Check for double tap first (if no swipe happened)
      if (!isSwipingRef.current && touchStartRef.current) {
        const target = e.target as HTMLElement
        if (!target.closest('button') && !target.closest('[role="button"]')) {
          const now = Date.now()
          if (lastClickRef.current && 
              lastClickRef.current.id === message.id &&
              now - lastClickRef.current.time < 400 &&
              Math.abs(touchStartRef.current.x - (e.changedTouches[0]?.clientX || 0)) < 10 &&
              Math.abs(touchStartRef.current.y - (e.changedTouches[0]?.clientY || 0)) < 10) {
            // Double tap detected (same position, within 400ms)
            setSheetOpen(true)
            lastClickRef.current = null
            touchStartRef.current = null
            return
          } else {
            lastClickRef.current = { time: now, id: message.id }
          }
        }
      }

      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

      // Swipe right completed (reply) - only if it was clearly a swipe
      if (isSwipingRef.current && deltaX > 60 && deltaX > deltaY * 2) {
        onReply?.(message.id)
      }

      // Reset swipe offset
      setTimeout(() => {
        setSwipeOffset(0)
        isSwipingRef.current = false
      }, 200)

      touchStartRef.current = null
    }

    bubble.addEventListener('dblclick', handleDoubleClick)
    bubble.addEventListener('touchstart', handleTouchStart, { passive: true })
    bubble.addEventListener('touchmove', handleTouchMove, { passive: true })
    bubble.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      bubble.removeEventListener('dblclick', handleDoubleClick)
      bubble.removeEventListener('touchstart', handleTouchStart)
      bubble.removeEventListener('touchmove', handleTouchMove)
      bubble.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, isOwn, message.id, onReply])

  // Don't render deleted messages at all (anonymous)
  if (message.deletedForEveryone) {
    return null
  }

  return (
    <>
      <div 
        className={cn(
          "flex items-end gap-2 px-1 relative",
          isOwn ? "justify-end" : "justify-start",
          hasReactions ? "pb-6" : "py-0.5" // Add padding when reactions exist
        )}
      >
        <div className={cn("flex flex-col max-w-[90%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] relative group", isOwn ? "items-end" : "items-start")}>
          {/* Swipe indicator for mobile */}
          {isMobile && swipeOffset > 0 && (
            <div 
              className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-primary/20 rounded-l-2xl transition-all duration-200"
              style={{ width: `${swipeOffset}px` }}
            >
              <Reply className="h-5 w-5 text-primary" />
            </div>
          )}

          <div
            ref={bubbleRef}
            className={cn(
              "relative rounded-2xl px-3 py-1.5 text-sm w-full leading-relaxed shadow-sm transition-all",
              "hover:shadow-md",
              isOwn
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm",
              isMobile && swipeOffset > 0 && "translate-x-2"
            )}
            style={isMobile && swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)` } : undefined}
          >
            {/* Hover menu - Top of bubble, Discord style - Only shows on bubble hover (desktop) */}
            <div 
              className={cn(
                "absolute flex items-center gap-1 z-10",
                "bg-background/95 backdrop-blur-sm border border-border rounded-md px-1.5 py-1 shadow-lg",
                "touch-manipulation transition-opacity duration-150",
                "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
                "hidden md:flex", // Hide on mobile
                isOwn ? "-top-10 right-0" : "-top-10 left-0"
              )}
            >
                {/* All reaction emojis */}
                <div className="flex items-center gap-1">
                  {EMOJI_OPTIONS.map((emoji) => {
                    const isSelected = isReactionSelected(emoji)
                    const reactionCount = groupedReactions[emoji]?.length || 0
                    
                    return (
                      <button
                        key={emoji}
                        className={cn(
                          "text-lg hover:scale-110 transition-all cursor-pointer rounded p-0.5",
                          isSelected 
                            ? "bg-primary/20 scale-110" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          onReact?.(message.id, emoji)
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation()
                        }}
                        title={reactionCount > 0 ? `${emoji} (${reactionCount})` : emoji}
                      >
                        {emoji}
                      </button>
                    )
                  })}
                </div>
                
                <div className="h-4 w-px bg-border mx-1" /> {/* Separator */}
                
                {/* Action buttons */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation()
                    onReply?.(message.id)
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                  }}
                  title="Reply"
                >
                  <Reply className="h-3.5 w-3.5" />
                </Button>
                {isOwn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete?.(message.id)
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                    }}
                    title="Delete for everyone"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

            {/* Sender name - only for group chats and not own messages */}
            {isGroupChat && !isOwn && (
              <div className="text-xs font-medium mb-0.5" style={{ color: '#00a8ff' }}>
                {message.sender.name}
              </div>
            )}

            {/* Reply preview */}
            {message.replyTo && (
              <div className={cn(
                "mb-1 pb-1.5 border-l-2 pl-2 text-xs",
                isOwn ? "border-primary-foreground/30 text-primary-foreground/80" : "border-muted-foreground/30 text-muted-foreground"
              )}>
                <div className="font-medium">{message.replyTo.senderName}</div>
                <div className="truncate">{message.replyTo.content}</div>
              </div>
            )}

            <div className="break-words whitespace-pre-wrap">
              {(() => {
                // Ensure content is decrypted before display
                const content = message.content || ''
                if (!content || typeof window === 'undefined') return content
                
                // If it starts with ENC:, it's encrypted - MUST decrypt
                if (content.startsWith('ENC:')) {
                  try {
                    const { decrypt } = require('@/lib/encryption')
                    // Use chatId/groupId from props - these should be correct
                    const decrypted = decrypt(content, chatId, groupId)
                    // Only use if decryption succeeded
                    if (decrypted && decrypted !== content && !decrypted.startsWith('ENC:')) {
                      return decrypted
                    }
                    // If decryption failed, log error with details
                    console.error('❌ Bubble decryption FAILED:', {
                      messageId: message.id,
                      chatId,
                      groupId,
                      contentPreview: content.substring(0, 50),
                      decryptedPreview: decrypted?.substring(0, 50)
                    })
                    // Still return decrypted even if it failed - better than showing ENC:
                    return decrypted || content
                  } catch (e) {
                    console.error('❌ Bubble decryption exception:', e, 'messageId:', message.id)
                    return content
                  }
                }
                return content
              })()}
            </div>

            {/* Timestamp - bottom right */}
            <div className={cn(
              "flex items-center justify-end gap-1 mt-0.5 text-[11px]",
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              <span>{formatTime(message.timestamp)}</span>
              {/* Show plane icon when sending */}
              {isOwn && message.status === 'sending' && (
                <Send className="h-3 w-3 opacity-60 animate-pulse" />
              )}
            </div>

            {/* Reactions - below bubble */}
            {hasReactions && (
              <div className="absolute -bottom-4 left-0 flex gap-0.5 flex-wrap">
                {Object.entries(groupedReactions).map(([emoji, userIds]) => (
                  <div
                    key={emoji}
                    className={cn(
                      "bg-background border border-border rounded-full px-1.5 py-0.5 text-xs",
                      "flex items-center gap-1 cursor-pointer hover:bg-muted transition-colors"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      onReact?.(message.id, emoji)
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <span>{emoji}</span>
                    {userIds.length > 1 && (
                      <span className="text-[10px] text-muted-foreground">{userIds.length}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Sheet/Drawer for long press */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="pb-safe">
          <DrawerHeader>
            <DrawerTitle>Message Options</DrawerTitle>
            <DrawerDescription>
              {isOwn ? "Your message" : `From ${message.sender.name}`}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 pb-4 space-y-2">
            {/* Quick reactions */}
            <div className="flex items-center gap-2 py-2">
              <span className="text-sm text-muted-foreground">React:</span>
              <div className="flex items-center gap-2 flex-1">
                {EMOJI_OPTIONS.map((emoji) => {
                  const isSelected = isReactionSelected(emoji)
                  return (
                    <button
                      key={emoji}
                      className={cn(
                        "text-2xl p-2 rounded-lg transition-all",
                        isSelected 
                          ? "bg-primary/20 scale-110" 
                          : "hover:bg-muted active:scale-95"
                      )}
                      onClick={() => {
                        onReact?.(message.id, emoji)
                        setSheetOpen(false)
                      }}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="h-px bg-border my-2" />

            {/* Actions */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                onReply?.(message.id)
                setSheetOpen(false)
              }}
            >
              <Reply className="h-5 w-5" />
              <span>Reply</span>
            </Button>

            {isOwn && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onDelete?.(message.id)
                  setSheetOpen(false)
                }}
              >
                <Trash2 className="h-5 w-5" />
                <span>Delete for everyone</span>
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export const ChatBubble = memo(ChatBubbleComponent)
