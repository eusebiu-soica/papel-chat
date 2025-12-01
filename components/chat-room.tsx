"use client"

import ChatHeader from "./chat-header"
import { ChatInput } from "./chat-input"
import { ChatMessages, type Message } from "./chat-messages"

interface ChatRoomProps {
  id: string
  title: string
  imageUrl?: string
  messages: Message[]
  currentUserId: string
  onSendMessage: (message: string) => void
}

export function ChatRoom({
  id,
  title,
  imageUrl,
  messages,
  currentUserId,
  onSendMessage,
}: ChatRoomProps) {
  return (
    <div className="flex flex-1 min-h-0 w-full h-full flex-col">
      <ChatHeader title={title} imageUrl={imageUrl} />

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ChatMessages
          messages={messages}
          currentUserId={currentUserId}
          className="h-full"
        />
      </div>

      <div className="flex-shrink-0">
        <ChatInput onSendMessage={onSendMessage} />
      </div>
    </div>
  )
}