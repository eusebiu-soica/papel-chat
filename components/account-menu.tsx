"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"
import { LogOut, Menu, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "./ui/item"
import { ModeToggle } from "./theme-switch"
import { useUser, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

export default function AccountMenu() {
    const { user } = useUser()
    const { signOut, openUserProfile } = useClerk()
    const router = useRouter()

    const handleSignOut = () => {
        signOut(() => router.push('/'))
    }

    const handleUserProfile = () => {
        openUserProfile()
    }

    const handleSettings = () => {
        // Navigate to settings page or open Clerk user profile
        openUserProfile()
    }

    const userInitials = user?.fullName 
        ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user?.firstName?.[0]?.toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'U'

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="cursor-pointer h-9 w-9 sm:h-10 sm:w-10 touch-manipulation active:scale-95 transition-transform">
                    <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="shadow-lg w-[280px] sm:w-[300px]" align="start">

                <DropdownMenuItem 
                    className="cursor-pointer data-[highlighted]:bg-muted/50 touch-manipulation"
                    onClick={handleUserProfile}
                >
                    <Item className="p-0 gap-2">
                        <ItemMedia>
                            <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                                <AvatarImage src={user?.imageUrl} alt={user?.fullName || 'User profile picture'} />
                                <AvatarFallback className="text-xs sm:text-sm">{userInitials}</AvatarFallback>
                            </Avatar>
                        </ItemMedia>
                        <ItemContent className="gap-0 min-w-0">
                            <ItemTitle className="text-sm sm:text-base truncate">{user?.fullName || user?.firstName || 'User'}</ItemTitle>
                            <ItemDescription className="text-xs truncate">
                                {user?.primaryEmailAddress?.emailAddress || 'No email'}
                            </ItemDescription>
                        </ItemContent>
                    </Item>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem 
                    className="gap-3 sm:gap-4 p-2.5 sm:p-2 font-medium data-[highlighted]:bg-muted/50 cursor-pointer touch-manipulation min-h-[44px]"
                    onClick={handleSettings}
                >
                    <Settings className="text-foreground h-4 w-4 sm:h-[17px] sm:w-[17px]" /> 
                    <span className="text-sm sm:text-base">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 sm:gap-4 p-2.5 sm:p-2 font-medium data-[highlighted]:bg-muted/50 cursor-pointer touch-manipulation min-h-[44px]">
                    <ModeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="gap-3 sm:gap-4 p-2.5 sm:p-2 font-medium data-[highlighted]:bg-muted/50 cursor-pointer touch-manipulation min-h-[44px]"
                    onClick={handleSignOut}
                >
                    <LogOut className="text-foreground h-4 w-4 sm:h-[17px] sm:w-[17px]" /> 
                    <span className="text-sm sm:text-base">Log out</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="gap-4 p-2 text-center justify-center text-xs sm:text-sm">
                    Papel Chat v1.2.34
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}