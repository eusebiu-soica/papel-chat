import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"
import { Ban, BellOff, DeleteIcon, EllipsisVertical, LogOut, Menu, Settings, Trash } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "./ui/item"
import { ModeToggle } from "./theme-switch"
export default function AccountMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="cursor-pointer">
                    <Menu />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="shadow-lg" align="start">

                <DropdownMenuItem className="cursor-pointer">
                    <Item className="p-0 gap-2">
                        <ItemMedia>
                            <Avatar>
                                <AvatarImage src='https://images.pexels.com/photos/6497114/pexels-photo-6497114.jpeg' alt="User profile picture" />
                                <AvatarFallback>ES</AvatarFallback>
                            </Avatar>
                        </ItemMedia>
                        <ItemContent className="gap-0">
                            <ItemTitle>Eusebiu Soica</ItemTitle>
                            <ItemDescription className="text-xs">eusebiusoica20.es@gmail.com</ItemDescription>
                        </ItemContent>
                    </Item>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem className="gap-4 p-2 font-medium">
                    <Settings /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-4 p-2 font-medium">
                    <ModeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-4 p-2 font-medium">
                    <LogOut /> Log out
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="gap-4 p-2 text-center justify-center">
                    Papel Chat v1.2.34
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}