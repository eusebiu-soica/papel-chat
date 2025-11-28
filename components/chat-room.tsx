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
    <div className="flex h-screen w-full flex-col">
      <ChatHeader title={title} imageUrl={imageUrl} />

      <div className="flex-1 overflow-hidden">
        <ChatMessages
          messages={messages}
          currentUserId={currentUserId}
          className="flex-1 bg-transparent"
        />
      </div>

      <ChatInput onSendMessage={onSendMessage} />
    </div>
  )
}