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
        "flex items-center justify-between gap-2 sm:gap-4",
        "bg-background border-b border-border",
        "px-2 sm:px-4 py-2 sm:py-2.5 h-12 sm:h-14"
      )}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 sm:gap-3 flex-1 hover:opacity-80 transition-opacity cursor-pointer min-w-0 touch-manipulation active:opacity-70"
        >
          <ChatAvatar name={title} imageUrl={imageUrl} />
          <div className="text-left min-w-0 flex-1">
            <div className="text-sm sm:text-base font-medium text-foreground truncate">{title}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Click for more info</div>
          </div>
        </button>

        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full touch-manipulation active:scale-95"
            title="Search"
          >
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full touch-manipulation active:scale-95"
              >
                <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-[300px] w-[210px] sm:w-[210px]">
              <DropdownMenuItem className="p-2 gap-4 font-medium data-[highlighted]:bg-muted/50 cursor-pointer touch-manipulation">
                <BrushCleaning className="text-foreground" />
                <span>Clear Messages</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-2 gap-4 font-medium text-destructive data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10 cursor-pointer touch-manipulation">
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
