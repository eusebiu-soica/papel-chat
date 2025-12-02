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
                <Button variant="ghost" size="icon" className="cursor-pointer">
                    <Menu />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="shadow-lg" align="start">

                <DropdownMenuItem 
                    className="cursor-pointer data-[highlighted]:bg-muted/50"
                    onClick={handleUserProfile}
                >
                    <Item className="p-0 gap-2">
                        <ItemMedia>
                            <Avatar>
                                <AvatarImage src={user?.imageUrl} alt={user?.fullName || 'User profile picture'} />
                                <AvatarFallback>{userInitials}</AvatarFallback>
                            </Avatar>
                        </ItemMedia>
                        <ItemContent className="gap-0">
                            <ItemTitle>{user?.fullName || user?.firstName || 'User'}</ItemTitle>
                            <ItemDescription className="text-xs">
                                {user?.primaryEmailAddress?.emailAddress || 'No email'}
                            </ItemDescription>
                        </ItemContent>
                    </Item>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem 
                    className="gap-4 p-2 font-medium data-[highlighted]:bg-muted/50 cursor-pointer"
                    onClick={handleSettings}
                >
                    <Settings className="text-foreground" size={17} /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-4 p-2 font-medium data-[highlighted]:bg-muted/50 cursor-pointer">
                    <ModeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="gap-4 p-2 font-medium data-[highlighted]:bg-muted/50 cursor-pointer"
                    onClick={handleSignOut}
                >
                    <LogOut className="text-foreground" size={17} /> Log out
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="gap-4 p-2 text-center justify-center">
                    Papel Chat v1.2.34
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}