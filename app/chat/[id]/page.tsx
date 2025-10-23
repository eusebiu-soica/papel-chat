"use client"

import { ChatRoom } from "@/components/chat-room"

// This would typically come from your database or API
const MOCK_MESSAGES = [
  {
    id: "1",
    content: "Hey there! How's it going?",
    timestamp: "10:00 AM",
    sender: {
      id: "other-user",
      name: "John Doe",
      avatar: "https://avatar.vercel.sh/johndoe",
    },
  },
  {
    id: "2",
    content: "Hi! I'm doing great, thanks for asking. How about you?",
    timestamp: "10:01 AM",
    sender: {
      id: "current-user",
      name: "Current User",
      avatar: "https://avatar.vercel.sh/currentuser",
    },
  },
]

export default function Page({ params }: { params: { id: string } }) {
  const handleSendMessage = (message: string) => {
    // Here you would typically send the message to your backend
    console.log("Sending message:", message)
  }

  return (
    <ChatRoom
      id={params.id}
      title="Chat with John Doe"
      messages={MOCK_MESSAGES}
      currentUserId="current-user"
      onSendMessage={handleSendMessage}
    />
  )
}