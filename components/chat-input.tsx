"use client"

import { SendHorizontal, Smile, Paperclip, Mic } from "lucide-react"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { useRef, useState, KeyboardEvent } from "react"
import { Textarea } from "./ui/textarea"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  className?: string
  placeholder?: string
  replyingTo?: { id: string; content: string; senderName: string } | null
  onCancelReply?: () => void
}

export function ChatInput({ 
  onSendMessage, 
  className, 
  placeholder = "Type a message...",
  replyingTo,
  onCancelReply
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasText = message.trim().length > 0

  const handleSubmit = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  return (
    <div className={cn("flex w-full flex-col bg-background border-t border-border", className)}>
      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-primary mb-0.5">Replying to {replyingTo.senderName}</div>
            <div className="text-xs text-muted-foreground truncate">{replyingTo.content}</div>
          </div>
          <button
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex w-full items-end gap-2 px-3 py-2 relative">
        {/* Emoji button - overlapping left */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute left-4 z-10 h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full",
            "transition-all"
          )}
          onClick={() => console.log("Emoji picker")}
          title="Add emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>

        {/* Attachment button - overlapping left, next to emoji */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute left-14 z-10 h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full",
            "transition-all"
          )}
          onClick={() => console.log("Attachment")}
          title="Add attachment"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative pl-20 pr-16">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className={cn(
              "min-h-[44px] max-h-[120px] resize-none",
              "bg-muted text-foreground placeholder:text-muted-foreground",
              "border-none rounded-lg px-4 py-2.5",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
            )}
            rows={1}
          />
        </div>

        {/* Send/Voice button - overlapping right */}
        {hasText ? (
          <Button
            onClick={handleSubmit}
            size="icon"
            className={cn(
              "absolute right-3 z-10 h-10 w-10 shrink-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground p-0",
              "transition-all"
            )}
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-3 z-10 h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted",
              "transition-all"
            )}
            onClick={() => console.log("Voice message")}
            title="Voice message"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}
