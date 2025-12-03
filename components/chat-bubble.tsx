"use client"

import { cn } from "@/lib/utils"
import { useState, useRef } from "react"
import { Trash2, Reply } from "lucide-react"
import { Message } from "./chat-messages"
import { Button } from "./ui/button"

interface ChatBubbleProps {
  message: Message
  isOwn?: boolean
  isGroupChat?: boolean // New prop to determine if it's a group/room chat
  currentUserId?: string // To check which reactions are selected
  onReply?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

export function ChatBubble({ 
  message, 
  isOwn = false,
  isGroupChat = false,
  currentUserId,
  onReply,
  onReact,
  onDelete
}: ChatBubbleProps) {
  const [isHovered, setIsHovered] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)

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

  // Don't render deleted messages at all (anonymous)
  if (message.deletedForEveryone) {
    return null
  }

  return (
    <div 
      className={cn(
        "flex items-end gap-2 px-1 group relative",
        isOwn ? "justify-end" : "justify-start",
        hasReactions ? "pb-6" : "py-0.5" // Add padding when reactions exist
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn("flex flex-col max-w-[65%] sm:max-w-[70%] relative", isOwn ? "items-end" : "items-start")}>
        <div
          ref={bubbleRef}
          className={cn(
            "relative rounded-2xl px-3 py-1.5 text-sm leading-relaxed shadow-sm transition-all",
            "hover:shadow-md",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          {/* Hover menu - Top of bubble, Discord style */}
          {isHovered && (
            <div 
              className={cn(
                "absolute flex items-center gap-1 z-10",
                "bg-background/95 backdrop-blur-sm border border-border rounded-md px-1.5 py-1 shadow-lg",
                {"-top-10 right-0": isOwn, "-top-10 left-0": !isOwn}
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
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
                      onClick={() => onReact?.(message.id, emoji)}
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
                onClick={() => onReply?.(message.id)}
                title="Reply"
              >
                <Reply className="h-3.5 w-3.5" />
              </Button>
              {isOwn && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                  onClick={() => onDelete?.(message.id)}
                  title="Delete for everyone"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

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

          <div className="break-words whitespace-pre-wrap">{message.content}</div>

          {/* Timestamp - bottom right */}
          <div className={cn(
            "flex items-center justify-end gap-1 mt-0.5 text-[11px]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            <span>{formatTime(message.timestamp)}</span>
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
                  onClick={() => onReact?.(message.id, emoji)} // Toggle reaction
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
  )
}
