import { Item, ItemActions, ItemContent, ItemTitle } from "./ui/item";
import AccountMenu from "./account-menu";
import SearchForm from "./search-form";

export default function SidebarHeader() {
    return (
        <Item variant="default" className="p-1 sm:p-2 w-full flex flex-col  gap-2 justify-start items-start ">
            <ItemContent className="flex flex-row items-center gap-2 min-w-0 flex-shrink-0 w-full sm:w-auto">
               <AccountMenu />
                <ItemTitle className="text-lg sm:text-xl truncate flex-1 min-w-0">Papel Chat</ItemTitle>
            </ItemContent>
            <ItemActions className="flex-shrink-0 w-full  min-w-0">
                <SearchForm />
            </ItemActions>
        </Item>
    )
}
