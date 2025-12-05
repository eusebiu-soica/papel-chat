// Firestore adapter implementation
import { DatabaseAdapter, User, Chat, Message, MessageReaction, Group, GroupMember, Room, BlockedUser, ChatWithDetails, MessageWithDetails, GroupWithDetails } from "./adapter"
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAt,
  endAt,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot
} from "firebase/firestore"
import { app } from "@/lib/firebase/config"

const db = getFirestore(app)

export class FirestoreAdapter implements DatabaseAdapter {
  // Helper to convert Firestore Timestamp to Date
  private toDate(timestamp: any): Date {
    if (!timestamp) return new Date()
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate()
    }
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate()
    }
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000)
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp)
    }
    if (timestamp instanceof Date) {
      return timestamp
    }
    const parsed = new Date(timestamp)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
    return new Date()
  }

  // Normalize username for search/comparison (lowercase, keep underscores, remove other special chars)
  private normalizeUsername(username?: string | null): string {
    if (!username) return ""
    return username
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
  }

  // Clean username for storage (preserve underscores and case, but remove invalid chars)
  private cleanUsername(username: string): string {
    if (!username) return ""
    // Keep original case, but remove invalid characters (keep alphanumeric, underscores, hyphens)
    return username
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .replace(/^_+|_+$/g, "")
      .replace(/^-+|-+$/g, "")
      .substring(0, 30) // Limit length
  }

  private async ensureUniqueUsername(base: string): Promise<string> {
    // Clean the base username (preserve case and underscores)
    let cleaned = this.cleanUsername(base)
    if (!cleaned) {
      cleaned = `papel${Math.floor(Math.random() * 1000)}`
    }

    // Normalize for uniqueness check
    const normalized = this.normalizeUsername(cleaned)
    if (!normalized) {
      cleaned = `papel${Math.floor(Math.random() * 1000)}`
    }

    // Check uniqueness using normalized version, but return cleaned version
    let candidate = cleaned
    let attempt = 1
    
    while (await this.getUserByUsername(candidate)) {
      // Append number to cleaned version, but check normalized version
      candidate = `${cleaned}${attempt}`
      attempt += 1
      if (attempt > 1000) {
        // Fallback if too many attempts
        candidate = `${cleaned}_${Math.floor(Math.random() * 10000)}`
        break
      }
    }

    return candidate
  }

  // User operations
  async getUserByEmail(email: string): Promise<User | null> {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email), limit(1))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) return null
    
    const docSnap = snapshot.docs[0]
    return this.parseUser(docSnap.id, docSnap.data())
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const normalized = this.normalizeUsername(username)
    if (!normalized) return null

    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('usernameLower', '==', normalized), limit(1))
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null

    const docSnap = snapshot.docs[0]
    return this.parseUser(docSnap.id, docSnap.data())
  }

  async searchUsersByUsername(queryText: string, resultLimit = 5): Promise<User[]> {
    const normalizedQuery = this.normalizeUsername(queryText)
    if (!normalizedQuery) return []

    const usersRef = collection(db, 'users')
    const q = query(
      usersRef,
      orderBy('usernameLower'),
      startAt(normalizedQuery),
      endAt(`${normalizedQuery}\uf8ff`),
      limit(resultLimit)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(docSnap => this.parseUser(docSnap.id, docSnap.data()))
  }

  async getUserById(id: string): Promise<User | null> {
    const userRef = doc(db, 'users', id)
    const snapshot = await getDoc(userRef)
    
    if (!snapshot.exists()) return null
    
    return this.parseUser(snapshot.id, snapshot.data())
  }

  async createUser(data: { id?: string; email: string; name: string; avatar?: string; username?: string | null }): Promise<User> {
    const usersRef = collection(db, 'users')
    // Use provided ID if available (for auth sync), otherwise auto-generate
    const newUserRef = data.id ? doc(usersRef, data.id) : doc(usersRef)
    
    const desiredUsername = data.username || data.name || data.email?.split("@")?.[0] || ""
    const uniqueUsername = await this.ensureUniqueUsername(desiredUsername)
    
    const userData = {
      email: data.email,
      name: data.name,
      avatar: data.avatar || null,
      username: uniqueUsername,
      usernameLower: this.normalizeUsername(uniqueUsername),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    
    await setDoc(newUserRef, userData)
    
    return {
      id: newUserRef.id,
      email: data.email,
      name: data.name,
      avatar: data.avatar,
      username: uniqueUsername,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async updateUser(id: string, data: { name?: string; avatar?: string | null; username?: string | null }): Promise<User> {
    const userRef = doc(db, 'users', id)
    const updatePayload: Record<string, any> = {
      updatedAt: Timestamp.now(),
    }

    if (typeof data.name !== 'undefined') {
      updatePayload.name = data.name
    }

    if (typeof data.avatar !== 'undefined') {
      updatePayload.avatar = data.avatar
    }

    if (typeof data.username !== 'undefined') {
      const uniqueUsername = await this.ensureUniqueUsername(data.username || '')
      updatePayload.username = uniqueUsername
      updatePayload.usernameLower = this.normalizeUsername(uniqueUsername)
    }

    await updateDoc(userRef, updatePayload)
    const snapshot = await getDoc(userRef)
    if (!snapshot.exists()) {
      throw new Error('User not found')
    }

    return this.parseUser(snapshot.id, snapshot.data())
  }

  private parseUser(id: string, data: DocumentData): User {
    return {
      id,
      email: data.email,
      name: data.name,
      avatar: data.avatar || undefined,
      username: data.username || null,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    }
  }

  // Chat operations
  async getChatsByUserId(userId: string): Promise<ChatWithDetails[]> {
    const chatsRef = collection(db, 'chats')
    const q = query(chatsRef, where('userId1', '==', userId))
    const snapshot1 = await getDocs(q)
    
    const q2 = query(chatsRef, where('userId2', '==', userId))
    const snapshot2 = await getDocs(q2)
    
    const allDocs = [...snapshot1.docs, ...snapshot2.docs]
    const uniqueChats = new Map<string, ChatWithDetails>()
    
    for (const docSnap of allDocs) {
      const chatData = docSnap.data()
      const chatId = docSnap.id
      
      const chatWithDetails: ChatWithDetails = {
        id: chatId,
        userId1: chatData.userId1,
        userId2: chatData.userId2 || null,
        createdAt: this.toDate(chatData.createdAt),
        updatedAt: this.toDate(chatData.updatedAt),
      }
      
      // Load user details
      if (chatData.userId1) {
        const u1 = await this.getUserById(chatData.userId1)
        if (u1) chatWithDetails.user1 = u1
      }
      if (chatData.userId2) {
        const u2 = await this.getUserById(chatData.userId2)
        if (u2) chatWithDetails.user2 = u2
      }
      
      // Load last message from denormalized field if available
      if (chatData.lastMessage) {
         const lastMsg = chatData.lastMessage
         const sender = await this.getUserById(lastMsg.senderId)
         chatWithDetails.messages = [{
            id: lastMsg.id || 'latest',
            content: lastMsg.content || '',
            senderId: lastMsg.senderId,
            createdAt: this.toDate(lastMsg.createdAt),
            updatedAt: this.toDate(lastMsg.updatedAt),
            sender: sender || undefined,
            deletedForEveryone: false,
            reactions: [],
            chatId: chatId,
            groupId: null,
            replyToId: null,
            deletedAt: null,
            replyTo: null
         } as MessageWithDetails]
      } else {
          // Fallback to query
          const messages = await this.getMessages({ chatId, limit: 1 })
          if (messages.length > 0) {
            chatWithDetails.messages = messages
          }
      }
      
      uniqueChats.set(chatId, chatWithDetails)
    }
    
    // Sort by updatedAt descending
    return Array.from(uniqueChats.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    )
  }

  async getChatById(id: string): Promise<ChatWithDetails | null> {
    const chatRef = doc(db, 'chats', id)
    const snapshot = await getDoc(chatRef)
    
    if (!snapshot.exists()) return null
    
    const chatData = snapshot.data()
    const chatWithDetails: ChatWithDetails = {
      id: snapshot.id,
      userId1: chatData.userId1,
      userId2: chatData.userId2 || null,
      createdAt: this.toDate(chatData.createdAt),
      updatedAt: this.toDate(chatData.updatedAt),
    }
    
    if (chatData.userId1) {
      const u1 = await this.getUserById(chatData.userId1)
      if (u1) chatWithDetails.user1 = u1
    }
    if (chatData.userId2) {
      const u2 = await this.getUserById(chatData.userId2)
      if (u2) chatWithDetails.user2 = u2
    }
    
    return chatWithDetails
  }

  async createChat(data: { userId1: string; userId2?: string | null }): Promise<Chat> {
    const chatsRef = collection(db, 'chats')
    const newChatRef = doc(chatsRef)
    
    const chatData = {
      userId1: data.userId1,
      userId2: data.userId2 || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    
    await setDoc(newChatRef, chatData)
    
    return {
      id: newChatRef.id,
      userId1: data.userId1,
      userId2: data.userId2 || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async updateChat(id: string, data: Partial<Chat>): Promise<Chat> {
    const chatRef = doc(db, 'chats', id)
    const updates: any = {
      updatedAt: Timestamp.now(),
    }
    
    if (data.userId1 !== undefined) updates.userId1 = data.userId1
    if (data.userId2 !== undefined) updates.userId2 = data.userId2
    
    await updateDoc(chatRef, updates)
    
    const updated = await this.getChatById(id)
    if (!updated) throw new Error('Chat not found after update')
    
    return updated
  }

  async deleteChat(id: string): Promise<void> {
    const chatRef = doc(db, 'chats', id)
    await deleteDoc(chatRef)
  }

  // Message operations
  async getMessages(params: {
    chatId?: string
    groupId?: string
    after?: string
    limit?: number
  }): Promise<MessageWithDetails[]> {
    const messagesRef = collection(db, 'messages')
    let q: any
    
    try {
      if (params.chatId) {
        q = query(
          messagesRef, 
          where('chatId', '==', params.chatId),
          orderBy('createdAt', 'asc')
        )
      } else if (params.groupId) {
        q = query(
          messagesRef, 
          where('groupId', '==', params.groupId),
          orderBy('createdAt', 'asc')
        )
      } else {
        q = query(messagesRef, orderBy('createdAt', 'asc'))
      }
      
      if (params.limit) {
        q = query(q, limit(params.limit))
      }
    } catch (error: any) {
      console.warn('Firestore index may be missing, fallback to simple query:', error.message)
      if (params.chatId) {
        q = query(messagesRef, where('chatId', '==', params.chatId))
      } else if (params.groupId) {
        q = query(messagesRef, where('groupId', '==', params.groupId))
      } else {
        q = query(messagesRef)
      }
      
      if (params.limit) {
        q = query(q, limit(params.limit * 2))
      }
    }
    
    const snapshot = await getDocs(q)
    
    const messages: MessageWithDetails[] = []
    const userIds = new Set<string>()
    
    for (const docSnap of snapshot.docs) {
      if (params.after && docSnap.id <= params.after) continue
      const msg = docSnap.data() as Message
      userIds.add(msg.senderId)
    }
    
    const usersMap = new Map<string, User>()
    const userPromises = Array.from(userIds).map(async (userId) => {
      try {
        const user = await this.getUserById(userId)
        if (user) usersMap.set(userId, user)
      } catch {
        // Silently fail
      }
    })
    await Promise.all(userPromises)
    
    const messagePromises = snapshot.docs.map(async (docSnap) => {
      const msg = docSnap.data() as Message
      
      if (params.after && docSnap.id <= params.after) return null
      
      // Decrypt content using dynamic import
      let decryptedContent = msg.content || ''
      if (typeof window !== 'undefined' && msg.content && typeof msg.content === 'string') {
        try {
          const { decrypt, isEncrypted } = await import('@/lib/encryption')
          if (isEncrypted(msg.content)) {
            decryptedContent = decrypt(msg.content, params.chatId || null, params.groupId || null)
            if (decryptedContent === msg.content && msg.content.startsWith('ENC:')) {
              decryptedContent = msg.content
            }
          }
        } catch (error) {
          decryptedContent = msg.content
        }
      }
      
      const message: MessageWithDetails = {
        id: docSnap.id,
        content: decryptedContent,
        senderId: msg.senderId,
        chatId: msg.chatId || null,
        groupId: msg.groupId || null,
        replyToId: msg.replyToId || null,
        deletedForEveryone: msg.deletedForEveryone || false,
        deletedAt: msg.deletedAt ? this.toDate(msg.deletedAt) : null,
        createdAt: this.toDate(msg.createdAt),
        updatedAt: this.toDate(msg.updatedAt),
        reactions: []
      }
      
      message.sender = usersMap.get(msg.senderId) || undefined
      
      // Load replyTo and reactions
      const [replyTo, reactions] = await Promise.all([
        msg.replyToId ? this.getMessageById(msg.replyToId).catch(() => null) : Promise.resolve(null),
        this.getReactionsByMessageId(docSnap.id).catch(() => [] as MessageReaction[])
      ])
      
      message.replyTo = replyTo
      message.reactions = reactions || []
      
      return message
    })
    
    const results = await Promise.all(messagePromises)
    messages.push(...results.filter((m): m is MessageWithDetails => m !== null))
    
    if (!params.chatId && !params.groupId || messages.length > 0) {
      messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    }
    
    if (params.limit && messages.length > params.limit) {
      return messages.slice(-params.limit)
    }
    
    return messages
  }

  private async getMessageById(id: string): Promise<MessageWithDetails | null> {
    const messageRef = doc(db, 'messages', id)
    const snapshot = await getDoc(messageRef)
    
    if (!snapshot.exists()) return null
    
    const msg = snapshot.data()
    
    let decryptedContent = msg.content
    if (typeof window !== 'undefined') {
      try {
        const { decrypt, isEncrypted } = await import('@/lib/encryption')
        if (isEncrypted(msg.content)) {
          decryptedContent = decrypt(msg.content, msg.chatId || null, msg.groupId || null)
        }
      } catch (error) {
        decryptedContent = msg.content
      }
    }
    
    const message: MessageWithDetails = {
      id: snapshot.id,
      content: decryptedContent,
      senderId: msg.senderId,
      chatId: msg.chatId || null,
      groupId: msg.groupId || null,
      replyToId: msg.replyToId || null,
      deletedForEveryone: msg.deletedForEveryone || false,
      deletedAt: msg.deletedAt ? this.toDate(msg.deletedAt) : null,
      createdAt: this.toDate(msg.createdAt),
      updatedAt: this.toDate(msg.updatedAt),
      reactions: []
    }
    
    const sender = await this.getUserById(msg.senderId)
    message.sender = sender || undefined

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
    const messagesRef = collection(db, 'messages')
    const newMessageRef = doc(messagesRef)
    
    let encryptedContent = data.content
    if (typeof window !== 'undefined') {
      try {
        const { encrypt, isEncrypted } = await import('@/lib/encryption')
        if (!isEncrypted(data.content)) {
          encryptedContent = encrypt(data.content)
        }
      } catch (error) {
        encryptedContent = data.content
      }
    }
    
    const now = Timestamp.now()
    const messageData = {
      content: encryptedContent,
      senderId: data.senderId,
      chatId: data.chatId || null,
      groupId: data.groupId || null,
      replyToId: data.replyToId || null,
      deletedForEveryone: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    
    // Last message data for denormalization
    const lastMessageData = {
      id: newMessageRef.id,
      content: encryptedContent,
      senderId: data.senderId,
      createdAt: now,
      updatedAt: now,
    }
    
    const updatePromises: Promise<any>[] = [setDoc(newMessageRef, messageData)]
    
    if (data.chatId) {
      updatePromises.push(
        updateDoc(doc(db, 'chats', data.chatId), {
          lastMessage: lastMessageData,
          updatedAt: now,
        })
      )
    } else if (data.groupId) {
      updatePromises.push(
        updateDoc(doc(db, 'groups', data.groupId), {
          lastMessage: lastMessageData,
          updatedAt: now,
        })
      )
    }
    
    await Promise.all(updatePromises)
    
    const message: MessageWithDetails = {
      id: newMessageRef.id,
      content: data.content,
      senderId: data.senderId,
      chatId: data.chatId || null,
      groupId: data.groupId || null,
      replyToId: data.replyToId || null,
      deletedForEveryone: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      sender: undefined,
      replyTo: null,
      reactions: [],
    }
    
    return message
  }

  async updateMessage(id: string, data: Partial<Message>): Promise<Message> {
    const messageRef = doc(db, 'messages', id)
    const updates: any = {
      updatedAt: Timestamp.now(),
    }
    
    if (data.content !== undefined) updates.content = data.content
    if (data.deletedForEveryone !== undefined) updates.deletedForEveryone = data.deletedForEveryone
    if (data.deletedAt !== undefined) updates.deletedAt = data.deletedAt ? Timestamp.now() : null
    
    await updateDoc(messageRef, updates)
    
    const updated = await this.getMessageById(id)
    if (!updated) throw new Error('Message not found after update')
    
    return updated
  }

  async deleteMessage(id: string): Promise<void> {
    const messageRef = doc(db, 'messages', id)
    await updateDoc(messageRef, {
      deletedForEveryone: true,
      deletedAt: Timestamp.now(),
      content: '',
    })
  }

  // Reaction operations
  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const reactionsRef = collection(db, 'message_reactions')
    const q = query(
      reactionsRef,
      where('messageId', '==', messageId),
      where('userId', '==', userId),
      where('emoji', '==', emoji),
      limit(1)
    )
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref)
      throw new Error('Reaction removed')
    }
    
    const newReactionRef = doc(reactionsRef)
    await setDoc(newReactionRef, {
      messageId,
      userId,
      emoji,
      createdAt: Timestamp.now(),
    })
    
    return {
      id: newReactionRef.id,
      messageId,
      userId,
      emoji,
      createdAt: new Date(),
    }
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const reactionsRef = collection(db, 'message_reactions')
    const q = query(
      reactionsRef,
      where('messageId', '==', messageId),
      where('userId', '==', userId),
      where('emoji', '==', emoji),
      limit(1)
    )
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref)
    }
  }

  async getReactionsByMessageId(messageId: string): Promise<MessageReaction[]> {
    const reactionsRef = collection(db, 'message_reactions')
    const q = query(
      reactionsRef,
      where('messageId', '==', messageId),
      orderBy('createdAt', 'asc')
    )
    const snapshot = await getDocs(q)
    
    const reactions: MessageReaction[] = []
    
    for (const docSnap of snapshot.docs) {
      const r = docSnap.data()
      reactions.push({
        id: docSnap.id,
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
    const groupMembersRef = collection(db, 'group_members')
    const q = query(groupMembersRef, where('userId', '==', userId))
    const snapshot = await getDocs(q)
    
    const groups: GroupWithDetails[] = []
    
    for (const docSnap of snapshot.docs) {
      const membership = docSnap.data()
      const group = await this.getGroupById(membership.groupId)
      if (group) {
        groups.push(group)
      }
    }
    
    return groups.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  async getGroupById(id: string): Promise<GroupWithDetails | null> {
    const groupRef = doc(db, 'groups', id)
    const snapshot = await getDoc(groupRef)
    
    if (!snapshot.exists()) return null
    
    const groupData = snapshot.data()
    const group: GroupWithDetails = {
      id: snapshot.id,
      name: groupData.name,
      avatar: groupData.avatar || null,
      createdBy: groupData.createdBy,
      createdAt: this.toDate(groupData.createdAt),
      updatedAt: this.toDate(groupData.updatedAt),
    }
    
    // Load members
    const membersRef = collection(db, 'group_members')
    const membersQuery = query(membersRef, where('groupId', '==', id))
    const membersSnapshot = await getDocs(membersQuery)
    
    group.members = membersSnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      groupId: id,
      userId: docSnap.data().userId,
      joinedAt: this.toDate(docSnap.data().joinedAt),
    }))
    
    return group
  }

  async createGroup(data: {
    id?: string
    name: string
    avatar?: string | null
    createdBy: string
    memberIds?: string[]
  }): Promise<GroupWithDetails> {
    const groupsRef = collection(db, 'groups')
    const newGroupRef = data.id ? doc(groupsRef, data.id) : doc(groupsRef)
    
    await setDoc(newGroupRef, {
      name: data.name,
      avatar: data.avatar || null,
      createdBy: data.createdBy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    
    await this.addGroupMember(newGroupRef.id, data.createdBy)
    
    if (data.memberIds) {
      for (const memberId of data.memberIds) {
        if (memberId !== data.createdBy) {
          await this.addGroupMember(newGroupRef.id, memberId)
        }
      }
    }
    
    const group = await this.getGroupById(newGroupRef.id)
    if (!group) throw new Error('Failed to create group')
    
    return group
  }

  async addGroupMember(groupId: string, userId: string): Promise<GroupMember> {
    const membersRef = collection(db, 'group_members')
    
    const existingMembershipQuery = query(
      membersRef,
      where('groupId', '==', groupId),
      where('userId', '==', userId),
      limit(1)
    )
    const existingSnapshot = await getDocs(existingMembershipQuery)
    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0]
      const data = existing.data()
      return {
        id: existing.id,
        groupId,
        userId,
        joinedAt: this.toDate(data.joinedAt),
      }
    }

    const newMemberRef = doc(membersRef)
    
    await setDoc(newMemberRef, {
      groupId,
      userId,
      joinedAt: Timestamp.now(),
    })
    
    return {
      id: newMemberRef.id,
      groupId,
      userId,
      joinedAt: new Date(),
    }
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    const membersRef = collection(db, 'group_members')
    const q = query(
      membersRef,
      where('groupId', '==', groupId),
      where('userId', '==', userId),
      limit(1)
    )
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref)
    }
  }

  // Room operations
  async getRooms(): Promise<Room[]> {
    const roomsRef = collection(db, 'rooms')
    const q = query(roomsRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(docSnap => {
      const r = docSnap.data()
      return {
        id: docSnap.id,
        name: r.name,
        topic: r.topic || null,
        createdBy: r.createdBy,
        shareableId: r.shareableId || null,
        isTemporary: !!r.isTemporary,
        createdAt: this.toDate(r.createdAt),
        updatedAt: this.toDate(r.updatedAt),
      }
    })
  }

  async getRoomById(id: string): Promise<Room | null> {
    const roomRef = doc(db, 'rooms', id)
    const snapshot = await getDoc(roomRef)
    
    if (!snapshot.exists()) return null
    
    const r = snapshot.data()
    return {
      id: snapshot.id,
      name: r.name,
      topic: r.topic || null,
      createdBy: r.createdBy,
      shareableId: r.shareableId || null,
      isTemporary: !!r.isTemporary,
      createdAt: this.toDate(r.createdAt),
      updatedAt: this.toDate(r.updatedAt),
    }
  }

  async createRoom(data: {
    name: string
    topic?: string | null
    createdBy: string
    shareableId?: string | null
    isTemporary?: boolean
  }): Promise<Room> {
    const roomsRef = collection(db, 'rooms')
    const newRoomRef = doc(roomsRef)
    
    await setDoc(newRoomRef, {
      name: data.name,
      topic: data.topic || null,
      createdBy: data.createdBy,
      shareableId: data.shareableId || null,
      isTemporary: !!data.isTemporary,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    
    const room = await this.getRoomById(newRoomRef.id)
    if (!room) throw new Error('Failed to create room')
    
    return room
  }

  // Blocked user operations
  async blockUser(userId: string, blockedId: string): Promise<BlockedUser> {
    const blockedRef = collection(db, 'blocked_users')
    const newBlockedRef = doc(blockedRef)
    
    await setDoc(newBlockedRef, {
      userId,
      blockedId,
      createdAt: Timestamp.now(),
    })
    
    return {
      id: newBlockedRef.id,
      userId,
      blockedId,
      createdAt: new Date(),
    }
  }

  async unblockUser(userId: string, blockedId: string): Promise<void> {
    const blockedRef = collection(db, 'blocked_users')
    const q = query(
      blockedRef,
      where('userId', '==', userId),
      where('blockedId', '==', blockedId),
      limit(1)
    )
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref)
    }
  }

  async getBlockedUsers(userId: string): Promise<BlockedUser[]> {
    const blockedRef = collection(db, 'blocked_users')
    const q = query(blockedRef, where('userId', '==', userId))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(docSnap => {
      const b = docSnap.data()
      return {
        id: docSnap.id,
        userId: b.userId,
        blockedId: b.blockedId,
        createdAt: this.toDate(b.createdAt),
      }
    })
  }

  // Real-time subscriptions
  subscribeToMessages(
    params: { chatId?: string; groupId?: string },
    callback: (messages: MessageWithDetails[]) => void
  ): () => void {
    const messagesRef = collection(db, 'messages')
    let q: any = query(messagesRef, orderBy('createdAt', 'asc'))
    
    if (params.chatId) {
      q = query(messagesRef, where('chatId', '==', params.chatId), orderBy('createdAt', 'asc'))
    } else if (params.groupId) {
      q = query(messagesRef, where('groupId', '==', params.groupId), orderBy('createdAt', 'asc'))
    }
    
    const reactionsUnsubscribes = new Map<string, () => void>()
    const reactionsCache = new Map<string, MessageReaction[]>()
    let currentMessages: MessageWithDetails[] = []
    
    // Helper to load reactions for a message
    const loadReactionsForMessage = async (msgId: string): Promise<MessageReaction[]> => {
      try {
        const reactionsRef = collection(db, 'message_reactions')
        const reactionsQuery = query(
          reactionsRef,
          where('messageId', '==', msgId),
          orderBy('createdAt', 'asc')
        )
        const reactionsSnapshot = await getDocs(reactionsQuery)
        const reactions: MessageReaction[] = reactionsSnapshot.docs.map(docSnap => {
          const r = docSnap.data()
          return {
            id: docSnap.id,
            messageId: r.messageId,
            userId: r.userId,
            emoji: r.emoji,
            createdAt: this.toDate(r.createdAt),
          }
        })
        reactionsCache.set(msgId, reactions)
        return reactions
      } catch (error) {
        return reactionsCache.get(msgId) || []
      }
    }
    
    const unsubscribe = onSnapshot(q, async (snapshot: QuerySnapshot) => {
      const messages: MessageWithDetails[] = []
      
      // Batch load users
      const userIds = new Set<string>()
      const messageIds: string[] = []
      
      for (const docSnap of snapshot.docs) {
        const msg = docSnap.data()
        userIds.add(msg.senderId)
        if (msg.replyToId) userIds.add(msg.replyToId)
        messageIds.push(docSnap.id)
      }
      
      // Load users in parallel
      const usersMap = new Map<string, User>()
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          const user = await this.getUserById(userId)
          if (user) usersMap.set(userId, user)
        })
      )
      
      // Load reactions for all messages in parallel (initial load)
      const reactionsPromises = messageIds.map(msgId => loadReactionsForMessage(msgId))
      const reactionsResults = await Promise.all(reactionsPromises)
      const reactionsMap = new Map<string, MessageReaction[]>()
      messageIds.forEach((msgId, index) => {
        reactionsMap.set(msgId, reactionsResults[index])
      })
      
      // Subscribe to reactions for new messages (for real-time updates)
      for (const msgId of messageIds) {
        if (!reactionsUnsubscribes.has(msgId)) {
          const reactionsRef = collection(db, 'message_reactions')
          const reactionsQuery = query(
            reactionsRef,
            where('messageId', '==', msgId),
            orderBy('createdAt', 'asc')
          )
          
          const unsub = onSnapshot(reactionsQuery, (reactionsSnapshot) => {
            const reactions: MessageReaction[] = reactionsSnapshot.docs.map(docSnap => {
              const r = docSnap.data()
              return {
                id: docSnap.id,
                messageId: r.messageId,
                userId: r.userId,
                emoji: r.emoji,
                createdAt: this.toDate(r.createdAt),
              }
            })
            reactionsCache.set(msgId, reactions)
            
            // Update current messages with new reactions
            currentMessages = currentMessages.map(m => {
              if (m.id === msgId) {
                return { ...m, reactions }
              }
              return m
            })
            callback([...currentMessages])
          })
          reactionsUnsubscribes.set(msgId, unsub)
        }
      }
      
      // Remove subscriptions for deleted messages
      for (const [msgId, unsub] of reactionsUnsubscribes.entries()) {
        if (!messageIds.includes(msgId)) {
          unsub()
          reactionsUnsubscribes.delete(msgId)
          reactionsCache.delete(msgId)
        }
      }
      
      // Decrypt all messages
      const decryptedData = snapshot.docs.map((docSnap) => {
        const msg = docSnap.data()
        let decryptedContent = msg.content || ''
        
        if (typeof window !== 'undefined' && msg.content && typeof msg.content === 'string') {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { decrypt, isEncrypted } = require('@/lib/encryption')
            
            if (isEncrypted(msg.content)) {
              decryptedContent = decrypt(msg.content, params.chatId || null, params.groupId || null)
              if (decryptedContent === msg.content && msg.content.startsWith('ENC:')) {
                decryptedContent = msg.content
              }
            }
          } catch (error) {
            decryptedContent = msg.content
          }
        }
        
        return { docSnap, msg, decryptedContent }
      })
      
      // Build messages
      for (const { docSnap, msg, decryptedContent } of decryptedData) {
        const message: MessageWithDetails = {
          id: docSnap.id,
          content: decryptedContent,
          senderId: msg.senderId,
          chatId: msg.chatId || null,
          groupId: msg.groupId || null,
          replyToId: msg.replyToId || null,
          deletedForEveryone: msg.deletedForEveryone || false,
          deletedAt: msg.deletedAt ? this.toDate(msg.deletedAt) : null,
          createdAt: this.toDate(msg.createdAt),
          updatedAt: this.toDate(msg.updatedAt),
          reactions: [] // Will be updated by separate listener
        }
        
        message.sender = usersMap.get(msg.senderId)
        
        // Use reactions from cache (loaded in parallel above)
        message.reactions = reactionsMap.get(docSnap.id) || []
        
        messages.push(message)
      }
      
      // Batch load all replyTo messages
      const replyToIds = new Set<string>()
      messages.forEach(m => {
        if (m.replyToId) replyToIds.add(m.replyToId)
      })
      
      if (replyToIds.size > 0) {
        const replyToPromises = Array.from(replyToIds).map(async (replyToId) => {
          try {
            const replyToDoc = await getDoc(doc(db, 'messages', replyToId))
            if (replyToDoc.exists()) {
              const replyToData = replyToDoc.data()
              const replyToSender = usersMap.get(replyToData.senderId)
              
              let replyToContent = replyToData.content || ''
              if (typeof window !== 'undefined' && replyToData.content && typeof replyToData.content === 'string') {
                try {
                  const { decrypt, isEncrypted } = await import('@/lib/encryption')
                  if (isEncrypted(replyToData.content)) {
                    replyToContent = decrypt(replyToData.content, params.chatId || null, params.groupId || null)
                  }
                } catch (error) {
                  replyToContent = replyToData.content
                }
              }
              
              return {
                id: replyToId,
                message: {
                  id: replyToDoc.id,
                  content: replyToContent,
                  senderId: replyToData.senderId,
                  chatId: replyToData.chatId || null,
                  groupId: replyToData.groupId || null,
                  replyToId: replyToData.replyToId || null,
                  deletedForEveryone: replyToData.deletedForEveryone || false,
                  deletedAt: replyToData.deletedAt ? this.toDate(replyToData.deletedAt) : null,
                  createdAt: this.toDate(replyToData.createdAt),
                  updatedAt: this.toDate(replyToData.updatedAt),
                  sender: replyToSender,
                } as MessageWithDetails
              }
            }
          } catch (error) {
            // Silently fail
          }
          return null
        })
        
        const replyToResults = await Promise.all(replyToPromises)
        const replyToMap = new Map<string, MessageWithDetails>()
        replyToResults.forEach(result => {
          if (result) replyToMap.set(result.id, result.message)
        })
        
        messages.forEach(m => {
          if (m.replyToId) {
            const replyTo = replyToMap.get(m.replyToId)
            if (replyTo) {
              m.replyTo = replyTo
            }
          }
        })
      }
      
      currentMessages = messages
      callback(messages)
    })
    
    return () => {
      unsubscribe()
      reactionsUnsubscribes.forEach(unsub => unsub())
      reactionsUnsubscribes.clear()
    }
  }

  subscribeToChats(
    userId: string,
    callback: (chats: ChatWithDetails[]) => void
  ): () => void {
    const chatsRef = collection(db, 'chats')
    
    const q1 = query(chatsRef, where('userId1', '==', userId))
    const q2 = query(chatsRef, where('userId2', '==', userId))
    
    const unsubscribes: (() => void)[] = []
    const chatsMap = new Map<string, ChatWithDetails>()
    const usersMap = new Map<string, User>()
    
    // Optimized: Only one callback handler for both queries
    // AND CRITICAL FIX: We do NOT subscribe to messages subcollections. 
    // We rely on `lastMessage` being updated on the chat document itself.
    
    const triggerCallback = async () => {
      try {
        const userIds = new Set<string>()
        for (const chat of chatsMap.values()) {
          if (chat.userId1) userIds.add(chat.userId1)
          if (chat.userId2) userIds.add(chat.userId2)
          // Add sender of last message to userIds to fetch
          const lastMsg = chat.messages?.[0]
          if (lastMsg && lastMsg.senderId) userIds.add(lastMsg.senderId)
        }
        
        await Promise.all(
          Array.from(userIds).map(async (uid) => {
            if (!usersMap.has(uid)) {
              try {
                const user = await this.getUserById(uid)
                if (user) {
                  usersMap.set(uid, user)
                }
              } catch (error) {
                // Silently fail
              }
            }
          })
        )
        
        const allChats: ChatWithDetails[] = []
        for (const chat of chatsMap.values()) {
          if (chat.userId1) {
            chat.user1 = usersMap.get(chat.userId1) || chat.user1
          }
          if (chat.userId2) {
            chat.user2 = usersMap.get(chat.userId2) || chat.user2
          }
          
          // Hydrate sender for last message if it exists
          if (chat.messages && chat.messages.length > 0) {
             const lastMsg = chat.messages[0]
             if (lastMsg && lastMsg.senderId) {
                lastMsg.senderId = usersMap.get(lastMsg.senderId)?.id || ''
             }
          }
          
          allChats.push(chat)
        }
        
        allChats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        callback(allChats)
      } catch (error) {
        console.error('[Firestore] ❌ Error in triggerCallback:', error)
        const allChats: ChatWithDetails[] = Array.from(chatsMap.values())
        allChats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        callback(allChats)
      }
    }
    
    // Helper to process chat snapshot and handle denormalized lastMessage
    const processChatSnapshot = async (docSnap: QueryDocumentSnapshot<DocumentData>) => {
      const chatData = docSnap.data()
      const chatId = docSnap.id
      
      let lastMessage: MessageWithDetails | undefined = undefined
      if (chatData.lastMessage) {
        const lastMsgData = chatData.lastMessage
        
        let decryptedContent = lastMsgData.content || ''
        if (typeof window !== 'undefined' && lastMsgData.content && typeof lastMsgData.content === 'string') {
          try {
            const { decrypt, isEncrypted } = await import('@/lib/encryption')
            if (isEncrypted(lastMsgData.content)) {
              decryptedContent = decrypt(lastMsgData.content, chatId, null)
              if (decryptedContent === lastMsgData.content && lastMsgData.content.startsWith('ENC:')) {
                decryptedContent = lastMsgData.content
              }
            }
          } catch (error) {
            decryptedContent = lastMsgData.content
          }
        }
        
        // Pre-load sender into map if possible, or just let triggerCallback handle it later
        
        lastMessage = {
          id: lastMsgData.id,
          content: decryptedContent,
          senderId: lastMsgData.senderId,
          chatId: chatId,
          groupId: null,
          replyToId: null,
          deletedForEveryone: false,
          deletedAt: null,
          createdAt: this.toDate(lastMsgData.createdAt),
          updatedAt: this.toDate(lastMsgData.updatedAt),
          sender: undefined, // Will be populated in triggerCallback
          replyTo: null,
          reactions: [],
        }
      }
      
      const chatWithDetails: ChatWithDetails = {
        id: chatId,
        userId1: chatData.userId1,
        userId2: chatData.userId2 || null,
        createdAt: this.toDate(chatData.createdAt),
        updatedAt: this.toDate(chatData.updatedAt),
        messages: lastMessage ? [lastMessage] : [],
      }
      
      chatsMap.set(chatId, chatWithDetails)
    }
    
     const handleSnapshot = async (snapshot: QuerySnapshot<DocumentData>) => {
       // We can't easily know which query (q1 or q2) this snapshot came from in this merged logic
       // without more complex state tracking.
       // Simplified strategy: Just update map with new/modified docs.
       // For deletions, it's trickier with 2 streams.
       // However, since we just want to update the UI, adding/updating is key.
       // True sync deletion might require a slightly more robust multi-query handler,
       // but this is sufficient for standard chat behavior.

       // Process only the changes in this snapshot
       await Promise.all(snapshot.docs.map(docSnap => processChatSnapshot(docSnap)))
       await triggerCallback()
     }

    const unsubscribe1 = onSnapshot(q1, handleSnapshot, (error) => {
      console.error('[Firestore] Error in userId1 subscription:', error)
    })
    
    const unsubscribe2 = onSnapshot(q2, handleSnapshot, (error) => {
      console.error('[Firestore] Error in userId2 subscription:', error)
    })
    
    unsubscribes.push(unsubscribe1, unsubscribe2)
    
    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }
}