import { SendHorizontal } from "lucide-react"
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
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  return (
    <div className={cn("flex items-end gap-2 border-t bg-background p-4", className)}>
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={handleInput}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        className="min-h-[44px] max-h-[200px] resize-none"
        rows={1}
      />
      <Button
        onClick={handleSubmit}
        disabled={!message.trim()}
        size="icon"
        className="h-11 w-11 shrink-0"
      >
        <SendHorizontal className="h-5 w-5" />
      </Button>
    </div>
  )
}