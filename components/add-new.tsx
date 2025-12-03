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
import { useRouter } from "next/navigation"

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
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://papel.chat'
    setShareableLink(() => {
      if (chatType === "single") return `${baseUrl}/join/single/${roomId}`
      if (chatType === "room") return `${baseUrl}/join/room/${roomId}`
      return `${baseUrl}/join/temp/${roomId}`
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
      </div>
    </div>
  )

  // Controlled open state so we can close after creation
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState("")
  const { chats, setChats, currentUserId } = useChat()
  const router = useRouter()

  const handleCreate = async () => {
    try {
      if (chatType === "room") {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: roomName || `Room ${roomId}`, topic: '', createdBy: currentUserId || 'current-user', shareableId: roomId }),
        })
        if (!res.ok) throw new Error('Failed to create room')
        const room = await res.json()
        // Update shareable link with actual room ID
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://papel.chat'
        setShareableLink(`${baseUrl}/join/room/${room.id}`)
        // Real-time subscription will automatically update chats
        setOpen(false)
        return
      }

      if (chatType === 'single') {
        if (!currentUserId) {
          alert('Please wait for your account to load')
          return
        }
        
        // Create a single chat that can be joined via link
        // The API will use the authenticated user ID from Clerk
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            shareableId: roomId,
            isPending: true
          }),
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          const errorMessage = errorData.error || 'Failed to create chat'
          console.error('Chat creation error:', errorMessage, errorData)
          throw new Error(errorMessage)
        }
        const chat = await res.json()
        
        // Update shareable link with actual chat ID (not roomId!)
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://papel.chat'
        const finalLink = `${baseUrl}/join/single/${chat.id}`
        setShareableLink(finalLink)
        
        // Copy the link to clipboard automatically
        try {
          await navigator.clipboard.writeText(finalLink)
          setCopied(true)
          setTimeout(() => setCopied(false), 3000)
        } catch (err) {
          console.error('Failed to copy link', err)
        }
        
        // Copy the link to clipboard automatically (already done above)
        console.log(`Chat created! Link copied: ${finalLink}`)
        
        // Close modal immediately - real-time subscription will pick up the new chat
        setOpen(false)
        
        // Reset form for next time
        setRoomId(genId())
        setCopied(false)
        
        // The real-time subscription will automatically detect the new chat
        // No need to manually refresh - Firestore listener will update sidebar
        
        return
      }

      if (chatType === 'temporary') {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `Temp ${roomId}`, topic: '', createdBy: currentUserId || 'current-user', shareableId: roomId, isTemporary: true }),
        })
        if (!res.ok) throw new Error('Failed to create temporary room')
        const room = await res.json()
        // Update shareable link with actual room ID
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://papel.chat'
        setShareableLink(`${baseUrl}/join/temp/${room.id}`)
        // Real-time subscription will automatically update chats
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
