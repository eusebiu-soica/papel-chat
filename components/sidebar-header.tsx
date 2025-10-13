import { Item, ItemActions, ItemContent, ItemTitle } from "./ui/item";
import AccountMenu from "./account-menu";
import SearchForm from "./search-form";

export default function SidebarHeader() {
    return (
        <Item variant="default" className="p-1 flex gap-2 w-full justify-start items-start">
            <ItemContent className="flex flex-row align-center">
               <AccountMenu />
                <ItemTitle className="text-xl">Papel Chat</ItemTitle>
            </ItemContent>
            <ItemActions >
                <SearchForm />
            </ItemActions>
        </Item>
    )
}
