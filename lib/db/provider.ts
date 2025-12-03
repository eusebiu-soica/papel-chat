// Database provider factory - switch between Firebase and Prisma
import { DatabaseAdapter } from "./adapter"
import { PrismaAdapter } from "./prisma-adapter"

// Set this environment variable to switch databases
// Values: "firebase" | "firestore" | "prisma"
const DB_PROVIDER = (process.env.NEXT_PUBLIC_DB_PROVIDER || process.env.DB_PROVIDER || "prisma").toLowerCase()

let adapterInstance: DatabaseAdapter | null = null

export function getDatabaseAdapter(): DatabaseAdapter {
  if (adapterInstance) {
    return adapterInstance
  }

  switch (DB_PROVIDER) {
    case "firebase":
    case "firestore":
      try {
        // Dynamically import Firestore adapter to catch initialization errors
        const { FirestoreAdapter } = require("./firestore-adapter")
        adapterInstance = new FirestoreAdapter()
        console.log("📦 Using Firebase Firestore Database")
        console.log("📦 Adapter has subscribeToChats:", typeof (adapterInstance as any).subscribeToChats === 'function')
      } catch (error: any) {
        console.error("❌ Firebase Firestore initialization failed!")
        console.error("Error:", error?.message || error)
        console.error("\n📋 To fix this:")
        console.error("1. Go to https://console.firebase.google.com/")
        console.error("2. Select project: papel-chat-38e47")
        console.error("3. Enable 'Firestore Database' (not Realtime Database)")
        console.error("4. See FIREBASE_SETUP.md for detailed instructions")
        console.error("\n⚠️  Falling back to Prisma adapter...\n")
        adapterInstance = new PrismaAdapter()
        console.log("📦 Using Prisma/PostgreSQL (fallback)")
      }
      break
    case "prisma":
    default:
      adapterInstance = new PrismaAdapter()
      console.log("📦 Using Prisma/PostgreSQL")
      break
  }

  return adapterInstance
}

// Export singleton instance
// Note: This is initialized once when module loads
// On client side, it will use NEXT_PUBLIC_DB_PROVIDER env var
export const db = getDatabaseAdapter()

// Export type for convenience
export type { DatabaseAdapter }

