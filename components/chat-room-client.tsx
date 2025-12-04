"use client"

import React, { useState, useCallback, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ChatRoom } from "./chat-room"
import type { Message } from "./chat-messages"
import { toast } from 'sonner'

interface ChatRoomClientProps {
  id: string
  title: string
  imageUrl?: string
  messages: Message[]
  currentUserId: string
  isGroupChat?: boolean
  onOptimisticUpdate?: (msg: Message) => void
  onMessagesUpdate?: (messages: Message[]) => void
}

export default function ChatRoomClient({ 
  id, 
  title, 
  imageUrl, 
  messages, 
  currentUserId,
  isGroupChat = false,
  onOptimisticUpdate,
  onMessagesUpdate
}: ChatRoomClientProps) {
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderName: string } | null>(null)
  const queryClient = useQueryClient()

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, replyToId }: { content: string; replyToId?: string }) => {
      // Encrypt message content before sending
      let encryptedContent = content
      try {
        const { encrypt } = await import('@/lib/encryption')
        encryptedContent = encrypt(content, isGroupChat ? undefined : id, isGroupChat ? id : undefined)
      } catch {
        // Silently fail - send unencrypted if encryption fails
        encryptedContent = content
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: encryptedContent,
          senderId: currentUserId, 
          chatId: isGroupChat ? undefined : id,
          groupId: isGroupChat ? id : undefined,
          replyToId: replyToId
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to send message')
      }

      return res.json()
    },
    onSuccess: (newMessage) => {
      // Optimistically update the messages cache immediately
      const identifier = isGroupChat ? `group:${id}` : `chat:${id}`
      queryClient.setQueryData(['messages', identifier], (old: any[] = []) => {
        // Check if message already exists (from real-time subscription)
        const exists = old.some(m => m.id === newMessage.id)
        if (exists) return old
        return [...old, newMessage]
      })
      
      // Invalidate chats to update last message
      queryClient.invalidateQueries({ queryKey: ['chats', currentUserId] })
    },
    // Don't retry on error - show error immediately
    retry: false,
  })

  const handleSendMessage = useCallback(async (messageContent: string, replyToId?: string) => {
    try {
      await sendMessageMutation.mutateAsync({ content: messageContent, replyToId })
      // Clear reply state on success
      setReplyingTo(null)
    } catch (err) {
      console.error('Error sending message', err)
      toast.error('Failed to send message')
    }
  }, [sendMessageMutation])

  const handleReply = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (message) {
      setReplyingTo({
        id: messageId,
        content: message.content,
        senderName: message.sender.name
      })
    }
  }, [messages])

  const reactMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await fetch('/api/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      })
      
      if (!res.ok) {
        throw new Error('Failed to update reaction')
      }
      
      return res.json()
    },
    onSuccess: () => {
      // Invalidate messages query to refetch
      queryClient.invalidateQueries({ queryKey: ['messages', isGroupChat ? { groupId: id } : { chatId: id }] })
    },
  })

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    try {
      await reactMutation.mutateAsync({ messageId, emoji })
    } catch (err) {
      console.error('Error reacting to message', err)
      toast.error('Failed to update reaction')
    }
  }, [reactMutation])

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })
      
      if (!res.ok) {
        throw new Error('Failed to delete message')
      }
      
      return res.json()
    },
    onSuccess: () => {
      // Invalidate messages and chats queries
      queryClient.invalidateQueries({ queryKey: ['messages', isGroupChat ? { groupId: id } : { chatId: id }] })
      queryClient.invalidateQueries({ queryKey: ['chats', currentUserId] })
      toast.success('Message deleted')
    },
    onError: () => {
      toast.error('Failed to delete message')
    },
  })

  const handleDelete = useCallback(async (messageId: string) => {
    try {
      await deleteMessageMutation.mutateAsync(messageId)
    } catch (err) {
      console.error('Error deleting message', err)
    }
  }, [deleteMessageMutation])

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail
        if (!detail) return
        const msg: any = detail
        if (!msg) return
        if (msg.sender?.id === currentUserId) return
        // determine chat id
        const messageChatId = msg.chatId ?? msg.groupId ?? msg.chat?.id ?? msg.group?.id
        if (!messageChatId) return
        // if user is not currently in that chat, show a toast
        if (!window.location.pathname.includes(String(messageChatId))) {
          const text = msg.content?.slice(0, 120) ?? 'New message'
          toast(`${msg.sender?.name ?? 'Someone'}: ${text}`, {
            action: {
              label: 'Open',
              onClick: () => {
                window.location.href = `/chat/${messageChatId}`
              }
            }
          })
        }
      } catch (err) {
        console.error('Toast handler error', err)
      }
    }

    window.addEventListener('messages:received', handler as EventListener)
    return () => window.removeEventListener('messages:received', handler as EventListener)
  }, [currentUserId, id])

  return (
    <ChatRoom
      id={id}
      title={title}
      imageUrl={imageUrl}
      messages={messages}
      currentUserId={currentUserId}
      isGroupChat={isGroupChat}
      onSendMessage={handleSendMessage}
      replyingTo={replyingTo}
      onCancelReply={() => setReplyingTo(null)}
      onReply={handleReply}
      onReact={handleReact}
      onDelete={handleDelete}
      isSendingMessage={sendMessageMutation.isPending}
    />
  )
}
