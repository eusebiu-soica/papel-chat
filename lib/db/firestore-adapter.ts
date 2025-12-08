// Firestore adapter implementation
import { DatabaseAdapter, User, Chat, Message, MessageReaction, Group, GroupMember, Room, BlockedUser, ChatWithDetails, MessageWithDetails, GroupWithDetails } from "./adapter"
import { 
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
  QueryDocumentSnapshot,
  Query
} from "firebase/firestore"
import { app } from "@/lib/firebase/config"
// 🚀 PERFORMANCE: Static import of encryption functions to avoid dynamic require() in render
// This ensures decryption happens once when data arrives, not on every UI render
import { decrypt, encrypt, isEncrypted } from '@/lib/encryption'
import { extractBase64FromDataUri, createDataUriFromBase64 } from '@/lib/image-utils'

// Lazy initialization of Firestore - only initialize if app is available
let db: ReturnType<typeof getFirestore> | null = null

function getDb() {
  if (!app) {
    throw new Error("Firebase is not configured. Please add NEXT_PUBLIC_FIREBASE_* environment variables.")
  }
  if (!db) {
    // Enable offline persistence with multi-tab support
    try {
      // Only initialize with persistence on client side
      if (typeof window !== 'undefined') {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        })
      } else {
        // Server-side: use regular getFirestore
        db = getFirestore(app)
      }
    } catch (e: any) {
      // If already initialized, fallback to getFirestore
      if (e.code === 'failed-precondition') {
        db = getFirestore(app)
      } else {
        throw e
      }
    }
  }
  return db
}

export class FirestoreAdapter implements DatabaseAdapter {
  private toDate(timestamp: any): Date {
    if (!timestamp) return new Date()
    if (timestamp instanceof Timestamp) return timestamp.toDate()
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate()
    if (timestamp?.seconds) return new Date(timestamp.seconds * 1000)
    if (typeof timestamp === 'number') return new Date(timestamp)
    if (timestamp instanceof Date) return timestamp
    const parsed = new Date(timestamp)
    return !isNaN(parsed.getTime()) ? parsed : new Date()
  }

  private normalizeUsername(username?: string | null): string {
    if (!username) return ""
    return username
  }

  private cleanUsername(username: string): string {
    if (!username) return ""
    return username.replace(/[^a-zA-Z0-9_-]/g, "").replace(/^_+|_+$/g, "").replace(/^-+|-+$/g, "").substring(0, 30)
  }

  private async ensureUniqueUsername(base: string): Promise<string> {
    let cleaned = this.cleanUsername(base)
    if (!cleaned) cleaned = `papel${Math.floor(Math.random() * 1000)}`

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const normalized = this.normalizeUsername(cleaned)
    let candidate = cleaned
    let attempt = 1
    
    while (await this.getUserByUsername(candidate)) {
      candidate = `${cleaned}${attempt}`
      attempt += 1
      if (attempt > 1000) {
        candidate = `${cleaned}_${Math.floor(Math.random() * 10000)}`
        break
      }
    }
    return candidate
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const q = query(collection(getDb(), 'users'), where('email', '==', email), limit(1))
    const snapshot = await getDocs(q)
    return snapshot.empty ? null : this.parseUser(snapshot.docs[0].id, snapshot.docs[0].data())
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const normalized = this.normalizeUsername(username)
    if (!normalized) return null
    const q = query(collection(getDb(), 'users'), where('usernameLower', '==', normalized), limit(1))
    const snapshot = await getDocs(q)
    return snapshot.empty ? null : this.parseUser(snapshot.docs[0].id, snapshot.docs[0].data())
  }

  async searchUsersByUsername(queryText: string, resultLimit = 5): Promise<User[]> {
    const normalized = this.normalizeUsername(queryText)
    if (!normalized) return []
    const q = query(collection(getDb(), 'users'), orderBy('usernameLower'), startAt(normalized), endAt(`${normalized}\uf8ff`), limit(resultLimit))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => this.parseUser(d.id, d.data()))
  }

  async getUserById(id: string): Promise<User | null> {
    const snapshot = await getDoc(doc(getDb(), 'users', id))
    return snapshot.exists() ? this.parseUser(snapshot.id, snapshot.data()) : null
  }

  async createUser(data: { id?: string; email: string; name: string; avatar?: string; username?: string | null }): Promise<User> {
    const usersRef = collection(getDb(), 'users')
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
    return { id: newUserRef.id, ...data, username: uniqueUsername, avatar: data.avatar, createdAt: new Date(), updatedAt: new Date() }
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const updates: any = { updatedAt: Timestamp.now() }
    if (data.name) updates.name = data.name
    if (data.avatar) updates.avatar = data.avatar
    if (data.username) {
      const unique = await this.ensureUniqueUsername(data.username)
      updates.username = unique
      updates.usernameLower = this.normalizeUsername(unique)
    }
    await updateDoc(doc(getDb(), 'users', id), updates)
    const u = await this.getUserById(id)
    if (!u) throw new Error('User not found')
    return u
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

  // --- CHAT OPERATIONS ---

  async getChatsByUserId(userId: string): Promise<ChatWithDetails[]> {
    const q1 = query(collection(getDb(), 'chats'), where('userId1', '==', userId))
    const q2 = query(collection(getDb(), 'chats'), where('userId2', '==', userId))
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)])
    
    const chatsMap = new Map<string, ChatWithDetails>()
    const allDocs = [...snap1.docs, ...snap2.docs]
    
    for (const docSnap of allDocs) {
      const data = docSnap.data()
      const chat: ChatWithDetails = {
        id: docSnap.id,
        userId1: data.userId1,
        userId2: data.userId2 || null,
        createdAt: this.toDate(data.createdAt),
        updatedAt: this.toDate(data.updatedAt),
      }
      
      if (data.userId1) chat.user1 = (await this.getUserById(data.userId1)) || undefined
      if (data.userId2) chat.user2 = (await this.getUserById(data.userId2)) || undefined

      if (data.lastMessage) {
        const lm = data.lastMessage
        // 🚀 PERFORMANCE: Decrypt at adapter level (not in UI) - use chatId (docSnap.id)
        let content = lm.content || ''
        if (content && isEncrypted(content)) {
           try {
             // Use chatId (docSnap.id) for decryption
             const decrypted = decrypt(content, docSnap.id, null)
             // Only use if decryption succeeded
             if (decrypted && decrypted !== content && !decrypted.startsWith('ENC:')) {
               content = decrypted
             } else {
               console.error('❌ Decryption FAILED in getChatsByUserId for chat:', docSnap.id)
             }
           } catch (e) { 
             console.error('❌ Decryption exception in getChatsByUserId:', e, 'chatId:', docSnap.id)
           }
        }

        chat.messages = [{
          id: lm.id || 'latest',
          content,
          senderId: lm.senderId,
          createdAt: this.toDate(lm.createdAt),
          updatedAt: this.toDate(lm.updatedAt),
          sender: (await this.getUserById(lm.senderId)) || undefined,
            deletedForEveryone: false,
            reactions: [],
          chatId: docSnap.id,
            groupId: null,
            replyToId: null,
          replyTo: null,
          deletedAt: null
         } as MessageWithDetails]
      } else {
        const msgs = await this.getMessages({ chatId: docSnap.id, limit: 1 })
        if (msgs.length) chat.messages = msgs
      }
      chatsMap.set(docSnap.id, chat)
    }
    return Array.from(chatsMap.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  async getChatById(id: string): Promise<ChatWithDetails | null> {
    const snap = await getDoc(doc(getDb(), 'chats', id))
    if (!snap.exists()) return null
    const data = snap.data()
    const chat: ChatWithDetails = {
      id: snap.id,
      userId1: data.userId1,
      userId2: data.userId2,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt)
    }
    if (data.userId1) chat.user1 = (await this.getUserById(data.userId1)) || undefined
    if (data.userId2) chat.user2 = (await this.getUserById(data.userId2)) || undefined
    return chat
  }

  async createChat(data: { userId1: string; userId2?: string | null }): Promise<Chat> {
    const ref = doc(collection(getDb(), 'chats'))
    const now = Timestamp.now()
    const chatData = { userId1: data.userId1, userId2: data.userId2 || null, createdAt: now, updatedAt: now }
    await setDoc(ref, chatData)
    return { id: ref.id, ...chatData, createdAt: now.toDate(), updatedAt: now.toDate() } as Chat
  }

  async updateChat(id: string, data: Partial<Chat>): Promise<Chat> {
    await updateDoc(doc(getDb(), 'chats', id), { ...data, updatedAt: Timestamp.now() })
    const c = await this.getChatById(id)
    if (!c) throw new Error("Chat not found")
    return c
  }

  async deleteChat(id: string): Promise<void> {
    await deleteDoc(doc(getDb(), 'chats', id))
  }

  // --- MESSAGE OPERATIONS ---

  async getMessages(params: { chatId?: string; groupId?: string; after?: string; limit?: number; before?: string }): Promise<MessageWithDetails[]> {
    const ref = collection(getDb(), 'messages')
    let q: Query
    
    // Build base query - order by createdAt descending to get newest first
    if (params.before) {
      // For pagination: fetch messages before the given timestamp
      const beforeDate = new Date(params.before)
      const beforeTimestamp = Timestamp.fromDate(beforeDate)
      
      if (params.chatId) {
        q = query(ref, where('chatId', '==', params.chatId), where('createdAt', '<', beforeTimestamp), orderBy('createdAt', 'desc'))
      } else if (params.groupId) {
        q = query(ref, where('groupId', '==', params.groupId), where('createdAt', '<', beforeTimestamp), orderBy('createdAt', 'desc'))
      } else {
        q = query(ref, where('createdAt', '<', beforeTimestamp), orderBy('createdAt', 'desc'))
      }
    } else {
      // Initial load: get latest messages
      if (params.chatId) {
        q = query(ref, where('chatId', '==', params.chatId), orderBy('createdAt', 'desc'))
      } else if (params.groupId) {
        q = query(ref, where('groupId', '==', params.groupId), orderBy('createdAt', 'desc'))
      } else {
        q = query(ref, orderBy('createdAt', 'desc'))
      }
    }
    
    // Limit results
    if (params.limit) {
      q = query(q, limit(params.limit))
    }
    
    const snapshot = await getDocs(q)
    const messages = await this.processMessageSnapshot(snapshot, params.chatId, params.groupId)
    
    // Reverse to get chronological order (oldest first) for display
    return messages.reverse()
  }

  async createMessage(data: { content: string; senderId: string; chatId?: string | null; groupId?: string | null; replyToId?: string | null; imageUrl?: string | null }): Promise<MessageWithDetails> {
    const ref = doc(collection(getDb(), 'messages'))
    let encryptedContent = data.content
    let encryptedImageUrl: string | null = null
    
    // 🚀 PERFORMANCE: Use static import instead of dynamic import
    // CRITICAL: Must encrypt with the same chatId/groupId that will be used for decryption!
    try {
      if (!isEncrypted(data.content)) {
        // Pass chatId/groupId to encrypt so decryption uses the same key
        encryptedContent = encrypt(data.content, data.chatId || null, data.groupId || null)
      }
    } catch (e) { 
      console.error('Encryption error in createMessage:', e)
    }
    
    // 🖼️ NEW: Encrypt base64 image data if it's a data URI (not a regular URL)
    // This allows storing images encrypted in Firestore instead of using Storage
    if (data.imageUrl && data.imageUrl.startsWith('data:')) {
      try {
        // Extract base64 string from data URI and encrypt it
        const base64String = extractBase64FromDataUri(data.imageUrl)
        encryptedImageUrl = encrypt(base64String, data.chatId || null, data.groupId || null)
      } catch (e) {
        console.error('Error encrypting image:', e)
        // Fallback: store as-is if encryption fails
        encryptedImageUrl = data.imageUrl
      }
    } else {
      // Backward compatibility: if it's a regular URL (from Storage), keep it as is
      encryptedImageUrl = data.imageUrl || null
    }
    
    const now = Timestamp.now()
    const msgData = {
      content: encryptedContent,
      senderId: data.senderId,
      chatId: data.chatId || null,
      groupId: data.groupId || null,
      replyToId: data.replyToId || null,
      imageUrl: encryptedImageUrl,
      deletedForEveryone: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    }

    const batch = [setDoc(ref, msgData)]
    const lastMsg = { id: ref.id, content: encryptedContent, senderId: data.senderId, createdAt: now, updatedAt: now }
    
    if (data.chatId) batch.push(updateDoc(doc(getDb(), 'chats', data.chatId), { lastMessage: lastMsg, updatedAt: now }))
    if (data.groupId) batch.push(updateDoc(doc(getDb(), 'groups', data.groupId), { lastMessage: lastMsg, updatedAt: now }))
    
    await Promise.all(batch)

    return {
      id: ref.id,
      ...data,
      content: data.content, // Return plain text for UI
      imageUrl: data.imageUrl || null,
      deletedForEveryone: false,
      deletedAt: null,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
      reactions: [],
      replyTo: null,
      sender: undefined
    }
  }

  async deleteMessage(id: string): Promise<void> {
    await updateDoc(doc(getDb(), 'messages', id), { deletedForEveryone: true, content: '', deletedAt: Timestamp.now() })
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const q = query(collection(getDb(), 'message_reactions'), where('messageId', '==', messageId), where('userId', '==', userId), where('emoji', '==', emoji), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) {
      await deleteDoc(snap.docs[0].ref)
      throw new Error('Reaction removed')
    }
    const ref = doc(collection(getDb(), 'message_reactions'))
    const now = Timestamp.now()
    const data = { messageId, userId, emoji, createdAt: now }
    await setDoc(ref, data)
    return { id: ref.id, ...data, createdAt: now.toDate() }
  }

  async getReactionsByMessageId(messageId: string): Promise<MessageReaction[]> {
    const q = query(collection(getDb(), 'message_reactions'), where('messageId', '==', messageId), orderBy('createdAt', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: this.toDate(d.data().createdAt) } as MessageReaction))
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const q = query(collection(getDb(), 'message_reactions'), where('messageId', '==', messageId), where('userId', '==', userId), where('emoji', '==', emoji), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) await deleteDoc(snap.docs[0].ref)
  }

  async updateMessage(id: string, data: Partial<Message>): Promise<Message> {
    const updates: any = { updatedAt: Timestamp.now() }
    if (data.content !== undefined) updates.content = data.content
    if (data.deletedForEveryone !== undefined) updates.deletedForEveryone = data.deletedForEveryone
    await updateDoc(doc(getDb(), 'messages', id), updates)
    const snap = await getDoc(doc(getDb(), 'messages', id))
    if (!snap.exists()) throw new Error('Message not found')
    const m = snap.data()
    return { id: snap.id, ...m, createdAt: this.toDate(m.createdAt), updatedAt: this.toDate(m.updatedAt) } as Message
  }

  async getGroupsByUserId(userId: string): Promise<GroupWithDetails[]> {
    const q = query(collection(getDb(), 'groups'), where('memberIds', 'array-contains', userId))
    const snap = await getDocs(q)
    return snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
      name: data.name,
      avatar: data.avatar || null,
      createdBy: data.createdBy,
        createdAt: this.toDate(data.createdAt),
        updatedAt: this.toDate(data.updatedAt),
        members: [],
        messages: []
      } as GroupWithDetails
    })
  }

  // --- SUBSCRIPTIONS ---

  subscribeToMessages(params: { chatId?: string; groupId?: string }, callback: (messages: MessageWithDetails[]) => void): () => void {
    const ref = collection(getDb(), 'messages')
    let q = query(ref, orderBy('createdAt', 'asc'))
    if (params.chatId) q = query(ref, where('chatId', '==', params.chatId), orderBy('createdAt', 'asc'))
    else if (params.groupId) q = query(ref, where('groupId', '==', params.groupId), orderBy('createdAt', 'asc'))

    // Store current messages to update reactions
    let currentMessages: MessageWithDetails[] = []

    // Subscribe to messages
    const unsubMessages = onSnapshot(q, async (snapshot) => {
      // Fix: Await the processing properly
      currentMessages = await this.processMessageSnapshot(snapshot, params.chatId, params.groupId)
      callback(currentMessages)
    })

    // Subscribe to reactions for messages in this chat/group
    // We'll update reactions whenever they change for any message in our list
    const reactionsRef = collection(getDb(), 'message_reactions')
    
    // Helper to update reactions for current messages
    const updateReactionsForMessages = async (messages: MessageWithDetails[]) => {
      if (messages.length === 0) return messages
      
      // Get all message IDs
      const messageIds = messages.map(m => m.id)
      
      // Fetch reactions for all messages in parallel (Firestore supports up to 10 items in 'in' query)
      // For more than 10 messages, we'll batch the queries
      const reactionPromises: Promise<MessageReaction[]>[] = []
      
      // Process in batches of 10 (Firestore 'in' query limit)
      for (let i = 0; i < messageIds.length; i += 10) {
        const batch = messageIds.slice(i, i + 10)
        const q = query(reactionsRef, where('messageId', 'in', batch), orderBy('createdAt', 'asc'))
        reactionPromises.push(
          getDocs(q).then(snap => 
            snap.docs.map(d => ({
              id: d.id,
              ...d.data(),
              createdAt: this.toDate(d.data().createdAt)
            } as MessageReaction))
          )
        )
      }
      
      const allReactions = (await Promise.all(reactionPromises)).flat()
      
      // Group reactions by messageId
      const reactionsByMessage = new Map<string, MessageReaction[]>()
      allReactions.forEach(reaction => {
        const msgId = reaction.messageId
        if (!reactionsByMessage.has(msgId)) {
          reactionsByMessage.set(msgId, [])
        }
        reactionsByMessage.get(msgId)!.push(reaction)
      })

      // Update messages with reactions
      return messages.map(msg => ({
        ...msg,
        reactions: (reactionsByMessage.get(msg.id) || []).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      }))
    }

    // Subscribe to reactions - listen for any changes
    const unsubReactions = onSnapshot(reactionsRef, async (reactionsSnapshot) => {
      // Only update if we have messages
      if (currentMessages.length === 0) return
      
      // Get message IDs from current messages
      const messageIds = new Set(currentMessages.map(m => m.id))
      
      // Check if any reaction change affects our messages
      const changes = reactionsSnapshot.docChanges()
      const relevantChanges = changes.some(change => {
        const reaction = change.doc.data()
        return messageIds.has(reaction.messageId)
      })
      
      if (relevantChanges) {
        // Update reactions for all messages
        const updatedMessages = await updateReactionsForMessages(currentMessages)
        // Only update if reactions actually changed
        const hasChanges = updatedMessages.some((msg, idx) => {
          const oldReactions = currentMessages[idx]?.reactions || []
          const newReactions = msg.reactions || []
          if (oldReactions.length !== newReactions.length) return true
          return oldReactions.some((r, i) => r.id !== newReactions[i]?.id)
        })
        
        if (hasChanges) {
          currentMessages = updatedMessages
          callback(updatedMessages)
        }
      }
    })

    return () => {
      unsubMessages()
      unsubReactions()
    }
  }

  subscribeToChats(userId: string, callback: (chats: ChatWithDetails[]) => void): () => void {
    const q1 = query(collection(getDb(), 'chats'), where('userId1', '==', userId))
    const q2 = query(collection(getDb(), 'chats'), where('userId2', '==', userId))
    
    const chatsMap = new Map<string, ChatWithDetails>()
    
    const handleSnap = async (snap: QuerySnapshot) => {
      // Process all docs in parallel
      const chatPromises = snap.docs.map(async (docSnap) => {
        const data = docSnap.data()
        const chat: ChatWithDetails = {
                id: docSnap.id,
          userId1: data.userId1,
          userId2: data.userId2,
          createdAt: this.toDate(data.createdAt),
          updatedAt: this.toDate(data.updatedAt)
        }
        
        // Load users
        if (data.userId1) chat.user1 = (await this.getUserById(data.userId1)) || undefined
        if (data.userId2) chat.user2 = (await this.getUserById(data.userId2)) || undefined

        // Process Last Message (Denormalized)
        if (data.lastMessage) {
          const lm = data.lastMessage
          let content = lm.content || ''
          
          // 🚀 PERFORMANCE: Decrypt at adapter level using static import
          // CRITICAL: Decrypt using the chat's ID (docSnap.id is the chatId)
          if (content && isEncrypted(content)) {
            try {
              // Use chatId (docSnap.id) for decryption - this is a chat, not a group
              const decrypted = decrypt(content, docSnap.id, null)
              // Only use if decryption succeeded
              if (decrypted && decrypted !== content && !decrypted.startsWith('ENC:')) {
                content = decrypted
              } else {
                console.error('❌ Decryption FAILED in subscribeToChats for chat:', docSnap.id, {
                  contentPreview: content.substring(0, 30),
                  decryptedPreview: decrypted?.substring(0, 30)
                })
              }
            } catch (e) { 
              console.error('❌ Decryption exception in subscribeToChats:', e, 'chatId:', docSnap.id)
            }
          }

          chat.messages = [{
            id: lm.id,
            content, // This should now always be decrypted
            senderId: lm.senderId,
            createdAt: this.toDate(lm.createdAt),
            updatedAt: this.toDate(lm.updatedAt),
            sender: (await this.getUserById(lm.senderId)) || undefined,
            deletedForEveryone: false,
            reactions: [],
            chatId: docSnap.id,
            groupId: null,
            replyTo: null,
            replyToId: null,
            deletedAt: null
          } as MessageWithDetails]
        }
        
        return chat
      })

      const processedChats = await Promise.all(chatPromises)
      processedChats.forEach(c => chatsMap.set(c.id, c))
      
      const sorted = Array.from(chatsMap.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      callback(sorted)
    }

    const u1 = onSnapshot(q1, handleSnap)
    const u2 = onSnapshot(q2, handleSnap)

    return () => { u1(); u2(); }
  }

  // --- HELPER FOR MESSAGES ---
  private async processMessageSnapshot(snapshot: QuerySnapshot, chatId?: string, groupId?: string): Promise<MessageWithDetails[]> {
      const userIds = new Set<string>()
    snapshot.docs.forEach(d => {
      const m = d.data()
      userIds.add(m.senderId)
      if (m.replyToId) userIds.add(m.replyToId) // Not sender of reply, but we'd need to fetch that msg
    })

    const usersMap = new Map<string, User>()
    await Promise.all(Array.from(userIds).map(async (uid) => {
      const u = await this.getUserById(uid)
      if (u) usersMap.set(uid, u)
    }))

    // 🚀 PERFORMANCE: Decrypt messages at adapter level (not in UI) using static import
    // This prevents blocking the UI thread on every render
    const messagePromises = snapshot.docs.map(async (docSnap) => {
      const m = docSnap.data()
      let content = m.content || ''
      
      // CRITICAL: Use the message's own chatId/groupId from the document, not the function params!
      const msgChatId = m.chatId || null
      const msgGroupId = m.groupId || null
      
      // ALWAYS decrypt if content is encrypted - do it once here, not in the UI
      if (content && isEncrypted(content)) {
        try {
          // Use the message's own chatId/groupId for decryption
          const decrypted = decrypt(content, msgChatId, msgGroupId)
          // Only use if decryption succeeded (different and not still encrypted)
          if (decrypted && decrypted !== content && !decrypted.startsWith('ENC:')) {
            content = decrypted
          } else {
            // Decryption failed - log for debugging
            console.error('❌ Decryption FAILED for message:', docSnap.id, {
              msgChatId,
              msgGroupId,
              contentPreview: content.substring(0, 30),
              decryptedPreview: decrypted?.substring(0, 30)
            })
          }
        } catch (e) { 
          console.error('❌ Decryption exception in processMessageSnapshot:', e, 'messageId:', docSnap.id)
        }
      }

      // 🖼️ NEW: Decrypt image data if it's encrypted (base64 stored in Firestore)
      // Backward compatibility: if it's a regular URL (from Storage), keep it as is
      let imageUrl: string | null = m.imageUrl || null
      if (imageUrl && isEncrypted(imageUrl)) {
        try {
          // Decrypt the base64 string
          const decryptedBase64 = decrypt(imageUrl, msgChatId, msgGroupId)
          // Convert back to data URI for display
          if (decryptedBase64 && decryptedBase64 !== imageUrl && !decryptedBase64.startsWith('ENC:')) {
            imageUrl = createDataUriFromBase64(decryptedBase64, 'image/jpeg')
          }
        } catch (e) {
          console.error('Error decrypting image:', e, 'messageId:', docSnap.id)
          // If decryption fails, set to null to avoid showing broken image
          imageUrl = null
        }
      }

      const msg: MessageWithDetails = {
          id: docSnap.id,
        content,
        senderId: m.senderId,
        chatId: m.chatId,
        groupId: m.groupId,
        replyToId: m.replyToId,
        imageUrl,
        deletedForEveryone: m.deletedForEveryone || false,
        deletedAt: m.deletedAt ? this.toDate(m.deletedAt) : null,
        createdAt: this.toDate(m.createdAt),
        updatedAt: this.toDate(m.updatedAt),
        sender: usersMap.get(m.senderId),
        reactions: [],
        replyTo: null
      }

      // Reactions will be loaded in batch below (optimization)
      
      // Load Reply (Basic)
      if (m.replyToId) {
         // Optimization: If we already have the replied msg in this snapshot, use it
         // Otherwise fetch (keeping it simple here)
         const replyRef = await getDoc(doc(getDb(), 'messages', m.replyToId))
         if (replyRef.exists()) {
            const rd = replyRef.data()
            // 🚀 PERFORMANCE: Decrypt reply content at adapter level using static import
            let rContent = rd.content
            const replyChatId = rd.chatId || null
            const replyGroupId = rd.groupId || null
            if (rContent && isEncrypted(rContent)) {
                try {
                  const decrypted = decrypt(rContent, replyChatId, replyGroupId)
                  // Only use if decryption succeeded
                  if (decrypted && decrypted !== rContent && !decrypted.startsWith('ENC:')) {
                    rContent = decrypted
                  }
            } catch (e) {
              console.error('Decryption error for reply content:', e)
            }
            }

            // 🖼️ Decrypt reply image if encrypted
            let rImageUrl: string | null = rd.imageUrl || null
            if (rImageUrl && isEncrypted(rImageUrl)) {
              try {
                const decryptedBase64 = decrypt(rImageUrl, replyChatId, replyGroupId)
                if (decryptedBase64 && decryptedBase64 !== rImageUrl && !decryptedBase64.startsWith('ENC:')) {
                  rImageUrl = createDataUriFromBase64(decryptedBase64, 'image/jpeg')
                }
              } catch (e) {
                console.error('Error decrypting reply image:', e)
                rImageUrl = null
              }
            }

            msg.replyTo = {
               id: replyRef.id,
               content: rContent,
               senderId: rd.senderId,
               createdAt: this.toDate(rd.createdAt),
               updatedAt: this.toDate(rd.updatedAt),
               sender: await this.getUserById(rd.senderId) || undefined,
               chatId: rd.chatId, groupId: rd.groupId, deletedForEveryone: rd.deletedForEveryone,
               imageUrl: rImageUrl,
               reactions: [], replyToId: null, replyTo: null, deletedAt: null
            }
         }
      }

      return msg
    })

    const messages = await Promise.all(messagePromises)
    
    // 🚀 PERFORMANCE OPTIMIZATION: Batch fetch reactions for all messages at once
    // Instead of making N individual requests (one per message), batch them in groups of 10
    // This reduces network latency significantly
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.id)
      const reactionsRef = collection(getDb(), 'message_reactions')
      const reactionPromises: Promise<MessageReaction[]>[] = []
      
      // Process in batches of 10 (Firestore 'in' query limit)
      for (let i = 0; i < messageIds.length; i += 10) {
        const batch = messageIds.slice(i, i + 10)
        const q = query(reactionsRef, where('messageId', 'in', batch), orderBy('createdAt', 'asc'))
        reactionPromises.push(
          getDocs(q).then(snap => 
            snap.docs.map(d => ({
              id: d.id,
              ...d.data(),
              createdAt: this.toDate(d.data().createdAt)
            } as MessageReaction))
          )
        )
      }
      
      const allReactions = (await Promise.all(reactionPromises)).flat()
      
      // Group reactions by messageId
      const reactionsByMessage = new Map<string, MessageReaction[]>()
      allReactions.forEach(reaction => {
        const msgId = reaction.messageId
        if (!reactionsByMessage.has(msgId)) {
          reactionsByMessage.set(msgId, [])
        }
        reactionsByMessage.get(msgId)!.push(reaction)
      })

      // Assign reactions to messages
      return messages.map(msg => ({
        ...msg,
        reactions: (reactionsByMessage.get(msg.id) || []).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      }))
    }

    return messages
  }
  
  // Missing methods placeholders for interface compliance
  async getRooms(): Promise<Room[]> { return [] } // Implement properly if needed
  async getRoomById(id: string): Promise<Room | null> { return null }
  async createRoom(data: any): Promise<Room> { throw new Error("Not implemented") }
  async blockUser(u: string, b: string): Promise<BlockedUser> { throw new Error("Not implemented") }
  async unblockUser(u: string, b: string): Promise<void> {}
  async getBlockedUsers(u: string): Promise<BlockedUser[]> { return [] }
  async getGroupById(id: string): Promise<GroupWithDetails | null> { return null }
  async createGroup(data: any): Promise<GroupWithDetails> { throw new Error("Not implemented") }
  async addGroupMember(g: string, u: string): Promise<GroupMember> { throw new Error("Not implemented") }
  async removeGroupMember(g: string, u: string): Promise<void> {}
}