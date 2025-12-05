"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { signInWithCustomToken, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase/config"

export function FirebaseAuthSync() {
  const { userId, isSignedIn } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const syncAuth = async () => {
      if (!isSignedIn || !userId || isSyncing || !auth) return
      
      // Verificăm dacă suntem deja logați cu userul corect în Firebase
      if (auth.currentUser?.uid === userId) return

      try {
        setIsSyncing(true)
        console.log("🔄 Syncing Clerk -> Firebase...")

        // 1. Cerem token-ul de la serverul nostru
        const res = await fetch("/api/auth/firebase", { method: "POST" })
        if (!res.ok) throw new Error("Failed to get firebase token")
        
        const { token } = await res.json()

        // 2. Ne logăm în Firebase cu token-ul
        await signInWithCustomToken(auth, token)
        
        console.log("✅ Firebase Auth Synced (Custom Token)!")
      } catch (error) {
        console.error("❌ Auth sync failed:", error)
        // Retry logic ar putea fi adăugat aici
      } finally {
        setIsSyncing(false)
      }
    }

    if (isSignedIn) {
      syncAuth()
    } else if (auth) {
      // Dacă userul dă logout din Clerk, dăm logout și din Firebase
      signOut(auth)
    }
  }, [userId, isSignedIn])

  return null
}