"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Ban, Flag, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from 'sonner'

interface UserInfoModalProps {
  name: string
  avatar?: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export default function UserInfoModal({ name, avatar, isOpen, onOpenChange }: UserInfoModalProps) {
  const [activeTab, setActiveTab] = useState<"info" | "actions">("info")

  const handleBlock = () => {
    if (confirm(`Block ${name}? This will prevent them from messaging you.`)) {
      // TODO: call backend to block user
      toast.success(`${name} blocked`)
      onOpenChange(false)
    }
  }

  const handleReport = () => {
    if (confirm(`Report ${name}?`)) {
      // TODO: call backend to report user
      toast.success(`Reported ${name}`)
      onOpenChange(false)
    }
  }

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href
      if (navigator.share) {
        await navigator.share({ title: `Chat with ${name}`, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Chat link copied to clipboard')
      }
      onOpenChange(false)
    } catch (err) {
      console.error('Share failed', err)
      toast.error('Could not share link')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-lg">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex flex-col items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatar} />
              <AvatarFallback className="text-lg">{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <DialogTitle className="text-xl">{name}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 border-b border-muted pb-4">
            <button
              onClick={() => setActiveTab("info")}
              className={cn(
                "py-2 text-sm font-medium transition-colors",
                activeTab === "info" ? "border-b-2 border-indigo-500 text-indigo-500" : "text-muted-foreground"
              )}
            >
              Info
            </button>
            <button
              onClick={() => setActiveTab("actions")}
              className={cn(
                "py-2 text-sm font-medium transition-colors",
                activeTab === "actions" ? "border-b-2 border-indigo-500 text-indigo-500" : "text-muted-foreground"
              )}
            >
              Actions
            </button>
          </div>

          {activeTab === "info" && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Username</p>
                <p className="font-medium">{name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Chat ID</p>
                <p className="font-mono text-xs text-muted-foreground">ID:12345</p>
              </div>
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-muted/50" onClick={handleBlock}>
                <Ban className="h-5 w-5" />
                <span>Block</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-muted/50" onClick={handleReport}>
                <Flag className="h-5 w-5" />
                <span>Report</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-muted/50" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </Button>
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full mt-4" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
