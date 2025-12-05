"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"
import { auth } from "@/lib/firebase/config"

// Instantiem adaptorul
const adapter = new FirestoreAdapter()

// Definim interfetele pentru claritate (poti sa le importi daca le ai in alt fisier)
interface Chat {
  id: string
  userId: string
  name: string
  avatar?: string
  message: string
  lastMessageTime: Date
}

interface ChatContextType {
  selectedChatId: string | null
  setSelectedChatId: (id: string | null) => void
  chats: Chat[]
  setChats: (chats: Chat[]) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  currentUserId?: string | null
  setCurrentUserId?: (id: string | null) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !user || !auth) return

    // Ascultam cand Firebase termina autentificarea
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Abia acum, cand avem firebaseUser, incercam sa scriem in DB
        await syncUserWithFirestore()
      }
    })

    return () => unsubscribe()
  }, [isLoaded, user])

  const syncUserWithFirestore = async () => {
    try {
      // Folosim ID-ul din Clerk ca referinta
      const clerkId = user?.id
      if (!clerkId) return

      // Incercam sa gasim userul dupa ID-ul din Clerk
      let dbUser = await adapter.getUserById(clerkId)
      
      // Daca nu il gasim dupa ID, verificam si email (fallback pentru migrare)
      if (!dbUser && user?.primaryEmailAddress?.emailAddress) {
         dbUser = await adapter.getUserByEmail(user.primaryEmailAddress.emailAddress)
      }

      if (!dbUser) {
        console.log("Creating new user in Firestore...")
        // --- MODIFICARE AICI: Trimitem ID-ul explicid ---
        dbUser = await adapter.createUser({
          id: clerkId, // <--- Aceasta este cheia! ID-ul documentului va fi identic cu UID-ul
          email: user?.primaryEmailAddress?.emailAddress || '',
          name: user?.fullName || user?.firstName || 'User',
          avatar: user?.imageUrl || undefined,
        })
      }
      
      setCurrentUserId(dbUser.id)
    } catch (err) {
      console.error('Failed to sync user with database', err)
    }
  }

  return (
    <ChatContext.Provider
      value={{
        selectedChatId,
        setSelectedChatId,
        chats,
        setChats,
        loading,
        setLoading,
        currentUserId,
        setCurrentUserId,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}