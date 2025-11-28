"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import ChatAvatar from "./chat-avatar"
import UserInfoModal from "./user-info-modal"
import { Search, MoreHorizontal } from "lucide-react"

interface ChatHeaderProps {
  title: string
  imageUrl?: string
}

export default function ChatHeader({ title, imageUrl }: ChatHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className={cn("flex items-center justify-between gap-4 border-b border-muted/40 px-4 py-3 bg-gradient-to-b from-background/60 to-transparent backdrop-blur-sm")}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 flex-1 hover:opacity-70 transition-opacity cursor-pointer"
        >
          <ChatAvatar name={title} imageUrl={imageUrl} />
          <div className="text-left">
            <div className="text-base font-semibold">{title}</div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button className="rounded-full p-2 text-muted-foreground hover:bg-muted/60 transition-colors">
            <Search className="h-4 w-4" />
          </button>
          <button className="rounded-full p-2 text-muted-foreground hover:bg-muted/60 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <UserInfoModal name={title} avatar={imageUrl} isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  )
}