"use client"

import React, { useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ChatRoom } from "./chat-room"
import type { Message } from "./chat-messages"
import { toast } from 'sonner'
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"
import type { ChatWithDetails, MessageWithDetails } from "@/lib/db/adapter"

interface FileData {
  dataUri: string
  fileName: string
  fileType: string
  fileSize: number
  width?: number
  height?: number
}

const adapter = new FirestoreAdapter();

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
  onOptimisticUpdate
}: ChatRoomClientProps) {
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderName: string } | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const queryClient = useQueryClient()

  const handleSendMessage = useCallback(async (messageContent: string, replyToId?: string, fileData?: FileData | null) => {
    // 1. Optimistic Update (Instant) - Add to messages list immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date();
    const identifier = isGroupChat ? `group:${id}` : `chat:${id}`
    
    // For backward compatibility, convert fileData to imageUrl if it's an image
    const imageUrl = fileData?.fileType.startsWith('image/') ? fileData.dataUri : null
    
    const optimisticMsg: Message = {
      id: tempId,
      content: messageContent,
      imageUrl: imageUrl || null,
      fileData: fileData || null,
      timestamp: now.toISOString(),
      sender: {
        id: currentUserId,
        name: "Me", 
        avatar: undefined 
      },
      deletedForEveryone: false,
      reactions: [],
      status: 'sending', // Mark as sending
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        senderName: replyingTo.senderName
      } : undefined
    };

    // Update messages cache immediately
    queryClient.setQueryData<MessageWithDetails[]>(['messages', identifier, 'initial'], (old: any[] = []) => {
      // Check if temp message already exists
      const exists = old.some(m => m.id === tempId)
      if (exists) return old
      return [...old, optimisticMsg as any]
    })
    
    setReplyingTo(null);

    // Actualizare Sidebar Instantanee (decrypted content)
    queryClient.setQueryData<ChatWithDetails[]>(["chats", currentUserId], (oldChats) => {
      if (!oldChats) return oldChats;
      const updatedChats = [...oldChats];
      const chatIndex = updatedChats.findIndex(c => c.id === id);

      if (chatIndex !== -1) {
        const chatToUpdate = { ...updatedChats[chatIndex] };
        chatToUpdate.updatedAt = now;
        // Use decrypted content directly
        chatToUpdate.messages = [{
          id: tempId,
          content: messageContent, // Decrypted content
          senderId: currentUserId,
          createdAt: now,
          updatedAt: now,
          chatId: isGroupChat ? null : id,
          groupId: isGroupChat ? id : null,
          deletedForEveryone: false,
          reactions: [],
          replyToId: replyToId || null,
          sender: undefined,
          replyTo: null
        } as MessageWithDetails];
        updatedChats.splice(chatIndex, 1);
        updatedChats.unshift(chatToUpdate);
        return updatedChats;
      }
      return oldChats;
    });

    try {
      // Send to Firebase
      // Store file data: imageUrl contains the data URI, fileMetadata contains JSON metadata
      const fileDataUri = fileData?.dataUri || imageUrl || null
      const fileMetadataJson = fileData ? JSON.stringify({
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize,
        width: fileData.width,
        height: fileData.height
      }) : null
      
      const createdMessage = await adapter.createMessage({
        content: messageContent,
        senderId: currentUserId,
        chatId: isGroupChat ? undefined : id,
        groupId: isGroupChat ? id : undefined,
        replyToId: replyToId,
        imageUrl: fileDataUri,
        fileMetadata: fileMetadataJson
      });
      
      // Add fileData to the created message for display
      if (fileData) {
        (createdMessage as any).fileData = fileData
      }

      // Update the temp message with real message data and mark as sent
      queryClient.setQueryData<MessageWithDetails[]>(['messages', identifier, 'initial'], (old: any[] = []) => {
        return old.map(msg => {
          if (msg.id === tempId) {
            // Replace temp message with real one, mark as sent
            const updatedMsg = {
              ...createdMessage,
              status: 'sent'
            } as any
            // Preserve fileData if it was set optimistically
            if (fileData) {
              updatedMsg.fileData = fileData
            }
            return updatedMsg
          }
          return msg
        })
      })
      
      // Also update sidebar to use real message (decrypted)
      queryClient.setQueryData<ChatWithDetails[]>(["chats", currentUserId], (oldChats) => {
        if (!oldChats) return oldChats
        return oldChats.map(chat => {
          if (chat.id === id && chat.messages?.[0]?.id === tempId) {
            return {
              ...chat,
              messages: [{
                ...createdMessage,
                content: messageContent // Keep decrypted content
              }]
            }
          }
          return chat
        })
      })
    } catch (err) {
      console.error('Error sending message', err);
      toast.error('Failed to send message');
      
      // Mark message as error
      queryClient.setQueryData<MessageWithDetails[]>(['messages', identifier, 'initial'], (old: any[] = []) => {
        return old.map(msg => {
          if (msg.id === tempId) {
            return { ...msg, status: 'error' } as any
          }
          return msg
        })
      })
      
      queryClient.invalidateQueries({ queryKey: ["chats", currentUserId] });
    }
  }, [id, currentUserId, isGroupChat, queryClient, replyingTo]);

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
    const identifier = isGroupChat ? `group:${id}` : `chat:${id}`
    const previousMessages = queryClient.getQueryData<any[]>(['messages', identifier, 'initial']);

    queryClient.setQueryData(['messages', identifier, 'initial'], (old: any[] = []) => {
      return old.map(msg => {
        if (msg.id === messageId) {
          const existingReaction = msg.reactions?.find((r: any) => r.userId === currentUserId && r.emoji === emoji);
          let newReactions = [...(msg.reactions || [])];
          
          if (existingReaction) {
            newReactions = newReactions.filter(r => r !== existingReaction);
          } else {
            newReactions.push({
              id: 'temp-' + Date.now(),
              userId: currentUserId,
              emoji,
              createdAt: new Date()
            });
          }
          return { ...msg, reactions: newReactions };
        }
        return msg;
      });
    });

    try {
      await adapter.addReaction(messageId, currentUserId, emoji);
    } catch (err: any) {
      if (err.message !== 'Reaction removed') {
         console.error('Error reacting', err);
         if (previousMessages) {
            queryClient.setQueryData(['messages', identifier, 'initial'], previousMessages);
         }
      }
    }
  }, [id, currentUserId, isGroupChat, queryClient]);

  // Funcția care execută ștergerea direct (fără modal)
  const handleRequestDelete = useCallback(async (messageId: string) => {
    try {
      const identifier = isGroupChat ? `group:${id}` : `chat:${id}`
      
      // Optimistic delete
      queryClient.setQueryData(['messages', identifier, 'initial'], (old: any[] = []) => {
        return old.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, deletedForEveryone: true, content: '' };
          }
          return msg;
        });
      });

      await adapter.deleteMessage(messageId)
    } catch (err) {
      console.error('Error deleting message', err)
      toast.error('Failed to delete message')
    }
  }, [id, isGroupChat, queryClient])

  // Load more messages when scrolling up
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return
    
    setIsLoadingMore(true)
    try {
      const identifier = isGroupChat ? `group:${id}` : `chat:${id}`
      const oldestMessage = messages[0]
      
      if (!oldestMessage) {
        setHasMore(false)
        return
      }

      const oldestDate = oldestMessage.timestamp ? new Date(oldestMessage.timestamp) : new Date()
      
      // Fetch 20 more messages before the oldest one
      const moreMessages = await adapter.getMessages({
        chatId: isGroupChat ? undefined : id,
        groupId: isGroupChat ? id : undefined,
        before: oldestDate.toISOString(),
        limit: 20
      })

      if (moreMessages.length < 20) {
        setHasMore(false)
      }

      // Merge with existing messages
      queryClient.setQueryData<MessageWithDetails[]>(['messages', identifier, 'initial'], (old: any[] = []) => {
        const messageMap = new Map<string, any>()
        
        // Add existing messages
        old.forEach(msg => messageMap.set(msg.id, msg))
        
        // Add new messages
        moreMessages.forEach(msg => {
          if (!messageMap.has(msg.id)) {
            messageMap.set(msg.id, msg)
          }
        })
        
        // Return sorted array (oldest first)
        return Array.from(messageMap.values()).sort((a, b) => {
          const timeA = new Date(a.timestamp || a.createdAt).getTime()
          const timeB = new Date(b.timestamp || b.createdAt).getTime()
          return timeA - timeB
        })
      })
    } catch (err) {
      console.error('Error loading more messages', err)
      toast.error('Failed to load more messages')
    } finally {
      setIsLoadingMore(false)
    }
  }, [id, isGroupChat, messages, isLoadingMore, hasMore, queryClient])

  return (
    <>
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
      onDelete={handleRequestDelete}
      isSendingMessage={false}
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
    />
    </>
  )
}