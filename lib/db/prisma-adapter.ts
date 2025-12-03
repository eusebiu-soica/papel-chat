// Prisma adapter implementation (refactored from existing code)
import { DatabaseAdapter, ChatWithDetails, MessageWithDetails, GroupWithDetails } from "./adapter"
import prisma from "@/lib/prisma"

export class PrismaAdapter implements DatabaseAdapter {
  // User operations
  async getUserByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    })
    return user
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    })
    return user
  }

  async createUser(data: { email: string; name: string; avatar?: string }) {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        avatar: data.avatar,
      },
    })
    return user
  }

  // Chat operations
  async getChatsByUserId(userId: string): Promise<ChatWithDetails[]> {
    const chats = await prisma.chat.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      include: {
        user1: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
        user2: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
            replyTo: {
              include: {
                sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
              },
            },
            reactions: {
              include: {
                user: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return chats.map(chat => ({
      id: chat.id,
      userId1: chat.userId1,
      userId2: chat.userId2,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      user1: chat.user1,
      user2: chat.user2,
      messages: chat.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        chatId: msg.chatId,
        groupId: msg.groupId,
        replyToId: msg.replyToId,
        deletedForEveryone: msg.deletedForEveryone,
        deletedAt: msg.deletedAt,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        sender: msg.sender,
        replyTo: msg.replyTo ? {
          id: msg.replyTo.id,
          content: msg.replyTo.content,
          senderId: msg.replyTo.senderId,
          chatId: msg.replyTo.chatId,
          groupId: msg.replyTo.groupId,
          replyToId: msg.replyTo.replyToId,
          deletedForEveryone: msg.replyTo.deletedForEveryone,
          deletedAt: msg.replyTo.deletedAt,
          createdAt: msg.replyTo.createdAt,
          updatedAt: msg.replyTo.updatedAt,
          sender: msg.replyTo.sender,
        } : null,
        reactions: msg.reactions.map(r => ({
          id: r.id,
          messageId: r.messageId,
          userId: r.userId,
          emoji: r.emoji,
          createdAt: r.createdAt,
        })),
      })),
    }))
  }

  async getChatById(id: string): Promise<ChatWithDetails | null> {
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        user1: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
        user2: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
        messages: {
          include: {
            sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
            replyTo: {
              include: {
                sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
              },
            },
            reactions: {
              include: {
                user: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
              },
            },
          },
        },
      },
    })

    if (!chat) return null

    return {
      id: chat.id,
      userId1: chat.userId1,
      userId2: chat.userId2,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      user1: chat.user1,
      user2: chat.user2,
      messages: chat.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        chatId: msg.chatId,
        groupId: msg.groupId,
        replyToId: msg.replyToId,
        deletedForEveryone: msg.deletedForEveryone,
        deletedAt: msg.deletedAt,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        sender: msg.sender,
        replyTo: msg.replyTo ? {
          id: msg.replyTo.id,
          content: msg.replyTo.content,
          senderId: msg.replyTo.senderId,
          chatId: msg.replyTo.chatId,
          groupId: msg.replyTo.groupId,
          replyToId: msg.replyTo.replyToId,
          deletedForEveryone: msg.replyTo.deletedForEveryone,
          deletedAt: msg.replyTo.deletedAt,
          createdAt: msg.replyTo.createdAt,
          updatedAt: msg.replyTo.updatedAt,
          sender: msg.replyTo.sender,
        } : null,
        reactions: msg.reactions.map(r => ({
          id: r.id,
          messageId: r.messageId,
          userId: r.userId,
          emoji: r.emoji,
          createdAt: r.createdAt,
        })),
      })),
    }
  }

  async createChat(data: { userId1: string; userId2?: string | null }) {
    const chat = await prisma.chat.create({
      data: {
        userId1: data.userId1,
        userId2: data.userId2 || null,
      },
    })
    return chat
  }

  async updateChat(id: string, data: Partial<{ userId1: string; userId2: string | null }>) {
    const chat = await prisma.chat.update({
      where: { id },
      data,
    })
    return chat
  }

  async deleteChat(id: string): Promise<void> {
    // Delete all messages in the chat first
    await prisma.message.deleteMany({
      where: { chatId: id },
    })
    // Then delete the chat
    await prisma.chat.delete({
      where: { id },
    })
  }

  // Message operations
  async getMessages(params: {
    chatId?: string
    groupId?: string
    after?: string
    limit?: number
  }): Promise<MessageWithDetails[]> {
    const where: any = {}
    
    if (params.chatId) {
      where.chatId = params.chatId
    } else if (params.groupId) {
      where.groupId = params.groupId
    }

    // If "after" is provided, only fetch messages after that ID
    if (params.after) {
      const afterMessage = await prisma.message.findUnique({
        where: { id: params.after },
        select: { createdAt: true },
      })
      if (afterMessage) {
        where.createdAt = { gt: afterMessage.createdAt }
      }
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
        replyTo: {
          include: {
            sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: params.limit || 100,
    })

    return messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      chatId: msg.chatId,
      groupId: msg.groupId,
      replyToId: msg.replyToId,
      deletedForEveryone: msg.deletedForEveryone,
      deletedAt: msg.deletedAt,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
      sender: msg.sender,
      replyTo: msg.replyTo ? {
        id: msg.replyTo.id,
        content: msg.replyTo.content,
        senderId: msg.replyTo.senderId,
        chatId: msg.replyTo.chatId,
        groupId: msg.replyTo.groupId,
        replyToId: msg.replyTo.replyToId,
        deletedForEveryone: msg.replyTo.deletedForEveryone,
        deletedAt: msg.replyTo.deletedAt,
        createdAt: msg.replyTo.createdAt,
        updatedAt: msg.replyTo.updatedAt,
        sender: msg.replyTo.sender,
      } : null,
      reactions: msg.reactions.map(r => ({
        id: r.id,
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
        createdAt: r.createdAt,
      })),
    }))
  }

  async createMessage(data: {
    content: string
    senderId: string
    chatId?: string | null
    groupId?: string | null
    replyToId?: string | null
  }): Promise<MessageWithDetails> {
    const messageData: any = {
      content: data.content,
      senderId: data.senderId,
    }

    if (data.chatId) {
      messageData.chatId = data.chatId
    } else if (data.groupId) {
      messageData.groupId = data.groupId
    }

    if (data.replyToId) {
      messageData.replyToId = data.replyToId
    }

    const message = await prisma.message.create({
      data: messageData,
      include: {
        sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
        replyTo: {
          include: {
            sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
          },
        },
      },
    })

    // Update chat/group updatedAt
    if (data.chatId) {
      prisma.chat.update({
        where: { id: data.chatId },
        data: { updatedAt: new Date() },
      }).catch(console.error)
    }

    return {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      chatId: message.chatId,
      groupId: message.groupId,
      replyToId: message.replyToId,
      deletedForEveryone: message.deletedForEveryone,
      deletedAt: message.deletedAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      sender: message.sender,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        senderId: message.replyTo.senderId,
        chatId: message.replyTo.chatId,
        groupId: message.replyTo.groupId,
        replyToId: message.replyTo.replyToId,
        deletedForEveryone: message.replyTo.deletedForEveryone,
        deletedAt: message.replyTo.deletedAt,
        createdAt: message.replyTo.createdAt,
        updatedAt: message.replyTo.updatedAt,
        sender: message.replyTo.sender,
      } : null,
      reactions: message.reactions.map(r => ({
        id: r.id,
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
        createdAt: r.createdAt,
      })),
    }
  }

  async updateMessage(id: string, data: Partial<{ content: string; deletedForEveryone: boolean; deletedAt: Date | null }>) {
    const message = await prisma.message.update({
      where: { id },
      data,
    })
    return message
  }

  async deleteMessage(id: string): Promise<void> {
    await prisma.message.update({
      where: { id },
      data: {
        deletedForEveryone: true,
        deletedAt: new Date(),
        content: "",
      },
    })
  }

  // Reaction operations
  async addReaction(messageId: string, userId: string, emoji: string) {
    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    })
    return {
      id: reaction.id,
      messageId: reaction.messageId,
      userId: reaction.userId,
      emoji: reaction.emoji,
      createdAt: reaction.createdAt,
    }
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const existingReaction = await prisma.messageReaction.findFirst({
      where: {
        messageId,
        userId,
        emoji,
      },
    })

    if (existingReaction) {
      await prisma.messageReaction.delete({
        where: { id: existingReaction.id },
      })
    }
  }

  async getReactionsByMessageId(messageId: string) {
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
    })
    return reactions.map(r => ({
      id: r.id,
      messageId: r.messageId,
      userId: r.userId,
      emoji: r.emoji,
      createdAt: r.createdAt,
    }))
  }

  // Group operations
  async getGroupsByUserId(userId: string): Promise<GroupWithDetails[]> {
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
            replyTo: {
              include: {
                sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
              },
            },
            reactions: {
              include: {
                user: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      avatar: group.avatar,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: group.members.map(m => ({
        id: m.id,
        groupId: m.groupId,
        userId: m.userId,
        joinedAt: m.joinedAt,
      })),
      messages: group.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        chatId: msg.chatId,
        groupId: msg.groupId,
        replyToId: msg.replyToId,
        deletedForEveryone: msg.deletedForEveryone,
        deletedAt: msg.deletedAt,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        sender: msg.sender,
        replyTo: msg.replyTo ? {
          id: msg.replyTo.id,
          content: msg.replyTo.content,
          senderId: msg.replyTo.senderId,
          chatId: msg.replyTo.chatId,
          groupId: msg.replyTo.groupId,
          replyToId: msg.replyTo.replyToId,
          deletedForEveryone: msg.replyTo.deletedForEveryone,
          deletedAt: msg.replyTo.deletedAt,
          createdAt: msg.replyTo.createdAt,
          updatedAt: msg.replyTo.updatedAt,
          sender: msg.replyTo.sender,
        } : null,
        reactions: msg.reactions.map(r => ({
          id: r.id,
          messageId: r.messageId,
          userId: r.userId,
          emoji: r.emoji,
          createdAt: r.createdAt,
        })),
      })),
    }))
  }

  async getGroupById(id: string): Promise<GroupWithDetails | null> {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: true,
        messages: {
          include: {
            sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
            replyTo: {
              include: {
                sender: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
              },
            },
            reactions: {
              include: {
                user: { select: { id: true, name: true, avatar: true, email: true, createdAt: true, updatedAt: true } },
              },
            },
          },
        },
      },
    })

    if (!group) return null

    return {
      id: group.id,
      name: group.name,
      avatar: group.avatar,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: group.members.map(m => ({
        id: m.id,
        groupId: m.groupId,
        userId: m.userId,
        joinedAt: m.joinedAt,
      })),
      messages: group.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        chatId: msg.chatId,
        groupId: msg.groupId,
        replyToId: msg.replyToId,
        deletedForEveryone: msg.deletedForEveryone,
        deletedAt: msg.deletedAt,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        sender: msg.sender,
        replyTo: msg.replyTo ? {
          id: msg.replyTo.id,
          content: msg.replyTo.content,
          senderId: msg.replyTo.senderId,
          chatId: msg.replyTo.chatId,
          groupId: msg.replyTo.groupId,
          replyToId: msg.replyTo.replyToId,
          deletedForEveryone: msg.replyTo.deletedForEveryone,
          deletedAt: msg.replyTo.deletedAt,
          createdAt: msg.replyTo.createdAt,
          updatedAt: msg.replyTo.updatedAt,
          sender: msg.replyTo.sender,
        } : null,
        reactions: msg.reactions.map(r => ({
          id: r.id,
          messageId: r.messageId,
          userId: r.userId,
          emoji: r.emoji,
          createdAt: r.createdAt,
        })),
      })),
    }
  }

  async createGroup(data: {
    name: string
    avatar?: string | null
    createdBy: string
    memberIds?: string[]
  }): Promise<GroupWithDetails> {
    const group = await prisma.group.create({
      data: {
        name: data.name,
        avatar: data.avatar,
        createdBy: data.createdBy,
        members: {
          create: [
            { userId: data.createdBy },
            ...(data.memberIds || []).map((userId: string) => ({ userId })),
          ],
        },
      },
      include: {
        members: true,
        messages: true,
      },
    })

    return {
      id: group.id,
      name: group.name,
      avatar: group.avatar,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: group.members.map(m => ({
        id: m.id,
        groupId: m.groupId,
        userId: m.userId,
        joinedAt: m.joinedAt,
      })),
      messages: [],
    }
  }

  async addGroupMember(groupId: string, userId: string) {
    const member = await prisma.groupMember.create({
      data: {
        groupId,
        userId,
      },
    })
    return {
      id: member.id,
      groupId: member.groupId,
      userId: member.userId,
      joinedAt: member.joinedAt,
    }
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    })

    if (member) {
      await prisma.groupMember.delete({
        where: { id: member.id },
      })
    }
  }

  // Room operations
  async getRooms() {
    const rooms = await prisma.room.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })
    return rooms
  }

  async getRoomById(id: string) {
    const room = await prisma.room.findUnique({
      where: { id },
    })
    return room
  }

  async createRoom(data: {
    name: string
    topic?: string | null
    createdBy: string
  }) {
    const room = await prisma.room.create({
      data: {
        name: data.name,
        topic: data.topic,
        createdBy: data.createdBy,
      },
    })
    return room
  }

  // Blocked user operations
  async blockUser(userId: string, blockedId: string) {
    const blocked = await prisma.blockedUser.create({
      data: {
        userId,
        blockedId,
      },
    })
    return {
      id: blocked.id,
      userId: blocked.userId,
      blockedId: blocked.blockedId,
      createdAt: blocked.createdAt,
    }
  }

  async unblockUser(userId: string, blockedId: string): Promise<void> {
    const blocked = await prisma.blockedUser.findUnique({
      where: {
        userId_blockedId: {
          userId,
          blockedId,
        },
      },
    })

    if (blocked) {
      await prisma.blockedUser.delete({
        where: { id: blocked.id },
      })
    }
  }

  async getBlockedUsers(userId: string) {
    const blocked = await prisma.blockedUser.findMany({
      where: { userId },
    })
    return blocked.map(b => ({
      id: b.id,
      userId: b.userId,
      blockedId: b.blockedId,
      createdAt: b.createdAt,
    }))
  }

  // Real-time subscriptions (not supported by Prisma, return no-op function)
  subscribeToMessages(
    _params: { chatId?: string; groupId?: string },
    _callback: (messages: MessageWithDetails[]) => void
  ): () => void {
    // Prisma doesn't support real-time subscriptions
    // Return a no-op unsubscribe function
    return () => {}
  }

  subscribeToChats(
    _userId: string,
    _callback: (chats: ChatWithDetails[]) => void
  ): () => void {
    // Prisma doesn't support real-time subscriptions
    // Return a no-op unsubscribe function
    return () => {}
  }
}

