// Database adapter interface - allows switching between Firebase and Prisma

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  username?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Chat {
  id: string
  userId1: string
  userId2?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  content: string
  senderId: string
  chatId?: string | null
  groupId?: string | null
  replyToId?: string | null
  imageUrl?: string | null
  fileMetadata?: string | null // JSON string with file metadata (encrypted)
  deletedForEveryone: boolean
  deletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: Date
}

export interface Group {
  id: string
  name: string
  avatar?: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  joinedAt: Date
}

export interface Room {
  id: string
  name: string
  topic?: string | null
  createdBy: string
  shareableId?: string | null
  isTemporary?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BlockedUser {
  id: string
  userId: string
  blockedId: string
  createdAt: Date
}

// Extended types for API responses
export interface ChatWithDetails extends Chat {
  user1?: User
  user2?: User | null
  messages?: Message[]
}

export interface MessageWithDetails extends Message {
  sender?: User
  replyTo?: MessageWithDetails | null
  reactions?: MessageReaction[]
}

export interface GroupWithDetails extends Group {
  members?: GroupMember[]
  messages?: Message[]
}

// Database adapter interface
export interface DatabaseAdapter {
  // User operations
  getUserByEmail(email: string): Promise<User | null>
  getUserByUsername(username: string): Promise<User | null>
  searchUsersByUsername(query: string, limit?: number): Promise<User[]>
  createUser(data: { email: string; name: string; avatar?: string; username?: string | null }): Promise<User>
  updateUser(id: string, data: { name?: string; avatar?: string | null; username?: string | null }): Promise<User>
  getUserById(id: string): Promise<User | null>

  // Chat operations
  getChatsByUserId(userId: string): Promise<ChatWithDetails[]>
  getChatById(id: string): Promise<ChatWithDetails | null>
  createChat(data: { userId1: string; userId2?: string | null }): Promise<Chat>
  updateChat(id: string, data: Partial<Chat>): Promise<Chat>
  deleteChat(id: string): Promise<void>

  // Message operations
  getMessages(params: {
    chatId?: string
    groupId?: string
    after?: string
    limit?: number
  }): Promise<MessageWithDetails[]>
  createMessage(data: {
    content: string
    senderId: string
    chatId?: string | null
    groupId?: string | null
    replyToId?: string | null
    imageUrl?: string | null
    fileMetadata?: string | null
  }): Promise<MessageWithDetails>
  updateMessage(id: string, data: Partial<Message>): Promise<Message>
  deleteMessage(id: string): Promise<void>

  // Reaction operations
  addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction>
  removeReaction(messageId: string, userId: string, emoji: string): Promise<void>
  getReactionsByMessageId(messageId: string): Promise<MessageReaction[]>

  // Group operations
  getGroupsByUserId(userId: string): Promise<GroupWithDetails[]>
  getGroupById(id: string): Promise<GroupWithDetails | null>
  createGroup(data: {
    id?: string
    name: string
    avatar?: string | null
    createdBy: string
    memberIds?: string[]
  }): Promise<GroupWithDetails>
  addGroupMember(groupId: string, userId: string): Promise<GroupMember>
  removeGroupMember(groupId: string, userId: string): Promise<void>

  // Room operations
  getRooms(): Promise<Room[]>
  getRoomById(id: string): Promise<Room | null>
  createRoom(data: {
    name: string
    topic?: string | null
    createdBy: string
    shareableId?: string | null
    isTemporary?: boolean
  }): Promise<Room>

  // Blocked user operations
  blockUser(userId: string, blockedId: string): Promise<BlockedUser>
  unblockUser(userId: string, blockedId: string): Promise<void>
  getBlockedUsers(userId: string): Promise<BlockedUser[]>

  // Real-time subscriptions (Firebase-specific, optional for Prisma)
  subscribeToMessages(
    params: { chatId?: string; groupId?: string },
    callback: (messages: MessageWithDetails[]) => void
  ): () => void // Returns unsubscribe function

  subscribeToChats(
    userId: string,
    callback: (chats: ChatWithDetails[]) => void
  ): () => void // Returns unsubscribe function
}

