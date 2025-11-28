"use client"

import React from "react"
import { ChatRoom } from "./chat-room"
import type { Message } from "./chat-messages"

interface ChatRoomClientProps {
  id: string
  title: string
  imageUrl?: string
  messages: Message[]
  currentUserId: string
}

export default function ChatRoomClient({ id, title, imageUrl, messages, currentUserId }: ChatRoomClientProps) {
  const handleSendMessage = async (message: string) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message, senderId: currentUserId, chatId: id }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('Failed to send message', res.status, text)
        return
      }

      // Optionally update optimistic UI here. We intentionally avoid noisy logs in production.
    } catch (err) {
      console.error('Error sending message', err)
    }
  }

  return (
    <ChatRoom
      id={id}
      title={title}
      imageUrl={imageUrl}
      messages={messages}
      currentUserId={currentUserId}
      onSendMessage={handleSendMessage}
    />
  )
}
