import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST() {
  try {
    // 1. Verificăm identitatea cu Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Generăm un Custom Token pentru Firebase
    // Acest token îi spune lui Firebase: "Acesta este userul X, ai încredere în el"
    const firebaseToken = await adminAuth.createCustomToken(userId);

    return NextResponse.json({ token: firebaseToken });
  } catch (error) {
    console.error("Error minting token:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}