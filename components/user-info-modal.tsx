"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertCircle, Ban, Flag, MessageSquare, Phone, Video } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserInfoModalProps {
  name: string
  avatar?: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export default function UserInfoModal({ name, avatar, isOpen, onOpenChange }: UserInfoModalProps) {
  const [activeTab, setActiveTab] = useState<"info" | "actions">("info")

  const actionItems = [
    {
      icon: <Phone className="h-5 w-5" />,
      label: "Voice Call",
      onClick: () => console.log("Voice call"),
    },
    {
      icon: <Video className="h-5 w-5" />,
      label: "Video Call",
      onClick: () => console.log("Video call"),
    },
    {
      icon: <Ban className="h-5 w-5" />,
      label: "Block",
      destructive: true,
      onClick: () => console.log("Block user"),
    },
    {
      icon: <AlertCircle className="h-5 w-5" />,
      label: "Report",
      destructive: true,
      onClick: () => console.log("Report user"),
    },
    {
      icon: <Flag className="h-5 w-5" />,
      label: "Restrict",
      destructive: true,
      onClick: () => console.log("Restrict user"),
    },
  ]

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
              {actionItems.map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 hover:bg-muted/50",
                    item.destructive && "text-destructive hover:text-destructive hover:bg-destructive/5"
                  )}
                  onClick={item.onClick}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              ))}
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
