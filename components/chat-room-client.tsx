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
  onOptimisticUpdate?: (msg: Message) => void
}

export default function ChatRoomClient({ 
  id, 
  title, 
  imageUrl, 
  messages, 
  currentUserId,
  onOptimisticUpdate 
}: ChatRoomClientProps) {
  
  const handleSendMessage = async (messageContent: string) => {
    // 1. Creăm un mesaj temporar (Optimistic UI)
    const tempId = Math.random().toString(36).substring(7)
    const optimisticMsg: Message = {
      id: tempId,
      content: messageContent,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      sender: {
        id: currentUserId,
        name: "Me", // Va fi actualizat la refresh
        avatar: undefined 
      }
    }

    // 2. Îl afișăm INSTANT în interfață
    if (onOptimisticUpdate) {
      onOptimisticUpdate(optimisticMsg)
    }

    try {
      // 3. Trimitem la server în fundal
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            content: messageContent, 
            senderId: currentUserId, 
            chatId: id 
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('Failed to send message', res.status, text)
        // Aici ai putea adăuga logică de afișare eroare (ex: toast)
        return
      }

      // 4. Actualizăm lista de chat-uri din stânga în fundal
      window.dispatchEvent(new CustomEvent('chats:refresh'))
      
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