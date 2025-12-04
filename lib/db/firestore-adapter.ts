// Firestore adapter implementation
import { DatabaseAdapter, User, Chat, Message, MessageReaction, Group, GroupMember, Room, BlockedUser, ChatWithDetails, MessageWithDetails, GroupWithDetails } from "./adapter"
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
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
  DocumentData
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
    let normalizedCandidate = this.normalizeUsername(candidate)
    let attempt = 1
    
    while (await this.getUserByUsername(candidate)) {
      // Append number to cleaned version, but check normalized version
      candidate = `${cleaned}${attempt}`
      normalizedCandidate = this.normalizeUsername(candidate)
      attempt += 1
      if (attempt > 1000) {
        // Fallback if too many attempts
        candidate = `${cleaned}_${Math.floor(Math.random() * 10000)}`
        break
      }
    }

    return candidate
  }

  // Helper to convert Date to Firestore Timestamp
  private toTimestamp(date: Date): Timestamp {
    return Timestamp.fromDate(date)
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

  async createUser(data: { email: string; name: string; avatar?: string; username?: string | null }): Promise<User> {
    const usersRef = collection(db, 'users')
    const newUserRef = doc(usersRef)
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
    const q = query(
      chatsRef,
      where('userId1', '==', userId)
    )
    const snapshot1 = await getDocs(q)
    
    const q2 = query(
      chatsRef,
      where('userId2', '==', userId)
    )
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
        chatWithDetails.user1 = await this.getUserById(chatData.userId1)
      }
      if (chatData.userId2) {
        chatWithDetails.user2 = await this.getUserById(chatData.userId2)
      }
      
      // Load last message
      const messages = await this.getMessages({ chatId, limit: 1 })
      if (messages.length > 0) {
        chatWithDetails.messages = messages
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
      chatWithDetails.user1 = await this.getUserById(chatData.userId1)
    }
    if (chatData.userId2) {
      chatWithDetails.user2 = await this.getUserById(chatData.userId2)
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
    // Note: Messages are not automatically deleted - they remain orphaned
    // You may want to delete all messages in the chat as well
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
    
    // Filter by chatId or groupId, then order by createdAt
    // Note: Firestore requires composite index for where + orderBy on different fields
    // But chatId/groupId + createdAt should work if index exists
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
        // No filter, just order by createdAt
        q = query(messagesRef, orderBy('createdAt', 'asc'))
      }
      
      // Apply limit
      if (params.limit) {
        q = query(q, limit(params.limit))
      }
    } catch (error: any) {
      // If index doesn't exist, try without orderBy first, then sort in memory
      console.warn('Firestore index may be missing, falling back to in-memory sort:', error.message)
      if (params.chatId) {
        q = query(messagesRef, where('chatId', '==', params.chatId))
      } else if (params.groupId) {
        q = query(messagesRef, where('groupId', '==', params.groupId))
      } else {
        q = query(messagesRef)
      }
      
      if (params.limit) {
        q = query(q, limit(params.limit * 2)) // Get more to account for sorting
      }
    }
    
    const snapshot = await getDocs(q)
    
    const messages: MessageWithDetails[] = []
    const userIds = new Set<string>()
    
    // First pass: collect unique user IDs
    for (const docSnap of snapshot.docs) {
      const msg = docSnap.data()
      if (params.after && docSnap.id <= params.after) continue
      userIds.add(msg.senderId)
    }
    
    // Batch load users in parallel (much faster than sequential)
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
    
    // Build messages and load reactions/replies in parallel per message
    const messagePromises = snapshot.docs.map(async (docSnap) => {
      const msg = docSnap.data()
      
      // Skip if after filter is set
      if (params.after && docSnap.id <= params.after) return null
      
      // Decrypt content (crypto-js is synchronous) with chat-specific key
      let decryptedContent = msg.content || ''
      if (typeof window !== 'undefined' && msg.content && typeof msg.content === 'string') {
        try {
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
      }
      
      // Use cached user
      message.sender = usersMap.get(msg.senderId) || null
      
      // Load replyTo and reactions in parallel for this message
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
    
    // Sort in memory if we couldn't use orderBy in query
    if (!params.chatId && !params.groupId || messages.length > 0) {
      messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    }
    
    // Apply limit after sorting if we got more than needed
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
    
    // Decrypt content with chat-specific key
    let decryptedContent = msg.content
    if (typeof window !== 'undefined') {
      try {
        const { decrypt, isEncrypted } = require('@/lib/encryption')
        if (isEncrypted(msg.content)) {
          decryptedContent = decrypt(msg.content, msg.chatId || null, msg.groupId || null)
        }
      } catch (error) {
        // Silently fail - return original content
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
    const messagesRef = collection(db, 'messages')
    const newMessageRef = doc(messagesRef)
    
    // Note: Content should already be encrypted on client-side before calling this
    // If content looks encrypted, use it as-is, otherwise encrypt
    let encryptedContent = data.content
    if (typeof window !== 'undefined') {
      try {
        const { encrypt, isEncrypted } = require('@/lib/encryption')
        if (!isEncrypted(data.content)) {
          encryptedContent = encrypt(data.content)
        }
      } catch (error) {
        // Silently fail - save unencrypted if encryption fails
        encryptedContent = data.content
      }
    }
    
    const messageData = {
      content: encryptedContent, // Store encrypted
      senderId: data.senderId,
      chatId: data.chatId || null,
      groupId: data.groupId || null,
      replyToId: data.replyToId || null,
      deletedForEveryone: false,
      deletedAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    
    // Create message and update chat in parallel for speed
    await Promise.all([
      setDoc(newMessageRef, messageData),
      data.chatId ? updateDoc(doc(db, 'chats', data.chatId), {
        updatedAt: Timestamp.now(),
      }) : Promise.resolve(),
    ])
    
    // Return message immediately without loading relations (they'll load via real-time)
    const message: MessageWithDetails = {
      id: newMessageRef.id,
      content: data.content, // Return original content (decrypted)
      senderId: data.senderId,
      chatId: data.chatId || null,
      groupId: data.groupId || null,
      replyToId: data.replyToId || null,
      deletedForEveryone: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      sender: undefined, // Will be loaded by real-time subscription
      replyTo: null, // Will be loaded by real-time subscription if needed
      reactions: [], // Will be loaded by real-time subscription
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
      // Reaction exists, remove it (toggle behavior)
      await deleteDoc(snapshot.docs[0].ref)
      throw new Error('Reaction removed') // Signal to caller that it was removed
    }
    
    // Create new reaction (encrypt emoji for consistency, though emoji is not sensitive)
    const newReactionRef = doc(reactionsRef)
    await setDoc(newReactionRef, {
      messageId,
      userId,
      emoji, // Emoji doesn't need encryption, but could be encrypted if desired
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
    
    // Add creator as member
    await this.addGroupMember(newGroupRef.id, data.createdBy)
    
    // Add other members
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
    
    // Prevent duplicate memberships
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
    let currentMessages: MessageWithDetails[] = []
    
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
      const usersMap = new Map<string, any>()
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          const user = await this.getUserById(userId)
          if (user) usersMap.set(userId, user)
        })
      )
      
      // Subscribe to reactions for new messages
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
        }
      }
      
      // Decrypt all messages (crypto-js is synchronous) with chat-specific key
      const decryptedData = snapshot.docs.map((docSnap) => {
        const msg = docSnap.data()
        let decryptedContent = msg.content || ''
        
        if (typeof window !== 'undefined' && msg.content && typeof msg.content === 'string') {
          try {
            // Dynamically import encryption utilities
            const encryptionModule = require('@/lib/encryption')
            const { decrypt, isEncrypted } = encryptionModule
            
            // Check if content is encrypted
            if (isEncrypted(msg.content)) {
              // Use chatId or groupId from message to decrypt
              decryptedContent = decrypt(msg.content, msg.chatId || null, msg.groupId || null)
              // If decryption returns the same value, keep original (might be corrupted)
              if (decryptedContent === msg.content && msg.content.startsWith('ENC:')) {
                // Decryption failed but content looks encrypted - keep as-is
                decryptedContent = msg.content
              }
            }
            // If not encrypted, use content as-is
          } catch (error) {
            // Silently fail - return original content (might be unencrypted or corrupted)
            decryptedContent = msg.content
          }
        }
        
        return { docSnap, msg, decryptedContent }
      })
      
      // Build messages with decrypted content
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
        }
        
        message.sender = usersMap.get(msg.senderId)
        // replyTo will be loaded after all messages are processed
        if (msg.replyToId) {
          message.replyToId = msg.replyToId
        }
        
        // Preserve any existing reactions from previous snapshot (live updates)
        const existingMsg = currentMessages.find(m => m.id === docSnap.id)
        message.reactions = existingMsg?.reactions || []
        
        messages.push(message)
      }
      
      // Seed reactions from persisted data on first load so they survive refresh
      if (currentMessages.length === 0 && messageIds.length > 0) {
        try {
          const reactionsResults = await Promise.all(
            messageIds.map(async (msgId) => {
              try {
                const reactions = await this.getReactionsByMessageId(msgId)
                return { msgId, reactions }
              } catch (error) {
                console.warn('Failed to load reactions for message:', msgId, error)
                return { msgId, reactions: [] as MessageReaction[] }
              }
            })
          )
          
          const reactionsMap = new Map<string, MessageReaction[]>()
          reactionsResults.forEach(result => {
            reactionsMap.set(result.msgId, result.reactions)
          })
          
          messages.forEach(m => {
            if (!m.reactions || m.reactions.length === 0) {
              m.reactions = reactionsMap.get(m.id) || []
            }
          })
        } catch (error) {
          console.warn('Failed to seed reactions on initial load:', error)
        }
      }
      
      // Batch load all replyTo messages in parallel
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
              
              // Decrypt replyTo content
              let replyToContent = replyToData.content || ''
              if (typeof window !== 'undefined' && replyToData.content && typeof replyToData.content === 'string') {
                try {
                  const { decrypt, isEncrypted } = require('@/lib/encryption')
                  if (isEncrypted(replyToData.content)) {
                    replyToContent = decrypt(replyToData.content, params.chatId || null, params.groupId || null)
                  }
                } catch (error) {
                  // Silently fail - use original content
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
                }
              }
            }
          } catch (error) {
            console.warn('Failed to load replyTo message:', replyToId, error)
          }
          return null
        })
        
        const replyToResults = await Promise.all(replyToPromises)
        const replyToMap = new Map<string, MessageWithDetails>()
        replyToResults.forEach(result => {
          if (result) replyToMap.set(result.id, result.message)
        })
        
        // Attach replyTo to messages
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
    
    // Firestore doesn't support OR queries easily, so we'll listen to both
    const q1 = query(chatsRef, where('userId1', '==', userId))
    const q2 = query(chatsRef, where('userId2', '==', userId))
    
    const unsubscribes: (() => void)[] = []
    const chatsMap = new Map<string, ChatWithDetails>()
    const messageUnsubscribes = new Map<string, () => void>()
    // Store messages and users outside updateCallback so they persist across async callbacks
    const messagesMap = new Map<string, MessageWithDetails[]>()
    const usersMap = new Map<string, any>()
    
    const triggerCallback = () => {
      // Update chats with user data and messages
      const allChats: ChatWithDetails[] = []
      for (const [chatId, chat] of chatsMap.entries()) {
        if (chat.userId1) {
          chat.user1 = usersMap.get(chat.userId1) || chat.user1
        }
        if (chat.userId2) {
          chat.user2 = usersMap.get(chat.userId2) || chat.user2
        }
        
        // Set last message if available (from real-time subscription or initial load)
        const lastMessages = messagesMap.get(chatId) || []
        chat.messages = lastMessages
        
        allChats.push(chat)
      }
      
      allChats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      callback(allChats)
    }
    
    const updateCallback = async () => {
      try {
        // Load users for all chats in parallel
        const userIds = new Set<string>()
        const chatIds = Array.from(chatsMap.keys())
        
        for (const chat of chatsMap.values()) {
          if (chat.userId1) userIds.add(chat.userId1)
          if (chat.userId2) userIds.add(chat.userId2)
        }
        
        // Load users in parallel and update usersMap
        await Promise.all(
          Array.from(userIds).map(async (uid) => {
            try {
              const user = await this.getUserById(uid)
              if (user) {
                usersMap.set(uid, user)
              }
            } catch (error) {
              // Silently fail - user might not exist
            }
          })
        )
        
        // Clean up old message subscriptions for chats that no longer exist
        for (const [chatId, unsub] of messageUnsubscribes.entries()) {
          if (!chatIds.includes(chatId)) {
            unsub()
            messageUnsubscribes.delete(chatId)
          }
        }
        
        // Set up real-time subscriptions for last message of each chat
        for (const chatId of chatIds) {
          if (!messageUnsubscribes.has(chatId)) {
            // Subscribe to the most recent message for this chat
            const messagesRef = collection(db, 'messages')
            const messagesQuery = query(
              messagesRef,
              where('chatId', '==', chatId),
              orderBy('createdAt', 'desc'),
              limit(1)
            )
            
            const unsub = onSnapshot(messagesQuery, async (snapshot) => {
              if (!snapshot.empty) {
                const docSnap = snapshot.docs[0]
                const msg = docSnap.data()
                
                // Decrypt content
                let decryptedContent = msg.content || ''
                if (typeof window !== 'undefined' && msg.content && typeof msg.content === 'string') {
                  try {
                    const { decrypt, isEncrypted } = require('@/lib/encryption')
                    if (isEncrypted(msg.content)) {
                      decryptedContent = decrypt(msg.content, chatId, null)
                      if (decryptedContent === msg.content && msg.content.startsWith('ENC:')) {
                        decryptedContent = msg.content
                      }
                    }
                  } catch (error) {
                    decryptedContent = msg.content
                  }
                }
                
                // Load sender and add to usersMap
                const sender = await this.getUserById(msg.senderId)
                if (sender) {
                  usersMap.set(msg.senderId, sender)
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
                  sender,
                  replyTo: null,
                  reactions: [],
                }
                
                messagesMap.set(chatId, [message])
                
                // Trigger callback with updated messages
                triggerCallback()
              } else {
                messagesMap.set(chatId, [])
                triggerCallback()
              }
            }, (error) => {
              console.error('[Firestore] Error in message subscription for chat:', chatId, error)
              messagesMap.set(chatId, [])
              triggerCallback()
            })
            
            messageUnsubscribes.set(chatId, unsub)
          }
        }
        
        // Initial load: get last message for chats without subscription yet
        const chatsToLoadMessages = chatIds.filter(id => !messageUnsubscribes.has(id))
        await Promise.all(
          chatsToLoadMessages.map(async (chatId) => {
            try {
              const messages = await this.getMessages({ chatId, limit: 1 })
              messagesMap.set(chatId, messages)
            } catch (error) {
              messagesMap.set(chatId, [])
            }
          })
        )
        
        triggerCallback()
      } catch (error) {
        console.error('[Firestore] ❌ Error in updateCallback:', error)
        // Still call callback with empty array or current chats to avoid hanging
        const allChats: ChatWithDetails[] = Array.from(chatsMap.values())
        allChats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        callback(allChats)
      }
    }
    
    const unsubscribe1 = onSnapshot(q1, async (snapshot) => {
      // Clear removed chats from map
      const currentIds = new Set(snapshot.docs.map(d => d.id))
      for (const [chatId, chat] of Array.from(chatsMap.entries())) {
        if (!currentIds.has(chatId) && chat.userId1 === userId) {
          chatsMap.delete(chatId)
        }
      }
      
      // Add/update chats
      for (const docSnap of snapshot.docs) {
        const chatData = docSnap.data()
        const chatWithDetails: ChatWithDetails = {
          id: docSnap.id,
          userId1: chatData.userId1,
          userId2: chatData.userId2 || null,
          createdAt: this.toDate(chatData.createdAt),
          updatedAt: this.toDate(chatData.updatedAt),
          messages: [], // Don't load messages here - too slow
        }
        
        chatsMap.set(docSnap.id, chatWithDetails)
      }
      
      await updateCallback()
    }, (error) => {
      console.error('[Firestore] Error in userId1 subscription:', error)
    })
    
    const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
      // Clear removed chats from map (chats that are no longer in userId2 query)
      const currentIds = new Set(snapshot.docs.map(d => d.id))
      for (const [chatId, chat] of Array.from(chatsMap.entries())) {
        if (!currentIds.has(chatId) && chat.userId2 === userId) {
          chatsMap.delete(chatId)
        }
      }
      
      // Add/update chats
      for (const docSnap of snapshot.docs) {
        const chatData = docSnap.data()
        
        // Always update to ensure we have the latest data
        const chatWithDetails: ChatWithDetails = {
          id: docSnap.id,
          userId1: chatData.userId1,
          userId2: chatData.userId2 || null,
          createdAt: this.toDate(chatData.createdAt),
          updatedAt: this.toDate(chatData.updatedAt),
          messages: [], // Don't load messages here - too slow
        }
        
        chatsMap.set(docSnap.id, chatWithDetails)
      }
      
      await updateCallback()
    }, (error) => {
      console.error('[Firestore] Error in userId2 subscription:', error)
    })
    
    unsubscribes.push(unsubscribe1, unsubscribe2)
    
    return () => {
      unsubscribes.forEach(unsub => unsub())
      // Clean up all message subscriptions
      messageUnsubscribes.forEach(unsub => unsub())
      messageUnsubscribes.clear()
    }
  }
}

