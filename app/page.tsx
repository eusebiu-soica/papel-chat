"use client"

import { MessageCircle } from "lucide-react"

export default function Home() {
  return (
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
  );
}
