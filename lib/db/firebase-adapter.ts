// Firebase Realtime Database adapter implementation
import { DatabaseAdapter, User, Chat, Message, MessageReaction, Group, GroupMember, Room, BlockedUser, ChatWithDetails, MessageWithDetails, GroupWithDetails } from "./adapter"
import { database } from "@/lib/firebase/config"
import { ref, get, set, push, update, remove, query, orderByChild, equalTo, limitToLast, onValue, off, serverTimestamp, startAfter } from "firebase/database"

export class FirebaseAdapter implements DatabaseAdapter {
  // Helper to convert Firebase timestamp to Date
  private toDate(timestamp: any): Date {
    if (!timestamp) return new Date()
    
    // Firebase serverTimestamp() returns a placeholder object
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000)
    }
    
    // Firebase Realtime Database stores timestamps as numbers
    if (typeof timestamp === 'number') {
      return new Date(timestamp)
    }
    
    if (timestamp instanceof Date) {
      return timestamp
    }
    
    // Try parsing as ISO string
    const parsed = new Date(timestamp)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
    
    return new Date()
  }

  // User operations
  async getUserByEmail(email: string): Promise<User | null> {
    const usersRef = ref(database, 'users')
    const snapshot = await get(query(usersRef, orderByChild('email'), equalTo(email)))
    
    if (!snapshot.exists()) return null
    
    const data = snapshot.val()
    const userId = Object.keys(data)[0]
    return this.parseUser(userId, data[userId])
  }

  async getUserById(id: string): Promise<User | null> {
    const userRef = ref(database, `users/${id}`)
    const snapshot = await get(userRef)
    
    if (!snapshot.exists()) return null
    
    return this.parseUser(id, snapshot.val())
  }

  async createUser(data: { email: string; name: string; avatar?: string }): Promise<User> {
    const usersRef = ref(database, 'users')
    const newUserRef = push(usersRef)
    const userId = newUserRef.key!
    
    const userData = {
      email: data.email,
      name: data.name,
      avatar: data.avatar || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    
    await set(newUserRef, userData)
    
    return {
      id: userId,
      email: data.email,
      name: data.name,
      avatar: data.avatar,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  private parseUser(id: string, data: any): User {
    return {
      id,
      email: data.email,
      name: data.name,
      avatar: data.avatar || undefined,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    }
  }

  // Chat operations
  async getChatsByUserId(userId: string): Promise<ChatWithDetails[]> {
    const chatsRef = ref(database, 'chats')
    const snapshot = await get(chatsRef)
    
    if (!snapshot.exists()) return []
    
    const chats: ChatWithDetails[] = []
    const data = snapshot.val()
    
    for (const [chatId, chatData] of Object.entries(data)) {
      const chat = chatData as any
      if (chat.userId1 === userId || chat.userId2 === userId) {
        const chatWithDetails: ChatWithDetails = {
          id: chatId,
          userId1: chat.userId1,
          userId2: chat.userId2 || null,
          createdAt: this.toDate(chat.createdAt),
          updatedAt: this.toDate(chat.updatedAt),
        }
        
        // Load user details
        if (chat.userId1) {
          chatWithDetails.user1 = await this.getUserById(chat.userId1)
        }
        if (chat.userId2) {
          chatWithDetails.user2 = await this.getUserById(chat.userId2)
        }
        
        // Load last message
        const messages = await this.getMessages({ chatId, limit: 1 })
        if (messages.length > 0) {
          chatWithDetails.messages = messages
        }
        
        chats.push(chatWithDetails)
      }
    }
    
    // Sort by updatedAt descending
    return chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  async getChatById(id: string): Promise<ChatWithDetails | null> {
    const chatRef = ref(database, `chats/${id}`)
    const snapshot = await get(chatRef)
    
    if (!snapshot.exists()) return null
    
    const chat = snapshot.val()
    const chatWithDetails: ChatWithDetails = {
      id,
      userId1: chat.userId1,
      userId2: chat.userId2 || null,
      createdAt: this.toDate(chat.createdAt),
      updatedAt: this.toDate(chat.updatedAt),
    }
    
    if (chat.userId1) {
      chatWithDetails.user1 = await this.getUserById(chat.userId1)
    }
    if (chat.userId2) {
      chatWithDetails.user2 = await this.getUserById(chat.userId2)
    }
    
    return chatWithDetails
  }

  async createChat(data: { userId1: string; userId2?: string | null }): Promise<Chat> {
    const chatsRef = ref(database, 'chats')
    const newChatRef = push(chatsRef)
    const chatId = newChatRef.key!
    
    const chatData = {
      userId1: data.userId1,
      userId2: data.userId2 || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    
    await set(newChatRef, chatData)
    
    return {
      id: chatId,
      userId1: data.userId1,
      userId2: data.userId2 || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async updateChat(id: string, data: Partial<Chat>): Promise<Chat> {
    const chatRef = ref(database, `chats/${id}`)
    const updates: any = {
      updatedAt: serverTimestamp(),
    }
    
    if (data.userId1 !== undefined) updates.userId1 = data.userId1
    if (data.userId2 !== undefined) updates.userId2 = data.userId2
    
    await update(chatRef, updates)
    
    const updated = await this.getChatById(id)
    if (!updated) throw new Error('Chat not found after update')
    
    return updated
  }

  // Message operations
  async getMessages(params: {
    chatId?: string
    groupId?: string
    after?: string
    limit?: number
  }): Promise<MessageWithDetails[]> {
    const messagesRef = ref(database, 'messages')
    let messagesQuery = query(messagesRef, orderByChild('createdAt'))
    
    // Filter by chatId or groupId
    if (params.chatId) {
      messagesQuery = query(messagesRef, orderByChild('chatId'), equalTo(params.chatId))
    } else if (params.groupId) {
      messagesQuery = query(messagesRef, orderByChild('groupId'), equalTo(params.groupId))
    }
    
    const snapshot = await get(messagesQuery)
    
    if (!snapshot.exists()) return []
    
    const messages: MessageWithDetails[] = []
    const data = snapshot.val()
    
    for (const [messageId, messageData] of Object.entries(data)) {
      const msg = messageData as any
      
      // Skip if after filter is set and this message is before it
      if (params.after && msg.createdAt <= params.after) continue
      
      const message: MessageWithDetails = {
        id: messageId,
        content: msg.content,
        senderId: msg.senderId,
        chatId: msg.chatId || null,
        groupId: msg.groupId || null,
        replyToId: msg.replyToId || null,
        deletedForEveryone: msg.deletedForEveryone || false,
        deletedAt: msg.deletedAt ? this.toDate(msg.deletedAt) : null,
        createdAt: this.toDate(msg.createdAt),
        updatedAt: this.toDate(msg.updatedAt),
      }
      
      // Load sender
      message.sender = await this.getUserById(msg.senderId)
      
      // Load replyTo if exists
      if (msg.replyToId) {
        const replyToMsg = await this.getMessageById(msg.replyToId)
        message.replyTo = replyToMsg
      }
      
      // Load reactions
      message.reactions = await this.getReactionsByMessageId(messageId)
      
      messages.push(message)
    }
    
    // Sort by createdAt ascending
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    
    // Apply limit
    if (params.limit) {
      return messages.slice(-params.limit)
    }
    
    return messages
  }

  private async getMessageById(id: string): Promise<MessageWithDetails | null> {
    const messageRef = ref(database, `messages/${id}`)
    const snapshot = await get(messageRef)
    
    if (!snapshot.exists()) return null
    
    const msg = snapshot.val()
    const message: MessageWithDetails = {
      id,
      content: msg.content,
      senderId: msg.senderId,
      chatId: msg.chatId || null,
      groupId: msg.groupId || null,
      replyToId: msg.replyToId || null,
      deletedForEveryone: msg.deletedForEveryone || false,
      deletedAt: msg.deletedAt ? this.toDate(msg.deletedAt) : null,
      createdAt: this.toDate(msg.createdAt),
      updatedAt: this.toDate(msg.updatedAt),
    }
    
    message.sender = await this.getUserById(msg.senderId)
    if (msg.replyToId) {
      const replyToMsg = await this.getMessageById(msg.replyToId)
      message.replyTo = replyToMsg
    }
    message.reactions = await this.getReactionsByMessageId(id)
    
    return message
  }

  async createMessage(data: {
    content: string
    senderId: string
    chatId?: string | null
    groupId?: string | null
    replyToId?: string | null
  }): Promise<MessageWithDetails> {
    const messagesRef = ref(database, 'messages')
    const newMessageRef = push(messagesRef)
    const messageId = newMessageRef.key!
    
    const messageData = {
      content: data.content,
      senderId: data.senderId,
      chatId: data.chatId || null,
      groupId: data.groupId || null,
      replyToId: data.replyToId || null,
      deletedForEveryone: false,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    
    await set(newMessageRef, messageData)
    
    // Update chat/group updatedAt
    if (data.chatId) {
      await update(ref(database, `chats/${data.chatId}`), {
        updatedAt: serverTimestamp(),
      })
    }
    
    // Load full message with relations
    const fullMessage = await this.getMessageById(messageId)
    if (!fullMessage) throw new Error('Failed to create message')
    
    return fullMessage
  }

  async updateMessage(id: string, data: Partial<Message>): Promise<Message> {
    const messageRef = ref(database, `messages/${id}`)
    const updates: any = {
      updatedAt: serverTimestamp(),
    }
    
    if (data.content !== undefined) updates.content = data.content
    if (data.deletedForEveryone !== undefined) updates.deletedForEveryone = data.deletedForEveryone
    if (data.deletedAt !== undefined) updates.deletedAt = data.deletedAt ? serverTimestamp() : null
    
    await update(messageRef, updates)
    
    const updated = await this.getMessageById(id)
    if (!updated) throw new Error('Message not found after update')
    
    return updated
  }

  async deleteMessage(id: string): Promise<void> {
    const messageRef = ref(database, `messages/${id}`)
    await update(messageRef, {
      deletedForEveryone: true,
      deletedAt: serverTimestamp(),
      content: '',
    })
  }

  // Reaction operations
  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const reactionsRef = ref(database, `message_reactions`)
    const snapshot = await get(reactionsRef)
    
    // Check if reaction already exists
    if (snapshot.exists()) {
      const reactions = snapshot.val()
      for (const [reactionId, reaction] of Object.entries(reactions)) {
        const r = reaction as any
        if (r.messageId === messageId && r.userId === userId && r.emoji === emoji) {
          // Reaction exists, return it
          return {
            id: reactionId,
            messageId,
            userId,
            emoji,
            createdAt: this.toDate(r.createdAt),
          }
        }
      }
    }
    
    // Create new reaction
    const newReactionRef = push(reactionsRef)
    const reactionId = newReactionRef.key!
    
    await set(newReactionRef, {
      messageId,
      userId,
      emoji,
      createdAt: serverTimestamp(),
    })
    
    return {
      id: reactionId,
      messageId,
      userId,
      emoji,
      createdAt: new Date(),
    }
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const reactionsRef = ref(database, 'message_reactions')
    const snapshot = await get(reactionsRef)
    
    if (!snapshot.exists()) return
    
    const reactions = snapshot.val()
    for (const [reactionId, reaction] of Object.entries(reactions)) {
      const r = reaction as any
      if (r.messageId === messageId && r.userId === userId && r.emoji === emoji) {
        await remove(ref(database, `message_reactions/${reactionId}`))
        return
      }
    }
  }

  async getReactionsByMessageId(messageId: string): Promise<MessageReaction[]> {
    const reactionsRef = ref(database, 'message_reactions')
    const snapshot = await get(query(reactionsRef, orderByChild('messageId'), equalTo(messageId)))
    
    if (!snapshot.exists()) return []
    
    const reactions: MessageReaction[] = []
    const data = snapshot.val()
    
    for (const [reactionId, reactionData] of Object.entries(data)) {
      const r = reactionData as any
      reactions.push({
        id: reactionId,
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
        createdAt: this.toDate(r.createdAt),
      })
    }
    
    return reactions
  }

  // Group operations
  async getGroupsByUserId(userId: string): Promise<GroupWithDetails[]> {
    const groupMembersRef = ref(database, 'group_members')
    const snapshot = await get(query(groupMembersRef, orderByChild('userId'), equalTo(userId)))
    
    if (!snapshot.exists()) return []
    
    const groups: GroupWithDetails[] = []
    const memberships = snapshot.val()
    
    for (const membershipId of Object.keys(memberships)) {
      const membership = memberships[membershipId]
      const group = await this.getGroupById(membership.groupId)
      if (group) {
        groups.push(group)
      }
    }
    
    return groups.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  async getGroupById(id: string): Promise<GroupWithDetails | null> {
    const groupRef = ref(database, `groups/${id}`)
    const snapshot = await get(groupRef)
    
    if (!snapshot.exists()) return null
    
    const groupData = snapshot.val()
    const group: GroupWithDetails = {
      id,
      name: groupData.name,
      avatar: groupData.avatar || null,
      createdBy: groupData.createdBy,
      createdAt: this.toDate(groupData.createdAt),
      updatedAt: this.toDate(groupData.updatedAt),
    }
    
    // Load members
    const membersRef = ref(database, 'group_members')
    const membersSnapshot = await get(query(membersRef, orderByChild('groupId'), equalTo(id)))
    if (membersSnapshot.exists()) {
      const membersData = membersSnapshot.val()
      group.members = Object.keys(membersData).map(memberId => ({
        id: memberId,
        groupId: id,
        userId: membersData[memberId].userId,
        joinedAt: this.toDate(membersData[memberId].joinedAt),
      }))
    }
    
    return group
  }

  async createGroup(data: {
    name: string
    avatar?: string | null
    createdBy: string
    memberIds?: string[]
  }): Promise<GroupWithDetails> {
    const groupsRef = ref(database, 'groups')
    const newGroupRef = push(groupsRef)
    const groupId = newGroupRef.key!
    
    await set(newGroupRef, {
      name: data.name,
      avatar: data.avatar || null,
      createdBy: data.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    // Add creator as member
    await this.addGroupMember(groupId, data.createdBy)
    
    // Add other members
    if (data.memberIds) {
      for (const memberId of data.memberIds) {
        if (memberId !== data.createdBy) {
          await this.addGroupMember(groupId, memberId)
        }
      }
    }
    
    const group = await this.getGroupById(groupId)
    if (!group) throw new Error('Failed to create group')
    
    return group
  }

  async addGroupMember(groupId: string, userId: string): Promise<GroupMember> {
    const membersRef = ref(database, 'group_members')
    const newMemberRef = push(membersRef)
    const memberId = newMemberRef.key!
    
    await set(newMemberRef, {
      groupId,
      userId,
      joinedAt: serverTimestamp(),
    })
    
    return {
      id: memberId,
      groupId,
      userId,
      joinedAt: new Date(),
    }
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    const membersRef = ref(database, 'group_members')
    const snapshot = await get(query(membersRef, orderByChild('groupId'), equalTo(groupId)))
    
    if (!snapshot.exists()) return
    
    const members = snapshot.val()
    for (const [memberId, memberData] of Object.entries(members)) {
      const m = memberData as any
      if (m.userId === userId) {
        await remove(ref(database, `group_members/${memberId}`))
        return
      }
    }
  }

  // Room operations
  async getRooms(): Promise<Room[]> {
    const roomsRef = ref(database, 'rooms')
    const snapshot = await get(roomsRef)
    
    if (!snapshot.exists()) return []
    
    const rooms: Room[] = []
    const data = snapshot.val()
    
    for (const [roomId, roomData] of Object.entries(data)) {
      const r = roomData as any
      rooms.push({
        id: roomId,
        name: r.name,
        topic: r.topic || null,
        createdBy: r.createdBy,
        createdAt: this.toDate(r.createdAt),
        updatedAt: this.toDate(r.updatedAt),
      })
    }
    
    return rooms.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async getRoomById(id: string): Promise<Room | null> {
    const roomRef = ref(database, `rooms/${id}`)
    const snapshot = await get(roomRef)
    
    if (!snapshot.exists()) return null
    
    const r = snapshot.val()
    return {
      id,
      name: r.name,
      topic: r.topic || null,
      createdBy: r.createdBy,
      createdAt: this.toDate(r.createdAt),
      updatedAt: this.toDate(r.updatedAt),
    }
  }

  async createRoom(data: {
    name: string
    topic?: string | null
    createdBy: string
  }): Promise<Room> {
    const roomsRef = ref(database, 'rooms')
    const newRoomRef = push(roomsRef)
    const roomId = newRoomRef.key!
    
    await set(newRoomRef, {
      name: data.name,
      topic: data.topic || null,
      createdBy: data.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    const room = await this.getRoomById(roomId)
    if (!room) throw new Error('Failed to create room')
    
    return room
  }

  // Blocked user operations
  async blockUser(userId: string, blockedId: string): Promise<BlockedUser> {
    const blockedRef = ref(database, 'blocked_users')
    const newBlockedRef = push(blockedRef)
    const blockedUserId = newBlockedRef.key!
    
    await set(newBlockedRef, {
      userId,
      blockedId,
      createdAt: serverTimestamp(),
    })
    
    return {
      id: blockedUserId,
      userId,
      blockedId,
      createdAt: new Date(),
    }
  }

  async unblockUser(userId: string, blockedId: string): Promise<void> {
    const blockedRef = ref(database, 'blocked_users')
    const snapshot = await get(query(blockedRef, orderByChild('userId'), equalTo(userId)))
    
    if (!snapshot.exists()) return
    
    const blocked = snapshot.val()
    for (const [blockedId_key, blockedData] of Object.entries(blocked)) {
      const b = blockedData as any
      if (b.blockedId === blockedId) {
        await remove(ref(database, `blocked_users/${blockedId_key}`))
        return
      }
    }
  }

  async getBlockedUsers(userId: string): Promise<BlockedUser[]> {
    const blockedRef = ref(database, 'blocked_users')
    const snapshot = await get(query(blockedRef, orderByChild('userId'), equalTo(userId)))
    
    if (!snapshot.exists()) return []
    
    const blocked: BlockedUser[] = []
    const data = snapshot.val()
    
    for (const [blockedId_key, blockedData] of Object.entries(data)) {
      const b = blockedData as any
      blocked.push({
        id: blockedId_key,
        userId: b.userId,
        blockedId: b.blockedId,
        createdAt: this.toDate(b.createdAt),
      })
    }
    
    return blocked
  }

  // Real-time subscriptions
  subscribeToMessages(
    params: { chatId?: string; groupId?: string },
    callback: (messages: MessageWithDetails[]) => void
  ): () => void {
    const messagesRef = ref(database, 'messages')
    let messagesQuery = query(messagesRef, orderByChild('createdAt'))
    
    if (params.chatId) {
      messagesQuery = query(messagesRef, orderByChild('chatId'), equalTo(params.chatId))
    } else if (params.groupId) {
      messagesQuery = query(messagesRef, orderByChild('groupId'), equalTo(params.groupId))
    }
    
    const unsubscribe = onValue(messagesQuery, async (snapshot) => {
      if (!snapshot.exists()) {
        callback([])
        return
      }
      
      const messages: MessageWithDetails[] = []
      const data = snapshot.val()
      
      for (const [messageId, messageData] of Object.entries(data)) {
        const msg = messageData as any
        const message: MessageWithDetails = {
          id: messageId,
          content: msg.content,
          senderId: msg.senderId,
          chatId: msg.chatId || null,
          groupId: msg.groupId || null,
          replyToId: msg.replyToId || null,
          deletedForEveryone: msg.deletedForEveryone || false,
          deletedAt: msg.deletedAt ? this.toDate(msg.deletedAt) : null,
          createdAt: this.toDate(msg.createdAt),
          updatedAt: this.toDate(msg.updatedAt),
        }
        
        message.sender = await this.getUserById(msg.senderId)
        if (msg.replyToId) {
          const replyToMsg = await this.getMessageById(msg.replyToId)
          message.replyTo = replyToMsg
        }
        message.reactions = await this.getReactionsByMessageId(messageId)
        
        messages.push(message)
      }
      
      messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      callback(messages)
    })
    
    return () => {
      off(messagesQuery, 'value', unsubscribe)
    }
  }

  subscribeToChats(
    userId: string,
    callback: (chats: ChatWithDetails[]) => void
  ): () => void {
    const chatsRef = ref(database, 'chats')
    
    const unsubscribe = onValue(chatsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        callback([])
        return
      }
      
      const chats: ChatWithDetails[] = []
      const data = snapshot.val()
      
      for (const [chatId, chatData] of Object.entries(data)) {
        const chat = chatData as any
        if (chat.userId1 === userId || chat.userId2 === userId) {
          const chatWithDetails: ChatWithDetails = {
            id: chatId,
            userId1: chat.userId1,
            userId2: chat.userId2 || null,
            createdAt: this.toDate(chat.createdAt),
            updatedAt: this.toDate(chat.updatedAt),
          }
          
          if (chat.userId1) {
            chatWithDetails.user1 = await this.getUserById(chat.userId1)
          }
          if (chat.userId2) {
            chatWithDetails.user2 = await this.getUserById(chat.userId2)
          }
          
          const messages = await this.getMessages({ chatId, limit: 1 })
          if (messages.length > 0) {
            chatWithDetails.messages = messages
          }
          
          chats.push(chatWithDetails)
        }
      }
      
      chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      callback(chats)
    })
    
    return () => {
      off(chatsRef, 'value', unsubscribe)
    }
  }
}

