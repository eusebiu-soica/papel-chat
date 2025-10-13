"use client"

import * as React from "react"
import { Moon, MoonStar, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "./ui/item"
import { Switch } from "./ui/switch"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <Item variant='default' className="p-0 w-full">
      <ItemMedia variant="default" className="p-0">
        <MoonStar />
      </ItemMedia>
      <ItemContent onClick={() => setTheme("dark")}>
        <ItemTitle>Night mode</ItemTitle>
      </ItemContent>
      <ItemActions>
        <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
      </ItemActions>
    </Item>
  )
}
