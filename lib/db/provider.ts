// Database provider factory - switch between Firebase and Prisma
import { DatabaseAdapter } from "./adapter"
import { FirestoreAdapter } from "./firestore-adapter"

let adapterInstance: DatabaseAdapter | null = null

export function getDatabaseAdapter(): DatabaseAdapter {
  if (adapterInstance) {
    return adapterInstance
  }

  adapterInstance = new FirestoreAdapter()
  console.log("📦 Using Firebase Firestore Database")
  console.log(
    "📦 Adapter has subscribeToChats:",
    typeof (adapterInstance as any).subscribeToChats === "function"
  )

  return adapterInstance
}

// Export singleton instance
// Note: This is initialized once when module loads
// On client side, it will use NEXT_PUBLIC_DB_PROVIDER env var
export const db = getDatabaseAdapter()

// Export type for convenience
export type { DatabaseAdapter }

