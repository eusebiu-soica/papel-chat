import ChatHeader from "./chat-header"
import { ChatInput } from "./chat-input"
import { ChatMessages, type Message } from "./chat-messages"

interface ChatRoomProps {
  id: string
  title: string
  messages: Message[]
  currentUserId: string
  onSendMessage: (message: string) => void
}

export function ChatRoom({
  id,
  title,
  messages,
  currentUserId,
  onSendMessage,
}: ChatRoomProps) {
  return (
    <div className="flex h-full flex-col">
      <ChatHeader title={title} />
      <ChatMessages
        messages={messages}
        currentUserId={currentUserId}
        className="flex-1"
      />
      <ChatInput onSendMessage={onSendMessage} />
    </div>
  )
}