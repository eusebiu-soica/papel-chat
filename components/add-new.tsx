"use client"

import type React from "react"

import { Plus, Copy, User, Users, Clock, Check, Building2, MessageSquareDashed } from "lucide-react"
import { useEffect, useState } from "react"
import { useChat } from "@/lib/context/chat-context"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "./ui/drawer"
import { Input } from "./ui/input"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function AddNew() {
  const isMobile = useIsMobile()
  const [chatType, setChatType] = useState<"single" | "room" | "temporary">("single")
  const [roomId, setRoomId] = useState(() => genId())
  const [shareableLink, setShareableLink] = useState(() => `https://papel.chat/single/${roomId}`)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setShareableLink(() => {
      if (chatType === "single") return `https://papel.chat/single/${roomId}`
      if (chatType === "room") return `https://papel.chat/room/${roomId}`
      return `https://papel.chat/temp/${roomId}`
    })
  }, [chatType, roomId])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert("Nu am putut copia linkul")
    }
  }

  const handleNewRoomId = () => {
    const id = genId()
    setRoomId(id)
  }

  const OptionCard = ({
    icon,
    label,
    description,
    value,
  }: {
    icon: React.ReactNode
    label: string
    description: string
    value: "single" | "room" | "temporary"
  }) => {
    const selected = chatType === value
    return (
      <button
        onClick={() => setChatType(value)}
        className={cn(
          "relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-left room",
          selected
            ? "bg-primary/10 border-primary shadow-sm"
            : "bg-background border-border hover:border-primary/50 hover:bg-accent/50",
        )}
      >
        {selected && (
          <div className="absolute top-3 right-3 size-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="size-3 text-primary-foreground" />
          </div>
        )}

        <div
          className={cn(
            "flex items-center justify-center size-10 rounded-lg transition-colors",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground room-hover:bg-primary/20 room-hover:text-primary",
          )}
        >
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-base">{label}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </button>
    )
  }

  const Content = () => (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OptionCard
          icon={<User className="size-5" />}
          label="Single"
          description="Private chat between two people"
          value="single"
        />
        <OptionCard
          icon={<Building2 className="size-5" />}
          label="Room"
          description="Room chat with multiple participants"
          value="room"
        />
        <OptionCard
          icon={<MessageSquareDashed className="size-5" />}
          label="Temporary"
          description="Temporary chat that expires in 3 hours"
          value="temporary"
        />
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Sharable Link</label>
          <Button variant="ghost" size="sm" onClick={handleNewRoomId} className="h-8 text-xs">
            Regenerate
          </Button>
        </div>
        <div className="flex gap-2">
          <Input readOnly value={shareableLink} className="flex-1 font-mono text-sm bg-muted/50" />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className={cn("shrink-0 transition-colors", copied && "bg-primary text-primary-foreground border-primary")}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Share this link to invite people to chat</p>
        {chatType === 'single' && (
          <div className="pt-2">
            <label className="text-sm font-medium">Participant ID</label>
            <Input value={participantId} onChange={(e) => setParticipantId(e.target.value)} placeholder="User ID or email" />
            <p className="text-xs text-muted-foreground">Enter the user id or email to start a private chat</p>
          </div>
        )}
      </div>
    </div>
  )

  // Controlled open state so we can close after creation
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState("")
  const [participantId, setParticipantId] = useState("")
  const { chats, setChats, currentUserId } = useChat()

  const handleCreate = async () => {
    try {
      if (chatType === "room") {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: roomName || `Room ${roomId}`, topic: '', createdBy: currentUserId || 'current-user' }),
        })
        if (!res.ok) throw new Error('Failed to create room')
        const room = await res.json()
        // Dispatch refresh and optionally update UI
        window.dispatchEvent(new CustomEvent('chats:refresh'))
        setOpen(false)
        return
      }

      if (chatType === 'single') {
        if (!participantId) {
          alert('Please enter participant id')
          return
        }
        // If participantId looks like an email, try to resolve or create the user first
        let userId2 = participantId
        if (participantId.includes('@')) {
          // try to find existing user by email
          const usersRes = await fetch('/api/users')
          if (usersRes.ok) {
            const users = await usersRes.json()
            const found = users.find((u: any) => u.email === participantId)
            if (found) {
              userId2 = found.id
            } else {
              // create the user
              const nameGuess = participantId.split('@')[0]
              const createRes = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: participantId, name: nameGuess }),
              })
              if (!createRes.ok) throw new Error('Failed to create participant user')
              const created = await createRes.json()
              userId2 = created.id
            }
          }
        }

        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId1: currentUserId || 'current-user', userId2 }),
        })
        if (!res.ok) throw new Error('Failed to create chat')
        const chat = await res.json()
        // Optimistic update: prepend to context chats
        if (setChats) setChats((prev: any) => [{ id: chat.id, name: chat.user2?.name || 'New Chat', message: chat.messages?.[0]?.content || 'No messages yet', unreadCount: 0, imageUrl: chat.user2?.avatar || null }, ...prev])
        window.dispatchEvent(new CustomEvent('chats:refresh'))
        setOpen(false)
        return
      }

      if (chatType === 'temporary') {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `Temp ${roomId}`, topic: '', createdBy: currentUserId || 'current-user' }),
        })
        if (!res.ok) throw new Error('Failed to create temporary room')
        window.dispatchEvent(new CustomEvent('chats:refresh'))
        setOpen(false)
        return
      }
    } catch (err) {
      console.error(err)
      alert('Failed to create')
    }
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="default" className="rounded-full size-12 cursor-pointer" size="icon-lg">
            <Plus className="size-5" />
          </Button>
        </DrawerTrigger>

        <DrawerContent>
          <div className="px-4 py-6 pb-16">
            <DrawerTitle className="text-xl font-semibold mb-4 space-y-4">Creează un chat nou</DrawerTitle>
            <Content />
            <div className="mt-4 flex items-center justify-end gap-2">
              {chatType === 'room' && (
                <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room name" />
              )}
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="rounded-full size-12 cursor-pointer" size="icon-lg">
          <Plus className="size-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogTitle className="text-xl font-semibold">Create a new chat</DialogTitle>
        <Content />
        <div className="mt-4 flex items-center justify-end gap-2">
          {chatType === 'room' && (
            <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room name" />
          )}
          <Button onClick={handleCreate}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
