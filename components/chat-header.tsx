import ChatAvatar from "./chat-avatar";
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "./ui/item";
import { Button } from "./ui/button"; // Asigură-te că ai o componentă Button
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "./ui/dropdown-menu"; // Componentele pentru meniu
import { MoreVertical, VolumeX, Trash2, Ban, Archive, Trash } from "lucide-react"; // Iconițe
import ChatMenu from "./chat-menu";
import SearchForm from "./search-form";

export default function ChatHeader() {
    return (
        <div>
            <Item className="p-0">
                <ItemMedia>
                    <ChatAvatar name='Evil Rabbit' />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle className="text-lg font-medium">Evil Rabbit</ItemTitle>
                </ItemContent>
                <ItemActions className="flex-1">
                    <SearchForm className="w-full" />
                    <ChatMenu />
                </ItemActions>
            </Item>
        </div>
    )
}