"use server"

import { db } from "@/lib/db/provider"

type MinimalClerkUser = {
  id: string
  fullName?: string | null
  firstName?: string | null
  username?: string | null
  imageUrl?: string | null
  primaryEmailAddress?: {
    emailAddress?: string | null
  } | null
}

export async function getOrCreateDbUser(clerkUser: MinimalClerkUser | null) {
  if (!clerkUser) {
    throw new Error("Unauthorized")
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress || ""
  if (!email) {
    throw new Error("Missing email address")
  }

  const name = clerkUser.fullName || clerkUser.firstName || "User"
  const avatar = clerkUser.imageUrl || undefined
  
  // Prioritize Clerk username if available, otherwise generate from email/name
  const usernameSeed = clerkUser.username 
    ? clerkUser.username // Use Clerk username as-is (will be cleaned/normalized by adapter)
    : clerkUser.primaryEmailAddress?.emailAddress?.split("@")?.[0] ||
      clerkUser.fullName?.replace(/\s+/g, "_") ||
      clerkUser.firstName?.replace(/\s+/g, "_") ||
      `papel${Math.floor(Math.random() * 1000)}`

  let dbUser = await db.getUserByEmail(email)

  if (!dbUser) {
    dbUser = await db.createUser({
      email,
      name,
      avatar,
      username: usernameSeed,
    })
  } else if (!dbUser.username && usernameSeed) {
    // Only update if user doesn't have a username yet
    dbUser = await db.updateUser(dbUser.id, { username: usernameSeed })
  }

  return dbUser
}

