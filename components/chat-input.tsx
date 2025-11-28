"use client"

import { SendHorizontal, Smile, Paperclip, ImagePlus } from "lucide-react"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { useRef, useState, KeyboardEvent } from "react"
import { Textarea } from "./ui/textarea"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  className?: string
  placeholder?: string
}

export function ChatInput({ onSendMessage, className, placeholder = "Type a message..." }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (message.trim()) {
      onSendMessage(message)
      setMessage("")
      if (textareaRef.current) textareaRef.current.style.height = "auto"
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
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  return (
    <div className={cn("mx-auto flex w-full max-w-[820px] flex-col gap-3 bg-transparent p-4 sticky bottom-0", className)}>
      <div className="flex w-full items-end gap-3 rounded-2xl bg-zinc-900/60 px-3 py-3 shadow-inner">
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            onClick={() => console.log("Image selected")}
            title="Add image"
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            onClick={() => console.log("Attachment selected")}
            title="Add attachment"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            onClick={() => console.log("Emoji selected")}
            title="Add emoji"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        {/* Text Input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className="min-h-[44px] max-h-[160px] resize-none bg-transparent placeholder:text-zinc-400"
          rows={1}
        />

        {/* Send Button */}
        <Button
          onClick={handleSubmit}
          disabled={!message.trim()}
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-0 text-white hover:opacity-95 disabled:opacity-50 transition-opacity"
        >
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
