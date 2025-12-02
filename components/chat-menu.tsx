import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"
import { Ban, BrushCleaning, MoreVertical } from "lucide-react"
export default function ChatMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="cursor-pointer">
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
    )
}