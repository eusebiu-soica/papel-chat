import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function POST() {
  try {
    // 1. Verificăm identitatea cu Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get adminAuth (lazy initialization)
    const adminAuth = getAdminAuth();
    
    if (!adminAuth) {
      console.error("Firebase Admin not initialized. Check environment variables.");
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 503 }
      );
    }

    // 3. Generăm un Custom Token pentru Firebase
    // Acest token îi spune lui Firebase: "Acesta este userul X, ai încredere în el"
    const firebaseToken = await adminAuth.createCustomToken(userId);

    return NextResponse.json({ token: firebaseToken });
  } catch (error) {
    console.error("Error minting token:", error);
    return NextResponse.json(
      { error: "Internal Error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}