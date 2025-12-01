"use client"

import type React from "react"
import { BellOff, CheckCheck, Pin, Trash } from "lucide-react"
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
import { cn } from "@/lib/utils"

type MenuItemType = {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  className?: string
}

const contextMenuItems: MenuItemType[] = [
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
    onClick: () => console.log("Mark as read clicked"),
    className: "",
  },
  {
    icon: <Trash size={17} />,
    label: "Delete Chat",
    onClick: () => console.log("Delete chat clicked"),
    className: "text-destructive hover:bg-destructive/10",
  },
]

interface ChatItemProps {
  id: string
  name: string
  message: string
  unreadCount?: number
  imageUrl?: string
}

export default function ChatItem({ id, name, message, unreadCount, imageUrl }: ChatItemProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = pathname === `/chat/${id}`

  const handleClick = (e: React.MouseEvent) => {
    // Only navigate on left click, not right click
    if (e.button === 0 || (e.type === 'click' && e.detail > 0)) {
      e.preventDefault()
      router.push(`/chat/${id}`)
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-0">
      <ContextMenu>
        <ContextMenuTrigger className="w-full">
          <Item 
            variant="default" 
            className={cn("p-3 hover:bg-muted/50 transition-colors cursor-pointer w-full", isActive && "bg-muted/70 border-l-2 border-indigo-500")}
            onClick={handleClick}
          >
            <div className="flex items-center w-full">
              <ItemMedia>
                <Avatar className="size-10">
                  <AvatarImage src={imageUrl} />
                  <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{name}</ItemTitle>
                <ItemDescription className="line-clamp-1">{message}</ItemDescription>
              </ItemContent>
              {(unreadCount ?? 0) > 0 && (
                <ItemActions>
                  <Badge variant="default">{unreadCount}</Badge>
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
                  <ContextMenuItem className="p-2 cursor-pointer" onClick={() => console.log("Mute for 15 min")}>15 min</ContextMenuItem>
                  <ContextMenuItem className="p-2 cursor-pointer" onClick={() => console.log("Mute for 30 min")}>30 min</ContextMenuItem>
                  <ContextMenuItem className="p-2 cursor-pointer" onClick={() => console.log("Mute for 1 hour")}>1 hour</ContextMenuItem>
                  <ContextMenuItem className="p-2 cursor-pointer" onClick={() => console.log("Mute for 8 hours")}>8 hours</ContextMenuItem>
                  <ContextMenuItem className="p-2 cursor-pointer" onClick={() => console.log("Mute for 1 day")}>1 day</ContextMenuItem>
                  <ContextMenuItem className="p-2 cursor-pointer" onClick={() => console.log("Mute for 1 week")}>1 week</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem className="p-2 cursor-pointer" onClick={() => console.log("Mute forever")}>Forever</ContextMenuItem>
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
  )
}
