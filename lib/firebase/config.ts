// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAnalytics, Analytics } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyATSnRQvpBKcGRvaeu_aQ7mlKg_Y6uAeSI",
  authDomain: "papel-chat-38e47.firebaseapp.com",
  projectId: "papel-chat-38e47",
  storageBucket: "papel-chat-38e47.firebasestorage.app",
  messagingSenderId: "873289859248",
  appId: "1:873289859248:web:62465353c220b630257b75",
  measurementId: "G-7T91C3MWVJ",
  // Note: Firestore doesn't need databaseURL, it uses projectId
}

// Initialize Firebase
let app: FirebaseApp
let analytics: Analytics | null = null

try {
  if (typeof window !== "undefined") {
    // Only initialize on client side
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
      
      // Only initialize analytics in browser
      try {
        analytics = getAnalytics(app)
      } catch (err) {
        console.warn("Firebase Analytics initialization failed:", err)
      }
    } else {
      app = getApps()[0]
    }
  } else {
    // Server-side: create a minimal app instance
    app = initializeApp(firebaseConfig)
  }
} catch (error) {
  console.error("❌ Firebase initialization error:", error)
  console.error("\n📋 To fix this:")
  console.error("1. Go to https://console.firebase.google.com/")
  console.error("2. Select your project: papel-chat-38e47")
  console.error("3. Make sure Firestore Database is enabled")
  console.error("4. See FIREBASE_SETUP.md for detailed instructions")
  console.error("\n⚠️  Falling back to Prisma adapter...")
  throw error
}

export { app, analytics }

