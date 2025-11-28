import type React from "react"
import { BellOff, CheckCheck, Pin, Trash } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Badge } from "./ui/badge"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ContextMenu, ContextMenuItem as MenuItem, ContextMenuSeparator } from "@radix-ui/react-context-menu"
import {
  ContextMenuContent,
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

function ItemTrigger({ id, name, imageUrl, message, isActive }: ChatItemProps & { isActive: boolean }) {
  return (
    <Item asChild variant="default" className={cn("p-3 hover:bg-muted/50 transition-colors", isActive && "bg-muted/70 border-l-2 border-indigo-500")}>
      <Link href={`/chat/${id}`}>
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
      </Link>
    </Item>
  )
}

export default function ChatItem({ id, name, message, unreadCount, imageUrl }: ChatItemProps) {
  const pathname = usePathname()
  const isActive = pathname === `/chat/${id}`

  return (
    <div className="flex w-full max-w-xl flex-col gap-0">
      <ContextMenu>
        <ContextMenuTrigger>
          <ItemTrigger id={id} name={name} message={message} unreadCount={unreadCount} imageUrl={imageUrl} isActive={isActive} />
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
                  <MenuItem className="p-2 hover:bg-muted/50 rounded-sm cursor-pointer">15 min</MenuItem>
                  <MenuItem className="p-2 hover:bg-muted/50 rounded-sm cursor-pointer">30 min</MenuItem>
                  <MenuItem className="p-2 hover:bg-muted/50 rounded-sm cursor-pointer">1 hour</MenuItem>
                  <MenuItem className="p-2 hover:bg-muted/50 rounded-sm cursor-pointer">8 hours</MenuItem>
                  <MenuItem className="p-2 hover:bg-muted/50 rounded-sm cursor-pointer">1 day</MenuItem>
                  <MenuItem className="p-2 hover:bg-muted/50 rounded-sm cursor-pointer">1 week</MenuItem>
                  <ContextMenuSeparator />
                  <MenuItem className="p-2 hover:bg-muted/50 rounded-sm cursor-pointer">Forever</MenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            ) : (
              <Item
                key={index}
                variant="default"
                className={cn("p-2 gap-4 hover:bg-muted/50 cursor-pointer w-full", menuItem.className)}
              >
                <ItemMedia variant="default" className="p-0">
                  {menuItem.icon}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{menuItem.label}</ItemTitle>
                </ItemContent>
              </Item>
            ),
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}
