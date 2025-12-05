"use client"

import type React from "react"
import { useState } from "react" // Import useState
import { BellOff, CheckCheck, Pin, Trash, Loader2 } from "lucide-react" // Import Loader2
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Badge } from "./ui/badge"
import { usePathname, useRouter } from "next/navigation"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog" // Import Dialog components
import { Button } from "./ui/button" // Import Button
import { cn } from "@/lib/utils"
import { db } from "@/lib/db/provider"
import { useChat } from "@/lib/context/chat-context"

interface ChatItemProps {
  id: string
  name: string
  message: string
  unreadCount?: number
  imageUrl?: string
  isLast?: boolean
}

export default function ChatItem({ id, name, message, unreadCount, imageUrl, isLast }: ChatItemProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUserId } = useChat()
  const isActive = !!pathname && pathname.includes(`/chat/${id}`)

  // State pentru modalul de ștergere
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Funcția care execută ștergerea (mutată din meniu aici)
  const handleDeleteChat = async () => {
    try {
      setIsDeleting(true)
      
      if (!currentUserId) return

      // Verificăm accesul
      const chat = await db.getChatById(id)
      if (!chat) return

      // Verificăm permisiunile
      if (chat.userId1 !== currentUserId && chat.userId2 !== currentUserId) return

      // Ștergem
      await db.deleteChat(id)
      
      // Închidem modalul și redirecționăm
      setIsDeleteDialogOpen(false)
      router.push('/')
      
    } catch (error) {
      console.error('Error deleting chat:', error)
      // Aici poți adăuga un toast error dacă dorești: toast.error("Failed to delete")
    } finally {
      setIsDeleting(false)
    }
  }

  // Definim elementele meniului direct în componentă pentru a avea acces la state
  const contextMenuItems = [
    {
      icon: <Pin size={17} />,
      label: "Pin Chat",
      onClick: () => console.log("Pin chat clicked"),
    },
    {
      icon: <CheckCheck size={17} />,
      label: "Mark as Read",
      onClick: () => console.log("Mark as read clicked"),
      className: "",
    },
    {
      icon: <BellOff size={17} className="!text-foreground" />,
      label: "Mute for...",
      onClick: () => console.log("Mute clicked"),
      className: "",
    },
    {
      icon: <Trash size={17} className="!text-destructive"/>,
      label: "Delete Chat",
      // Aici doar deschidem modalul, nu ștergem direct
      onClick: () => setIsDeleteDialogOpen(true),
      className: "!text-destructive hover:!bg-destructive/10",
    },
  ]

  const handleClick = (e: React.MouseEvent) => {
    if (e.button === 0 || (e.type === 'click' && e.detail > 0)) {
      e.preventDefault()
      router.push(`/chat/${id}`)
    }
  }

  return (
    <>
      <div className={cn("flex w-full max-w-xl flex-col gap-0", !isLast && "border-b border-border/50")}>
        <ContextMenu>
          <ContextMenuTrigger className="w-full">
            <Item 
              variant="default" 
              className={cn(
                "p-2 sm:p-3 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer w-full touch-manipulation",
                isActive && "bg-muted/70 border-l-2 border-indigo-500"
              )}
              onClick={handleClick}
            >
              <div className="flex items-center w-full gap-2 sm:gap-3 min-w-0">
                <ItemMedia className="flex-shrink-0">
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                    <AvatarImage src={imageUrl} />
                    <AvatarFallback className="text-xs sm:text-sm">{name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent className="min-w-0 flex-1">
                  <ItemTitle className="text-sm sm:text-base truncate">{name}</ItemTitle>
                  <ItemDescription className="line-clamp-1 text-xs sm:text-sm">{message}</ItemDescription>
                </ItemContent>
                {(unreadCount ?? 0) > 0 && !isActive && (
                  <ItemActions className="flex-shrink-0">
                    <Badge variant="default" className="text-xs">{unreadCount}</Badge>
                  </ItemActions>
                )}
              </div>
            </Item>
          </ContextMenuTrigger>
          <ContextMenuContent className="max-w-[300px] w-[200px] rounded-lg overflow-hidden">
            {contextMenuItems.map((menuItem, index) =>
              menuItem.label.includes("Mute") ? (
                <ContextMenuSub key={index}>
                  <ContextMenuSubTrigger className={cn("gap-4 p-2 font-medium text-foreground data-[highlighted]:bg-muted/50", menuItem.className)}>
                    {menuItem.icon}
                    <span>{menuItem.label}</span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="p-1">
                    <ContextMenuItem className="p-2 cursor-pointer">15 min</ContextMenuItem>
                    <ContextMenuItem className="p-2 cursor-pointer">30 min</ContextMenuItem>
                    <ContextMenuItem className="p-2 cursor-pointer">1 hour</ContextMenuItem>
                    <ContextMenuItem className="p-2 cursor-pointer">8 hours</ContextMenuItem>
                    <ContextMenuItem className="p-2 cursor-pointer">1 day</ContextMenuItem>
                    <ContextMenuItem className="p-2 cursor-pointer">1 week</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem className="p-2 cursor-pointer">Forever</ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              ) : (
                <ContextMenuItem
                  key={index}
                  className={cn("p-2 gap-4 cursor-pointer", menuItem.className)}
                  onClick={menuItem.onClick}
                >
                  <div className="flex items-center gap-4">
                    {menuItem.icon}
                    <span>{menuItem.label}</span>
                  </div>
                </ContextMenuItem>
              ),
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* MODALUL DE CONFIRMARE */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat with <strong className="text-primary">{name}</strong>? <br/> 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-1">
            <Button 
              variant="ghost" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteChat}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}