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
import { Ban, BellOff, DeleteIcon, EllipsisVertical, Trash } from "lucide-react"
export default function ChatMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="cursor-pointer"><EllipsisVertical /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-50" align="end">

                <DropdownMenuItem>
                    <BellOff /> Mute this conversation
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Ban /> Block user
                </DropdownMenuItem>

                <DropdownMenuItem className="hover:bg-destructive">
                    <Trash /> Delete entire chat
                </DropdownMenuItem>

            </DropdownMenuContent>
        </DropdownMenu>
    )
}