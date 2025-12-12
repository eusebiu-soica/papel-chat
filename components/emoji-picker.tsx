"use client"

import dynamic from 'next/dynamic'
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import type { EmojiClickData } from 'emoji-picker-react'
import { Theme } from 'emoji-picker-react'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  className?: string
}

// Dynamic import with loading state
const EmojiPickerComponent = dynamic(
  async () => {
    const mod = await import('emoji-picker-react')
    return { default: mod.default }
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading emojis...</div>
      </div>
    ),
  }
)

export function EmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const { theme: appTheme } = useTheme()
  const emojiTheme = appTheme === 'dark' ? Theme.DARK : Theme.LIGHT

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji)
    // Don't close picker - let user select multiple emojis
  }

  return (
    <div className={cn("emoji-picker-container flex flex-col h-full bg-background", className)}>
      <EmojiPickerComponent
        onEmojiClick={handleEmojiClick}
        theme={emojiTheme}
        width="100%"
        height={700}
        searchDisabled={false}
        skinTonesDisabled={true}
        previewConfig={{ showPreview: false }}
        autoFocusSearch={false}
        lazyLoadEmojis={true}
        className='!rounded-none'
      />
    </div>
  )
  
}
