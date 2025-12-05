"use client"

import React, { useState, useCallback, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ChatRoom } from "./chat-room"
import type { Message } from "./chat-messages"
import { toast } from 'sonner'
import { db } from "@/lib/db/provider"
import { encrypt } from "@/lib/encryption"

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
        encryptedContent = encrypt(content, isGroupChat ? undefined : id, isGroupChat ? id : undefined)
      } catch {
        // Silently fail - send unencrypted if encryption fails
        encryptedContent = content
      }

      // Write directly to Firestore
      const message = await db.createMessage({
        content: encryptedContent,
        senderId: currentUserId,
        chatId: isGroupChat ? undefined : id,
        groupId: isGroupChat ? id : undefined,
        replyToId: replyToId || undefined,
      })

      return message
    },
    onSuccess: (newMessage) => {
      // Optimistically update the messages cache immediately
      // Note: newMessage.content is already decrypted (createMessage returns original content)
      const identifier = isGroupChat ? `group:${id}` : `chat:${id}`
      queryClient.setQueryData(['messages', identifier], (old: any[] = []) => {
        // Check if message already exists (from real-time subscription)
        const exists = old.some(m => m.id === newMessage.id)
        if (exists) {
          // If exists, update it but preserve decrypted content if subscription hasn't decrypted yet
          return old.map(m => {
            if (m.id === newMessage.id) {
              // Keep decrypted content from optimistic update
              return { ...m, content: newMessage.content }
            }
            return m
          })
        }
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
      try {
        await db.addReaction(messageId, currentUserId, emoji)
        return { success: true, action: 'added' }
      } catch (error: any) {
        // If error message indicates removal, that's fine (toggle behavior)
        if (error.message === 'Reaction removed') {
          return { success: true, action: 'removed' }
        }
        throw error
      }
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
      // Verify ownership first
      const messages = await db.getMessages({ 
        chatId: isGroupChat ? undefined : id, 
        groupId: isGroupChat ? id : undefined 
      })
      const message = messages.find(m => m.id === messageId)
      
      if (!message) {
        throw new Error('Message not found')
      }
      
      if (message.senderId !== currentUserId) {
        throw new Error('Unauthorized')
      }
      
      await db.deleteMessage(messageId)
      return { success: true }
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
