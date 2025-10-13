import { Item, ItemActions, ItemContent, ItemTitle } from "./ui/item";
import AccountMenu from "./account-menu";
import SearchForm from "./search-form";

export default function SidebarHeader() {
    return (
        <Item variant="default" className="p-1 flex align-center justify-between">
            <ItemContent className="flex flex-row align-center gap-2">
               <AccountMenu />
                <ItemTitle className="text-xl">Papel Chat</ItemTitle>
            </ItemContent>
            <ItemActions>
                <SearchForm />
            </ItemActions>
        </Item>
    )
}
