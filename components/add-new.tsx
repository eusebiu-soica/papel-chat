"use client"

import React from "react"

import { Plus, User, Check, Building2, MessageSquareDashed, Loader2, X } from "lucide-react"
import { useEffect, useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useChat } from "@/lib/context/chat-context"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "./ui/drawer"
import { Input } from "./ui/input"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"

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

  // Debounce search input to prevent query on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState("")
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(participantSearch.trim())
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timer)
  }, [participantSearch])

  const normalizedSearch = debouncedSearch
  const shouldSearchUsers = chatType === "single" && normalizedSearch.length >= 2 && !selectedUser
  
  const { data: fetchedUsers = [], isFetching: isSearchingUsers } = useQuery<UserOption[]>({
    queryKey: ["user-search", normalizedSearch],
    enabled: shouldSearchUsers,
    queryFn: async () => {
      if (normalizedSearch.length < 2) return []
      const response = await fetch(`/api/users?username=${encodeURIComponent(normalizedSearch)}`)
      if (!response.ok) {
        throw new Error("Failed to search users")
      }
      return response.json()
    },
    staleTime: 1000 * 60, // Cache for 1 minute
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })
  
  const userSearchResults = selectedUser ? [] : fetchedUsers

  useEffect(() => {
    if (!open) {
      setParticipantSearch("")
      setSelectedUser(null)
      setRoomName("")
    }
  }, [open])

  useEffect(() => {
    if (chatType !== "single") {
      setParticipantSearch("")
      setSelectedUser(null)
    }
  }, [chatType])

  const OptionCard = React.memo(({
    icon,
    label,
    description,
    value,
    selected,
    onSelect,
  }: {
    icon: React.ReactNode
    label: string
    description: string
    value: "single" | "room" | "temporary"
    selected: boolean
    onSelect: (value: "single" | "room" | "temporary") => void
  }) => (
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

      <div
        className={cn(
          "flex items-center justify-center size-9 sm:size-10 rounded-lg transition-colors flex-shrink-0",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground room-hover:bg-primary/20 room-hover:text-primary",
        )}
      >
        {icon}
      </div>
      <div className="space-y-0.5 sm:space-y-1 min-w-0">
        <h3 className="font-semibold text-sm sm:text-base">{label}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </button>
  ))

  // Memoize Content to prevent Input remounting
  const content = useMemo(() => (
    <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <OptionCard
          icon={<User className="size-4 sm:size-5" />}
          label="Single"
          description="Private chat between two people"
          value="single"
          selected={chatType === "single"}
          onSelect={setChatType}
        />
        <OptionCard
          icon={<Building2 className="size-4 sm:size-5" />}
          label="Room"
          description="Room chat with multiple participants"
          value="room"
          selected={chatType === "room"}
          onSelect={setChatType}
        />
        <OptionCard
          icon={<MessageSquareDashed className="size-4 sm:size-5" />}
          label="Temporary"
          description="Temporary chat that expires in 3 hours"
          value="temporary"
          selected={chatType === "temporary"}
          onSelect={setChatType}
        />
      </div>

      {chatType === "single" && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs sm:text-sm font-medium">Add participant (optional)</label>
            {selectedUser && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="h-7 sm:h-8 text-xs touch-manipulation">
                Clear
              </Button>
            )}
          </div>
          {selectedUser ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                  <AvatarImage src={selectedUser.avatar || undefined} alt={selectedUser.name} />
                  <AvatarFallback>{selectedUser.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground">@{selectedUser.username || "unknown"}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedUser(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Input
                key="participant-search-input"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="Search by username (min. 2 characters)"
                className="bg-muted/50 text-xs sm:text-sm"
              />
              {isSearchingUsers ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Searching...</span>
                </div>
              ) : (
                shouldSearchUsers && (
                  userSearchResults.length > 0 ? (
                    <div className="rounded-lg border border-border divide-y">
                      {userSearchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(user)
                            setParticipantSearch(user.username || "")
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/70 transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar || undefined} alt={user.name} />
                            <AvatarFallback>{user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">@{user.username || "unknown"}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground px-1 py-1.5">No users found.</p>
                  )
                )
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Pick a username to start a private chat instantly, or leave empty to create a shareable link.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  ), [chatType, selectedUser, participantSearch, isSearchingUsers, shouldSearchUsers, userSearchResults])


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
        setOpen(false)
        router.push(`/chat/${room.id}`)
        return
      }

      if (chatType === 'single') {
        if (!currentUserId) {
          alert('Please wait for your account to load')
          return
        }

        if (selectedUser) {
          // Create chat with selected user
          const res = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId1: currentUserId,
              userId2: selectedUser.id,
            }),
          })
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to create chat')
          }
          const chat = await res.json()
          setSelectedUser(null)
          setParticipantSearch("")
          setOpen(false)
          router.push(`/chat/${chat.id}`)
          return
        }
        
        // Create a single chat that can be joined via link
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
        
        setOpen(false)
        router.push(`/chat/${chat.id}`)
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
        setOpen(false)
        router.push(`/chat/${room.id}`)
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
          <Button variant="default" className="rounded-full size-11 sm:size-12 cursor-pointer touch-manipulation active:scale-95 transition-transform" size="icon-lg">
            <Plus className="size-4 sm:size-5" />
          </Button>
        </DrawerTrigger>

        <DrawerContent>
          <div className="px-4 py-4 sm:py-6 pb-16">
            <DrawerTitle className="text-lg sm:text-xl font-semibold mb-4">Create a new chat</DrawerTitle>
            {content}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              {chatType === 'room' && (
                <Input 
                  value={roomName} 
                  onChange={(e) => setRoomName(e.target.value)} 
                  placeholder="Room name"
                  className="w-full sm:w-auto"
                />
              )}
              <Button onClick={handleCreate} className="w-full sm:w-auto touch-manipulation">Create</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="rounded-full size-11 sm:size-12 cursor-pointer touch-manipulation active:scale-95 transition-transform" size="icon-lg">
          <Plus className="size-4 sm:size-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-lg sm:text-xl font-semibold">Create a new chat</DialogTitle>
        {content}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
          {chatType === 'room' && (
            <Input 
              value={roomName} 
              onChange={(e) => setRoomName(e.target.value)} 
              placeholder="Room name"
              className="w-full sm:w-auto"
            />
          )}
          <Button onClick={handleCreate} className="w-full sm:w-auto touch-manipulation">Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
