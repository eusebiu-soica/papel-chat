// Encryption utilities for messages and reactions
// Uses crypto-js library for reliable encryption/decryption

import CryptoJS from 'crypto-js'

const ENCRYPTION_PREFIX = 'ENC:'

// Get master secret used to derive chat keys.
// Security notes:
// - On the client, we use NEXT_PUBLIC_ENCRYPTION_SECRET from environment
// - On the server, use ENCRYPTION_SECRET (no NEXT_PUBLIC_ prefix)
// - For production, ensure NEXT_PUBLIC_ENCRYPTION_SECRET is set in .env.local
function getMasterSecret(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ENCRYPTION_SECRET
    const secret = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET
    if (!secret) {
      console.error('⚠️ NEXT_PUBLIC_ENCRYPTION_SECRET not set! Using fallback (INSECURE).')
      console.error('⚠️ Set NEXT_PUBLIC_ENCRYPTION_SECRET in .env.local for production.')
      return 'papel-chat-dev-secret-CHANGE-IN-PRODUCTION'
    }
    return secret
  }
  
  // Server-side: use ENCRYPTION_SECRET (non-public)
  const serverSecret = process.env.ENCRYPTION_SECRET
  if (!serverSecret) {
    console.warn('ENCRYPTION_SECRET not set on server. Using dev fallback. Set ENCRYPTION_SECRET for production.')
    return 'papel-chat-server-dev-fallback'
  }
  return serverSecret
}

// Generate a shared encryption key for a chat
// This ensures all participants in a chat can decrypt each other's messages
// Uses PBKDF2 for key derivation (more secure than SHA256)
function getChatEncryptionKey(chatId: string | null, groupId: string | null): string {
  // Use chatId or groupId to derive a shared key
  // All users in the same chat will generate the same key
  const contextId = chatId || groupId || 'default'
  const masterSecret = getMasterSecret()

  // Use PBKDF2 for key derivation (more secure than SHA256)
  // Parameters: password, salt, iterations, keyLength
  // This makes brute-force attacks much harder
  const salt = CryptoJS.SHA256(contextId + 'papel-chat-salt').toString()
  const key = CryptoJS.PBKDF2(contextId + masterSecret, salt, {
    keySize: 256/32, // 256 bits = 8 words
    iterations: 10000 // High iteration count for security
  })

  return key.toString()
}

// Encrypt text with chat-specific key
export function encrypt(text: string, chatId?: string | null, groupId?: string | null): string {
  if (!text || typeof text !== 'string') return text

  try {
    // Don't encrypt if already encrypted
    if (text.startsWith(ENCRYPTION_PREFIX)) {
      return text
    }

    // Use shared chat key so all participants can decrypt
    const key = getChatEncryptionKey(chatId || null, groupId || null)
    const encrypted = CryptoJS.AES.encrypt(text, key).toString()
    return ENCRYPTION_PREFIX + encrypted
  } catch (err) {
    console.error('Encryption error:', err)
    return text
  }
}

// Decrypt text with chat-specific key
export function decrypt(encryptedText: string, chatId?: string | null, groupId?: string | null): string {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText

  try {
    if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) {
      return encryptedText
    }

    const encrypted = encryptedText.substring(ENCRYPTION_PREFIX.length)
    const key = getChatEncryptionKey(chatId || null, groupId || null)
    const decrypted = CryptoJS.AES.decrypt(encrypted, key)
    let decryptedText = decrypted.toString(CryptoJS.enc.Utf8)

    if (!decryptedText) {
      console.warn('Decryption returned empty string; returning original')
      return encryptedText
    }
    return decryptedText
  } catch (err) {
    console.warn('Decryption error:', err)
    return encryptedText
  }
}

// Check if text is encrypted
export function isEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return text.startsWith(ENCRYPTION_PREFIX)
}
