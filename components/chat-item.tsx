import { BellOff, CheckCheck, Pin, Trash } from "lucide-react"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item"
import { Badge } from "./ui/badge"
import Link from "next/link"
import { ContextMenu } from "@radix-ui/react-context-menu"
import { ContextMenuContent, ContextMenuTrigger } from "./ui/context-menu"
import { cn } from "@/lib/utils"

type ContextMenuItem = {
    icon: React.ReactNode
    label: string
    onClick?: () => void
    className?: string
}

const contextMenuItems: ContextMenuItem[] = [
    {
        icon: <Pin size={17} />,
        label: 'Pin Chat',
        onClick: () => console.log('Pin chat clicked'),
    },
    {
        icon: <CheckCheck size={17} />,
        label: 'Mark as Read',
        onClick: () => console.log('Mark as read clicked'),
        className: ''

    },
    {
        icon: <BellOff size={17} />,
        label: 'Mute for...',
        onClick: () => console.log('Mark as read clicked'),
        className: ''

    },
    {
        icon: <Trash size={17} />,
        label: 'Delete Chat',
        onClick: () => console.log('Delete chat clicked'),
        className: 'text-destructive hover:bg-destructive/10'
    },
]

function ItemTrigger() {
    return (
        <Item asChild variant="default" className="p-3 hover:bg-muted/50">
            <Link href="/chat/1">
                <ItemMedia>
                    <Avatar className="size-10">
                        <AvatarImage src="https://github.com/evilrabbit.png" />
                        <AvatarFallback>ER</AvatarFallback>
                    </Avatar>
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Evil Rabbit</ItemTitle>
                    <ItemDescription>Last seen 5 months ago</ItemDescription>
                </ItemContent>
                <ItemActions>
                    <Badge variant="default">3</Badge>
                </ItemActions>
            </Link>
        </Item>
    )
}

export default function ChatItem() {
    return (
        <div className="flex w-full max-w-xl flex-col gap-0">
            <ContextMenu >
                <ContextMenuTrigger>
                    <ItemTrigger />
                </ContextMenuTrigger>
                <ContextMenuContent className="max-w-[300px] w-[200px] rounded-lg">
                    {contextMenuItems.map((menuItem, index) => (
                        <Item
                            key={index}
                            variant="default"
                            className={cn("p-2 gap-4 hover:bg-muted/50 cursor-pointer w-full", menuItem.className)}
                        // onClick={menuItem.onClick}
                        >
                            <ItemMedia variant="default" className="p-0">
                                {menuItem.icon}
                            </ItemMedia>
                            <ItemContent>
                                <ItemTitle>{menuItem.label}</ItemTitle>
                            </ItemContent>
                        </Item>
                    ))}
                </ContextMenuContent>
            </ContextMenu>
        </div>
    )
}
