// Firebase configuration and initialization (reads values from env)
import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAnalytics, Analytics } from "firebase/analytics"
import { getAuth, Auth } from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
}

// Check if Firebase is properly configured
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId

// Helpful warning for missing env vars (only in development)
if (!isFirebaseConfigured && typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  console.warn('⚠️ Firebase env vars appear to be missing. Please add NEXT_PUBLIC_FIREBASE_* variables to your .env.local')
}

let app: FirebaseApp | null = null
let analytics: Analytics | null = null
let auth: Auth | null = null

// Only initialize Firebase if properly configured
if (isFirebaseConfigured) {
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
        
        auth = getAuth(app)
      } else {
        app = getApps()[0]
        auth = getAuth(app)
      }
    } else {
      // Server-side: initialize if env present
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig)
        auth = getAuth(app)
      } else {
        app = getApps()[0]
        auth = getAuth(app)
      }
    }
  } catch (error) {
    console.error("❌ Firebase initialization error:", error)
    if (process.env.NODE_ENV !== "production") {
      console.error("\n📋 To fix this:")
      console.error("1. Add NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID and related vars to your .env.local")
      console.error("2. See FIREBASE_SETUP.md for detailed instructions")
    }
    // Don't throw - allow app to continue without Firebase
    app = null
    auth = null
    analytics = null
  }
} else {
  // Firebase not configured - create safe null exports
  if (process.env.NODE_ENV !== "production") {
    console.warn("⚠️ Firebase not configured. Some features may not work.")
  }
}

// Export with null safety - components should check for null before using
export { app, analytics, auth }

