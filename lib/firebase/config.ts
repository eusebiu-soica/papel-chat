// Firebase configuration and initialization (reads values from env)
import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAnalytics, Analytics } from "firebase/analytics"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
}

// Helpful warning for missing env vars
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('Firebase env vars appear to be missing. Please add NEXT_PUBLIC_FIREBASE_* variables to your .env.local')
}

let app: FirebaseApp
let analytics: Analytics | null = null

try {
  if (typeof window !== "undefined") {
    // Client: initialize once
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)

      try {
        analytics = getAnalytics(app)
      } catch (err) {
        console.warn("Firebase Analytics initialization failed:", err)
      }
    } else {
      app = getApps()[0]
    }
  } else {
    // Server-side: still initialize a lightweight app if env present (safe no-ops)
    if (firebaseConfig.projectId) {
      app = initializeApp(firebaseConfig)
    } else {
      // Create a dummy object to avoid undefined exports in server builds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      app = {} as any
    }
  }
} catch (error) {
  console.error("❌ Firebase initialization error:", error)
  console.error("\n📋 To fix this:")
  console.error("1. Add NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID and related vars to your .env.local")
  console.error("2. See FIREBASE_SETUP.md for detailed instructions")
  console.error("\n⚠️  Falling back to Prisma adapter...")
  throw error
}

export { app, analytics }

