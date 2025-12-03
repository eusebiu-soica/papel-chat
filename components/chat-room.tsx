"use client"

import ChatHeader from "./chat-header"
import { ChatInput } from "./chat-input"
import { ChatMessages, type Message } from "./chat-messages"
import { toast } from 'sonner'

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

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Invite link copied to clipboard')
    } catch (err) {
      console.error('Copy failed', err)
      toast.error('Could not copy link')
    }
  }

  const handleShareInvite = async () => {
    try {
      const url = window.location.href
      if (navigator.share) {
        await navigator.share({ title: `Join chat: ${title}`, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Invite link copied to clipboard')
      }
    } catch (err) {
      console.error('Share failed', err)
      toast.error('Could not share link')
    }
  }

  return (
    <div className="flex flex-1 min-h-0 w-full h-full flex-col bg-background">
      <ChatHeader title={title} imageUrl={imageUrl} />

      <div className="flex-1 min-h-0 overflow-hidden relative">
        {messages.length === 0 && (
          <div className="p-4 bg-muted/40 border-b border-border text-sm text-foreground flex flex-col gap-3">
            <div className="max-w-2xl">
              <strong>Waiting for someone to join?</strong>
              <p className="mt-2 text-sm text-muted-foreground">
                This chat looks empty — share the chat link with the person you want to invite. You can copy the link or use your device's share dialog.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopyInvite} className="btn inline-flex items-center px-3 py-1 rounded bg-primary text-white">Copy Invite Link</button>
              <button onClick={handleShareInvite} className="btn inline-flex items-center px-3 py-1 rounded border">Share</button>
            </div>
          </div>
        )}
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
