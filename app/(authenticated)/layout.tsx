"use client"

import { SignedIn } from "@clerk/nextjs"
import Sidebar from "@/components/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { usePathname } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { useChat } from "@/lib/context/chat-context"
import AddNew from "@/components/add-new"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { chats } = useChat()
  const isHomePage = pathname === '/'
  const hasChats = chats && chats.length > 0

  return (
    <SignedIn>
      <div className="font-sans flex flex-row h-screen overflow-hidden w-full">
        {/* Desktop sidebar */}
        <div className="hidden md:block md:flex-shrink-0 border-r border-border">
          <Sidebar />
        </div>

        {/* Mobile: Show sidebar on home, chat content on chat pages */}
        <div className="md:hidden w-full h-full">
          {children}
        </div>

        {/* Desktop: Show chat content or welcome message */}
        <Card className="hidden md:flex flex-1 flex-col py-0 rounded-none border-none min-w-0 w-full h-full">
          <CardContent className={"flex-1 min-h-0 space-y-2 w-full overflow-hidden px-0 h-full"}>
            {isHomePage ? (
              // Welcome message on home page
              <div className="flex h-full flex-col items-center justify-center gap-4 sm:gap-6 px-4">
                {hasChats ? (
                  <>
                    <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-3 sm:p-4">
                      <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                    </div>
                    <div className="space-y-2 text-center">
                      <h1 className="text-2xl sm:text-3xl font-bold">Welcome to Papel Chat</h1>
                      <p className="text-base sm:text-lg text-muted-foreground">Select a chat from the sidebar to start messaging</p>
                    </div>
                    <div className="max-w-sm space-y-2 sm:space-y-3 text-center text-xs sm:text-sm text-muted-foreground">
                      <p>✨ Pick a conversation from the list on the left</p>
                      <p>💬 Or start a new chat with someone you know</p>
                      <p>🎯 Your messages will appear here</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-3 sm:p-4">
                      <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                    </div>
                    <div className="space-y-2 text-center">
                      <h1 className="text-2xl sm:text-3xl font-bold">Welcome to Papel Chat</h1>
                      <p className="text-base sm:text-lg text-muted-foreground">Get started by creating your first chat</p>
                    </div>
                    <div className="flex justify-center">
                      <AddNew />
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Chat content on chat pages
              children
            )}
          </CardContent>
        </Card>
      </div>
    </SignedIn>
  )
}

