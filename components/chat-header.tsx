"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import ChatAvatar from "./chat-avatar"
import UserInfoModal from "./user-info-modal"
import { Search, MoreVertical, BrushCleaning, Ban } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Button } from "./ui/button"

interface ChatHeaderProps {
  title: string
  imageUrl?: string
}

export default function ChatHeader({ title, imageUrl }: ChatHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className={cn(
        "flex items-center justify-between gap-4",
        "bg-background border-b border-border",
        "px-4 py-2.5 h-14"
      )}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity cursor-pointer min-w-0"
        >
          <ChatAvatar name={title} imageUrl={imageUrl} />
          <div className="text-left min-w-0 flex-1">
            <div className="text-base font-medium text-foreground truncate">{title}</div>
            <div className="text-xs text-muted-foreground">Click for more info</div>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
            title="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-[300px] w-[210px]">
              <DropdownMenuItem className="p-2 gap-4 font-medium data-[highlighted]:bg-muted/50 cursor-pointer">
                <BrushCleaning className="text-foreground" />
                <span>Clear Messages</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-2 gap-4 font-medium text-destructive data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10 cursor-pointer">
                <Ban className="text-destructive" />
                <span>Block User</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <UserInfoModal name={title} avatar={imageUrl} isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  )
}
