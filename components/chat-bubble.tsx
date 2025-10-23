import { cn } from "@/lib/utils"
import { Avatar } from "./ui/avatar"

interface ChatBubbleProps {
  content: string
  timestamp: string
  sender: {
    name: string
    avatar?: string
  }
  isOwn?: boolean
}

export function ChatBubble({ content, timestamp, sender, isOwn = false }: ChatBubbleProps) {
  return (
    <div className={cn("flex w-full gap-2 p-2", isOwn ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-8 w-8">
        <img
          src={sender.avatar || `https://avatar.vercel.sh/${sender.name}`}
          alt={sender.name}
          className="h-full w-full object-cover"
        />
      </Avatar>
      <div className={cn("flex max-w-[70%] flex-col gap-1", isOwn ? "items-end" : "items-start")}>
        <div className="text-sm text-muted-foreground">{sender.name}</div>
        <div
          className={cn(
            "rounded-lg px-4 py-2",
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {content}
        </div>
        <div className="text-xs text-muted-foreground">{timestamp}</div>
      </div>
    </div>
  )
}