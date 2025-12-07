"use client"

import type React from "react"
import { useState, useRef } from "react" // Import useState and useRef
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer"
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
import { useIsMobile } from "@/hooks/use-mobile"

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
  const isMobile = useIsMobile()

  // State pentru modalul de ștergere
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [muteDuration, setMuteDuration] = useState<string | null>(null)

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
      icon: <Pin size={17} className="!text-foreground"/>,
      label: "Pin Chat",
      onClick: () => {
        console.log("Pin chat clicked")
        setIsDrawerOpen(false)
      },
    },
    {
      icon: <CheckCheck size={17} className="!text-foreground"/>,
      label: "Mark as Read",
      onClick: () => {
        console.log("Mark as read clicked")
        setIsDrawerOpen(false)
      },
      className: "",
    },
    {
      icon: <BellOff size={17} className="!text-foreground" />,
      label: "Mute for...",
      onClick: () => {
        // On mobile, show mute options in drawer
        if (isMobile) {
          setMuteDuration("selecting")
        } else {
          console.log("Mute clicked")
        }
      },
      className: "",
      isSubmenu: true,
    },
    {
      icon: <Trash size={17} className="!text-destructive"/>,
      label: "Delete Chat",
      // Aici doar deschidem modalul, nu ștergem direct
      onClick: () => {
        setIsDeleteDialogOpen(true)
        setIsDrawerOpen(false)
      },
      className: "!text-destructive hover:!bg-destructive/10",
    },
  ]

  const muteOptions = [
    { label: "15 min", value: "15min" },
    { label: "30 min", value: "30min" },
    { label: "1 hour", value: "1hour" },
    { label: "8 hours", value: "8hours" },
    { label: "1 day", value: "1day" },
    { label: "1 week", value: "1week" },
    { label: "Forever", value: "forever" },
  ]

  const handleMuteSelect = (duration: string) => {
    console.log("Mute selected:", duration)
    setMuteDuration(null)
    setIsDrawerOpen(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if drawer is open or if it's a right-click
    if (isDrawerOpen || e.button === 2) return
    
    if (e.button === 0 || (e.type === 'click' && e.detail > 0)) {
      e.preventDefault()
      router.push(`/chat/${id}`)
    }
  }

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartTimeRef = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    touchStartTimeRef.current = Date.now()
    longPressTimerRef.current = setTimeout(() => {
      e.preventDefault()
      setIsDrawerOpen(true)
      touchStartTimeRef.current = null
    }, 500) // 500ms for long press
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // If it was a quick tap (not long press), allow normal click
    if (touchStartTimeRef.current && Date.now() - touchStartTimeRef.current < 500) {
      // Normal tap - let the click handler work
      touchStartTimeRef.current = null
    }
  }

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    touchStartTimeRef.current = null
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault()
      setIsDrawerOpen(true)
    }
  }

  const menuContent = (
    <>
      {muteDuration === "selecting" ? (
        <>
          <div className="px-4 py-2 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMuteDuration(null)}
              className="mb-2"
            >
              ← Back
            </Button>
            <h3 className="text-base font-semibold">Mute for...</h3>
          </div>
          <div className="px-2 py-2">
            {muteOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleMuteSelect(option.value)}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left text-base"
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {contextMenuItems.map((menuItem, index) => {
            if (menuItem.label.includes("Mute")) {
              return (
                <button
                  key={index}
                  onClick={menuItem.onClick}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left text-base",
                    menuItem.className
                  )}
                >
                  {menuItem.icon}
                  <span>{menuItem.label}</span>
                </button>
              )
            }
            return (
              <button
                key={index}
                onClick={menuItem.onClick}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left text-base",
                  menuItem.className
                )}
              >
                {menuItem.icon}
                <span>{menuItem.label}</span>
              </button>
            )
          })}
        </>
      )}
    </>
  )

  return (
    <>
      <div className="flex w-full max-w-xl flex-col gap-0">
        {isMobile ? (
          <>
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <DrawerTrigger asChild>
                <div
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                  onContextMenu={handleContextMenu}
                >
                  <Item 
                    variant="default" 
                    className={cn(
                      "p-2 sm:p-3 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer w-full touch-manipulation",
                      isActive && "bg-primary/30 border-l-2 hover:bg-primary/30 border-primary"
                    )}
                    onClick={handleClick}
                  >
                    <div className="flex items-center w-full gap-3 sm:gap-4 min-w-0">
                      <ItemMedia className="flex-shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={imageUrl} />
                          <AvatarFallback className="text-xs sm:text-sm">{name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </ItemMedia>
                      <ItemContent className="min-w-0 flex-1 gap-0">
                        <ItemTitle className="text-base sm:text-base truncate">{name}</ItemTitle>
                        <ItemDescription className="line-clamp-1 text-sm sm:text-sm">{message}</ItemDescription>
                      </ItemContent>
                      {(unreadCount ?? 0) > 0 && !isActive && (
                        <ItemActions className="flex-shrink-0">
                          <Badge variant="default" className="text-xs">{unreadCount}</Badge>
                        </ItemActions>
                      )}
                    </div>
                  </Item>
                </div>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle className="text-lg">{name}</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-4 space-y-1">
                  {menuContent}
                </div>
              </DrawerContent>
            </Drawer>
          </>
        ) : (
          <ContextMenu>
            <ContextMenuTrigger className="w-full">
              <Item 
                variant="default" 
                className={cn(
                  "p-2 sm:p-3 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer w-full touch-manipulation",
                  isActive && "bg-primary/30 border-l-2 hover:bg-primary/30 border-primary"
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
                  <ItemContent className="min-w-0 flex-1 gap-0">
                    <ItemTitle className="text-base sm:text-base truncate">{name}</ItemTitle>
                    <ItemDescription className="line-clamp-1 text-sm sm:text-sm">{message}</ItemDescription>
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
                    <ContextMenuSubTrigger className={cn("gap-4 p-2 font-medium text-foreground data-[highlighted]:bg-muted/50 text-sm", menuItem.className)}>
                      {menuItem.icon}
                      <span>{menuItem.label}</span>
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="p-1">
                      {muteOptions.map((option) => (
                        <ContextMenuItem
                          key={option.value}
                          className="p-2 cursor-pointer text-sm"
                          onClick={() => handleMuteSelect(option.value)}
                        >
                          {option.label}
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                ) : (
                  <ContextMenuItem
                    key={index}
                    className={cn("p-2 gap-4 cursor-pointer text-sm", menuItem.className)}
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
        )}
      </div>

      {/* MODALUL DE CONFIRMARE */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="flex flex-col justify-start sm:justify-start">
            <DialogTitle className="text-start">Delete Chat</DialogTitle>
            <DialogDescription className="text-start">
              Are you sure you want to delete this chat with <strong className="text-primary">{name}</strong>? <br/> 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-1 flex flex-col sm:flex-row">
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