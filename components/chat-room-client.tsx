"use client"

import React, { useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ChatRoom } from "./chat-room"
import type { Message } from "./chat-messages"
import { toast } from 'sonner'
import { FirestoreAdapter } from "@/lib/db/firestore-adapter"
import type { ChatWithDetails, MessageWithDetails } from "@/lib/db/adapter"
import { Loader2 } from "lucide-react"

// Importuri pentru Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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
  
  // State pentru modalul de ștergere mesaj
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const [isDeletingMessage, setIsDeletingMessage] = useState(false)

  const queryClient = useQueryClient()
  
  const handleSendMessage = useCallback(async (messageContent: string, replyToId?: string) => {
    // 1. Optimistic Update (Instant)
    const tempId = Math.random().toString(36).substring(7);
    const now = new Date();
    
    const optimisticMsg: Message = {
      id: tempId,
      content: messageContent,
      timestamp: now.toISOString(),
      sender: {
        id: currentUserId,
        name: "Me", 
        avatar: undefined 
      },
      deletedForEveryone: false,
      reactions: [],
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        senderName: replyingTo.senderName
      } : undefined
    };

    if (onOptimisticUpdate) {
      onOptimisticUpdate(optimisticMsg);
    }
    
    setReplyingTo(null);

    // Actualizare Sidebar Instantanee
    queryClient.setQueryData<ChatWithDetails[]>(["chats", currentUserId], (oldChats) => {
      if (!oldChats) return oldChats;
      const updatedChats = [...oldChats];
      const chatIndex = updatedChats.findIndex(c => c.id === id);

      if (chatIndex !== -1) {
        const chatToUpdate = { ...updatedChats[chatIndex] };
        chatToUpdate.updatedAt = now;
        chatToUpdate.messages = [{
          id: tempId,
          content: messageContent,
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
      await adapter.createMessage({
        content: messageContent,
        senderId: currentUserId,
        chatId: isGroupChat ? undefined : id,
        groupId: isGroupChat ? id : undefined,
        replyToId: replyToId
      });
    } catch (err) {
      console.error('Error sending message', err);
      toast.error('Failed to send message');
      queryClient.invalidateQueries({ queryKey: ["chats", currentUserId] });
    }
  }, [id, currentUserId, isGroupChat, onOptimisticUpdate, queryClient, replyingTo]);

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
    const previousMessages = queryClient.getQueryData<any[]>(['messages', identifier]);

    queryClient.setQueryData(['messages', identifier], (old: any[] = []) => {
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
            queryClient.setQueryData(['messages', identifier], previousMessages);
         }
      }
    }
  }, [id, currentUserId, isGroupChat, queryClient]);

  // Funcția declanșată când apeși "Delete" din meniul mesajului
  const handleRequestDelete = useCallback((messageId: string) => {
    setMessageToDelete(messageId) // Doar deschidem modalul
  }, [])

  // Funcția care execută efectiv ștergerea (apelată din modal)
  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return

    try {
      setIsDeletingMessage(true)
      const identifier = isGroupChat ? `group:${id}` : `chat:${id}`
      
      // Optimistic delete
      queryClient.setQueryData(['messages', identifier], (old: any[] = []) => {
        return old.map(msg => {
          if (msg.id === messageToDelete) {
            return { ...msg, deletedForEveryone: true, content: '' };
          }
          return msg;
        });
      });

      await adapter.deleteMessage(messageToDelete)
      setMessageToDelete(null) // Închidem modalul
    } catch (err) {
      console.error('Error deleting message', err)
      toast.error('Failed to delete message')
      // Rollback logic could be added here
    } finally {
      setIsDeletingMessage(false)
    }
  }

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
        onDelete={handleRequestDelete} // Folosim noua funcție care deschide modalul
        isSendingMessage={false}
      />

      {/* MODAL CONFIRMARE ȘTERGERE MESAJ */}
      <Dialog open={!!messageToDelete} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? <br /> This will remove it for everyone in the chat.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-1">
            <Button 
              variant="ghost" 
              onClick={() => setMessageToDelete(null)}
              disabled={isDeletingMessage}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteMessage}
              disabled={isDeletingMessage}
            >
              {isDeletingMessage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete for Everyone"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}