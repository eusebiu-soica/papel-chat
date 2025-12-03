"use client"

import React, { useState, useCallback } from "react"
import { ChatRoom } from "./chat-room"
import type { Message } from "./chat-messages"

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

  const handleSendMessage = useCallback(async (messageContent: string, replyToId?: string) => {
    // Create optimistic message immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimisticMsg: Message = {
      id: tempId,
      content: messageContent,
      timestamp: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: "You",
        avatar: undefined 
      },
      replyTo: replyToId ? messages.find(m => m.id === replyToId) ? {
        id: replyToId,
        content: messages.find(m => m.id === replyToId)!.content,
        senderName: messages.find(m => m.id === replyToId)!.sender.name
      } : undefined : undefined
    }

    // Show immediately
    if (onOptimisticUpdate) {
      onOptimisticUpdate(optimisticMsg)
    }

    try {
      // Encrypt message content before sending (with chat-specific key)
      let encryptedContent = messageContent
      try {
        const { encrypt } = require('@/lib/encryption')
        encryptedContent = encrypt(messageContent, isGroupChat ? undefined : id, isGroupChat ? id : undefined)
      } catch (error) {
        // Silently fail - send unencrypted if encryption fails
        encryptedContent = messageContent
      }
      
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: encryptedContent, // Send encrypted
          senderId: currentUserId, 
          chatId: isGroupChat ? undefined : id,
          groupId: isGroupChat ? id : undefined,
          replyToId: replyToId
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('Failed to send message', res.status, text)
        // Remove optimistic message on error
        if (onMessagesUpdate) {
          onMessagesUpdate(messages.filter(m => m.id !== tempId))
        }
        return
      }

      const newMessage = await res.json()
      
      // Replace optimistic message with real one immediately
      if (onMessagesUpdate) {
        onMessagesUpdate(
          messages.map(m => m.id === tempId ? {
            id: newMessage.id,
            content: newMessage.content,
            timestamp: newMessage.createdAt,
            sender: {
              id: newMessage.sender.id,
              name: newMessage.sender.name,
              avatar: newMessage.sender.avatar
            },
            replyTo: newMessage.replyTo ? {
              id: newMessage.replyTo.id,
              content: newMessage.replyTo.content,
              senderName: newMessage.replyTo.sender.name
            } : undefined,
            reactions: newMessage.reactions || [],
            deletedForEveryone: false
          } : m)
        )
      }

      // Real-time subscription will automatically update chats
      // No need to manually refresh
      
    } catch (err) {
      console.error('Error sending message', err)
      // Remove optimistic message on error
      if (onMessagesUpdate) {
        onMessagesUpdate(messages.filter(m => m.id !== tempId))
      }
    }
  }, [id, currentUserId, messages, isGroupChat, onOptimisticUpdate, onMessagesUpdate])

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

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    // Optimistic update: toggle reaction immediately
    if (onMessagesUpdate) {
      const message = messages.find(m => m.id === messageId)
      if (message) {
        const currentReactions = message.reactions || []
        const existingReaction = currentReactions.find(r => r.emoji === emoji && r.userId === currentUserId)
        
        let updatedReactions: typeof currentReactions
        if (existingReaction) {
          // Remove reaction
          updatedReactions = currentReactions.filter(r => !(r.emoji === emoji && r.userId === currentUserId))
        } else {
          // Add reaction
          updatedReactions = [...currentReactions, { emoji, userId: currentUserId }]
        }

        onMessagesUpdate(
          messages.map(m => 
            m.id === messageId 
              ? { ...m, reactions: updatedReactions }
              : m
          )
        )
      }
    }

    try {
      const res = await fetch('/api/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      })
      
      if (res.ok) {
        // Refresh to get server state (for other users' reactions)
        window.dispatchEvent(new CustomEvent('messages:refresh'))
      } else {
        // Revert on error
        if (onMessagesUpdate) {
          const originalMessage = messages.find(m => m.id === messageId)
          if (originalMessage) {
            onMessagesUpdate(
              messages.map(msg => 
                msg.id === messageId ? originalMessage : msg
              )
            )
          }
        }
      }
    } catch (err) {
      console.error('Error reacting to message', err)
      // Revert on error
      if (onMessagesUpdate) {
        const originalMessage = messages.find(m => m.id === messageId)
        if (originalMessage) {
          onMessagesUpdate(
            messages.map(msg => 
              msg.id === messageId ? originalMessage : msg
            )
          )
        }
      }
    }
  }, [messages, currentUserId, onMessagesUpdate])

  const handleDelete = useCallback(async (messageId: string) => {
    // Optimistic update: immediately mark as deleted
    if (onMessagesUpdate) {
      onMessagesUpdate(
        messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, deletedForEveryone: true, content: '' }
            : msg
        )
      )
    }

    try {
      const res = await fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })
      
      if (res.ok) {
        // Real-time subscriptions will automatically update messages and chats
      } else {
        // Revert on error
        if (onMessagesUpdate) {
          const originalMessage = messages.find(m => m.id === messageId)
          if (originalMessage) {
            onMessagesUpdate(
              messages.map(msg => 
                msg.id === messageId ? originalMessage : msg
              )
            )
          }
        }
      }
    } catch (err) {
      console.error('Error deleting message', err)
      // Revert on error
      if (onMessagesUpdate) {
        const originalMessage = messages.find(m => m.id === messageId)
        if (originalMessage) {
          onMessagesUpdate(
            messages.map(msg => 
              msg.id === messageId ? originalMessage : msg
            )
          )
        }
      }
    }
  }, [messages, onMessagesUpdate])

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
    />
  )
}
