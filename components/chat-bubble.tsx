import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

interface ChatBubbleProps {
  content: string
  timestamp: string
  sender: {
    id?: string
    name: string
    avatar?: string
  }
  isOwn?: boolean
}

export function ChatBubble({ content, timestamp, sender, isOwn = false }: ChatBubbleProps) {
  return (
    <div className={cn("flex w-full items-end gap-3 px-2", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && (
        <Avatar className="h-9 w-9">
          {sender.avatar ? (
            <AvatarImage src={sender.avatar} alt={sender.name} />
          ) : (
            <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
          )}
        </Avatar>
      )}

      <div className={cn("max-w-[78%]")}>{/* message column */}
        <div className={cn("mb-1 text-xs text-muted-foreground", isOwn ? "text-right" : "text-left")}>{!isOwn ? sender.name : ""}</div>

        <div
          className={cn(
            "relative inline-block rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm",
            isOwn
              ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
              : "bg-zinc-800 text-zinc-100"
          )}
        >
          {content}

          <div className={cn("mt-1 text-[11px] opacity-70", isOwn ? "text-right text-white/80" : "text-left text-muted-foreground")}>
            {timestamp}
          </div>
        </div>
      </div>

      {isOwn && (
        <Avatar className="h-9 w-9">
          {sender.avatar ? (
            <AvatarImage src={sender.avatar} alt={sender.name} />
          ) : (
            <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
          )}
        </Avatar>
      )}
    </div>
  )
}