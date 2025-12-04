import { Item, ItemActions, ItemContent, ItemTitle } from "./ui/item";
import AccountMenu from "./account-menu";
import SearchForm from "./search-form";

export default function SidebarHeader() {
    return (
        <Item variant="default" className="p-1 sm:p-2 flex gap-2 w-full justify-start items-center">
            <ItemContent className="flex flex-row items-center gap-2 min-w-0">
               <AccountMenu />
                <ItemTitle className="text-base sm:text-xl truncate">Papel Chat</ItemTitle>
            </ItemContent>
            <ItemActions className="flex-shrink-0">
                <SearchForm />
            </ItemActions>
        </Item>
    )
}
