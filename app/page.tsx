"use client"

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <SignedOut>
        <div className="flex h-screen flex-col items-center justify-center gap-8 px-4">
          <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-6">
            <MessageCircle className="h-16 w-16 text-white" />
          </div>
          <div className="space-y-4 text-center max-w-md">
            <h1 className="text-4xl font-bold">Welcome to Papel Chat</h1>
            <p className="text-lg text-muted-foreground">
              Connect with friends and colleagues through secure, real-time messaging
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <SignInButton mode="modal">
              <Button size="lg" className="min-w-[140px]">
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="lg" variant="outline" className="min-w-[140px]">
                Sign Up
              </Button>
            </SignUpButton>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="font-sans flex flex-row min-h-screen">
          <Sidebar />
          <Card className="flex-1 flex flex-col p-3 px-8 rounded-none border-none">
            <CardContent className={"flex-1 min-h-0 space-y-2 w-full overflow-hidden px-0"}>
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-4">
                  <MessageCircle className="h-12 w-12 text-white" />
                </div>
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-bold">Welcome to Papel Chat</h1>
                  <p className="text-lg text-muted-foreground">Select a chat from the sidebar to start messaging</p>
                </div>
                <div className="max-w-sm space-y-3 text-center text-sm text-muted-foreground">
                  <p>✨ Pick a conversation from the list on the left</p>
                  <p>💬 Or start a new chat with someone you know</p>
                  <p>🎯 Your messages will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SignedIn>
    </div>
  )
}
