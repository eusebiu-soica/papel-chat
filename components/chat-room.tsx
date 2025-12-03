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
  isGroupChat?: boolean
  onSendMessage: (message: string, replyToId?: string) => void
  replyingTo?: { id: string; content: string; senderName: string } | null
  onCancelReply?: () => void
  onReply?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
}

export function ChatRoom({
  id,
  title,
  imageUrl,
  messages,
  currentUserId,
  isGroupChat = false,
  onSendMessage,
  replyingTo,
  onCancelReply,
  onReply,
  onReact,
  onDelete,
}: ChatRoomProps) {
  const handleSend = (content: string) => {
    onSendMessage(content, replyingTo?.id)
    onCancelReply?.()
  }

  return (
    <div className="flex flex-1 min-h-0 w-full h-full flex-col bg-background">
      <ChatHeader title={title} imageUrl={imageUrl} />

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ChatMessages
          messages={messages}
          currentUserId={currentUserId}
          isGroupChat={isGroupChat}
          className="h-full"
          onReply={onReply}
          onReact={onReact}
          onDelete={onDelete}
        />
      </div>

      <div className="flex-shrink-0 border-t border-border">
        <ChatInput 
          onSendMessage={handleSend}
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
        />
      </div>
    </div>
  )
}
