"use client"

import React from "react"
import { Plus, User, Check, Building2, MessageSquareDashed, Loader2, X } from "lucide-react"
import { useEffect, useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useChat } from "@/lib/context/chat-context"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "./ui/drawer"
import { Input } from "./ui/input"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"
// Importam adaptorul direct
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"

const adapter = new FirestoreAdapter()

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

type UserOption = {
  id: string
  name: string
  username?: string | null
  avatar?: string | null
}

export default function AddNew() {
  const isMobile = useIsMobile()
  const [chatType, setChatType] = useState<"single" | "room" | "temporary">("single")
  const [roomId, setRoomId] = useState(() => genId())
  const [participantSearch, setParticipantSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState("")
  const { currentUserId } = useChat()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("")
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(participantSearch.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [participantSearch])

  // 1. CĂUTARE UTILIZATORI (Direct prin Adapter)
  const { data: fetchedUsers = [], isFetching: isSearchingUsers } = useQuery({
    queryKey: ["user-search", debouncedSearch],
    enabled: chatType === "single" && debouncedSearch.length >= 2 && !selectedUser,
    queryFn: async () => {
      // Nu mai apelam /api/users, ci Firestore direct
      const users = await adapter.searchUsersByUsername(debouncedSearch, 5)
      // Filtram utilizatorul curent din rezultate
      return users.filter(u => u.id !== currentUserId)
    },
    staleTime: 1000 * 60,
  })
  
  const userSearchResults = selectedUser ? [] : fetchedUsers

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setParticipantSearch("")
      setSelectedUser(null)
      setRoomName("")
    }
  }, [open])

  const OptionCard = React.memo(({ icon, label, description, value, selected, onSelect }: any) => (
    <button
      onClick={() => onSelect(value)}
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
      <div className={cn(
        "flex items-center justify-center size-9 sm:size-10 rounded-lg transition-colors flex-shrink-0",
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground room-hover:bg-primary/20 room-hover:text-primary",
      )}>
        {icon}
      </div>
      <div className="space-y-0.5 sm:space-y-1 min-w-0">
        <h3 className="font-semibold text-sm sm:text-base">{label}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </button>
  ))

  const content = useMemo(() => (
    <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <OptionCard
          icon={<User className="size-4 sm:size-5" />}
          label="Single Chat"
          description="Create a private chat with a single user"
          value="single"
          selected={chatType === "single"}
          onSelect={setChatType}
        />
        <OptionCard
          icon={<Building2 className="size-4 sm:size-5" />}
          label="Room Chat"
          description="Create a public group chat for up to 20 users"
          value="room"
          selected={chatType === "room"}
          onSelect={setChatType}
        />
        <OptionCard
          icon={<MessageSquareDashed className="size-4 sm:size-5" />}
          label="Temporary Chat"
          description="Create a temporary chat that will expire after 3 hours"
          value="temporary"
          selected={chatType === "temporary"}
          onSelect={setChatType}
        />
      </div>

      {chatType === "single" && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs sm:text-sm font-medium">Add participant</label>
            {selectedUser && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="h-7 sm:h-8 text-xs">Clear</Button>
            )}
          </div>
          {selectedUser ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={selectedUser.avatar || undefined} />
                  <AvatarFallback>{selectedUser.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground">@{selectedUser.username || "unknown"}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Input
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="Search by username..."
                className="bg-muted/50 text-xs sm:text-sm"
              />
              {isSearchingUsers ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Searching...</span>
                </div>
              ) : (
                userSearchResults.length > 0 && (
                  <div className="rounded-lg border border-border divide-y max-h-[200px] overflow-y-auto">
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user)
                          setParticipantSearch("")
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/70 transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || undefined} />
                          <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">@{user.username || "unknown"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  ), [chatType, selectedUser, participantSearch, isSearchingUsers, userSearchResults])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Not authenticated")

      // 2. CREARE ROOM (Direct prin Adapter)
      if (chatType === "room" || chatType === "temporary") {
        const room = await adapter.createRoom({
          name: roomName || `Room ${roomId}`,
          topic: '',
          createdBy: currentUserId,
          shareableId: roomId,
          isTemporary: chatType === "temporary"
        })
        return { type: 'room', id: room.id }
      }

      // 3. CREARE CHAT (Direct prin Adapter)
      if (chatType === 'single') {
        if (selectedUser) {
          // Check for existing chat first (Client side query)
          const existingChats = await adapter.getChatsByUserId(currentUserId)
          const existing = existingChats.find(c => 
            (c.userId1 === currentUserId && c.userId2 === selectedUser.id) ||
            (c.userId1 === selectedUser.id && c.userId2 === currentUserId)
          )
          
          if (existing) return { type: 'chat', id: existing.id }

          const chat = await adapter.createChat({
            userId1: currentUserId,
            userId2: selectedUser.id
          })
          return { type: 'chat', id: chat.id }
        } else {
          // Create pending chat link
          const chat = await adapter.createChat({
            userId1: currentUserId,
            userId2: null // Pending
          })
          return { type: 'chat', id: chat.id }
        }
      }
    },
    onSuccess: (result) => {
      if (result) {
        setOpen(false)
        // Invalidate queries to refresh lists instantly
        queryClient.invalidateQueries({ queryKey: ['chats'] })
        router.push(`/chat/${result.id}`)
      }
    },
    onError: (err) => {
      console.error(err)
      alert("Failed to create. Please try again.")
    }
  })

  const handleCreate = () => createMutation.mutate()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="default" className="rounded-full size-11 sm:size-12" size="icon-lg">
            <Plus className="size-4 sm:size-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="px-4 py-4 sm:py-6 pb-16">
            <DrawerTitle className="text-lg font-semibold mb-4">Create new</DrawerTitle>
            {content}
            <div className="mt-4 flex flex-col gap-2">
              {chatType === 'room' && (
                <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room name" />
              )}
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="rounded-full size-11 sm:size-12" size="icon-lg">
          <Plus className="size-4 sm:size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogTitle>Create new</DialogTitle>
        {content}
        <div className="mt-4 flex justify-end gap-2">
          {chatType === 'room' && (
            <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room name" />
          )}
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
             {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}