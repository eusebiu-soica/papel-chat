"use client"

import ChatHeader from "./chat-header"
import { ChatInput } from "./chat-input"
import { ChatMessages, type Message } from "./chat-messages"
import { toast } from 'sonner'
import { useIsMobile } from "@/hooks/use-mobile"

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
  isSendingMessage?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
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
  isSendingMessage = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: ChatRoomProps) {
  const isMobile = useIsMobile()
  
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
    <div className="flex flex-1 min-h-0 w-full h-full flex-col bg-background overflow-hidden">
      {/* Hide header on mobile - back button bar handles it */}
      {!isMobile && <ChatHeader title={title} imageUrl={imageUrl} />}

      <div className="flex-1 min-h-0 overflow-hidden relative">
        {messages.length === 0 && (
          <div className="p-3 sm:p-4 bg-muted/40 border-b border-border text-xs sm:text-sm text-foreground flex flex-col gap-2 sm:gap-3">
            <div className="max-w-2xl mx-auto w-full">
              <strong className="text-sm sm:text-base block mb-1 sm:mb-2">Waiting for someone to join?</strong>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                This chat looks empty — share the chat link with the person you want to invite. You can copy the link or use your device's share dialog.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto w-full">
              <button 
                onClick={handleCopyInvite} 
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium touch-manipulation active:scale-95 transition-transform min-h-[44px]"
              >
                Copy Invite Link
              </button>
              <button 
                onClick={handleShareInvite} 
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2.5 rounded-md border border-border bg-background text-sm font-medium touch-manipulation active:scale-95 transition-transform min-h-[44px]"
              >
                Share
              </button>
            </div>
          </div>
        )}
        <ChatMessages
          messages={messages}
          currentUserId={currentUserId}
          isGroupChat={isGroupChat}
          className="h-full"
          chatId={isGroupChat ? null : id}
          groupId={isGroupChat ? id : null}
          onReply={onReply}
          onReact={onReact}
          onDelete={onDelete}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
      </div>

      <div className="flex-shrink-0 border-t border-border sticky bottom-0 z-30 bg-background">
        <ChatInput 
          onSendMessage={handleSend}
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
          isLoading={isSendingMessage}
        />
      </div>
    </div>
  )
}
