// Encryption utilities for messages and reactions
// Uses crypto-js library for reliable encryption/decryption

import CryptoJS from 'crypto-js'

const ENCRYPTION_PREFIX = 'ENC:'

// 🚀 PERFORMANCE OPTIMIZATION: Cache encryption keys to avoid recalculating PBKDF2 on every call
// This prevents thousands of expensive cryptographic operations per second
const keyCache: Record<string, string> = {}

// Get master secret used to derive chat keys.
// Security notes:
// - On the client, we MUST use NEXT_PUBLIC_ENCRYPTION_SECRET (Next.js only exposes NEXT_PUBLIC_* to client)
// - On the server, we can use either NEXT_PUBLIC_ENCRYPTION_SECRET or ENCRYPTION_SECRET
// - For production, ensure NEXT_PUBLIC_ENCRYPTION_SECRET is set in .env.local
// - Note: NEXT_PUBLIC_* variables are exposed in the client bundle, but this is necessary for client-side encryption
function getMasterSecret(): string {
  // Try NEXT_PUBLIC_ENCRYPTION_SECRET first (works on both client and server)
  const publicSecret = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET
  if (publicSecret) {
    return publicSecret
  }
  
  // Fallback to ENCRYPTION_SECRET (server-side only)
  const serverSecret = process.env.ENCRYPTION_SECRET
  if (serverSecret) {
    // If we're on the client and only ENCRYPTION_SECRET is set, warn the user
    if (typeof window !== 'undefined') {
      console.error('⚠️ NEXT_PUBLIC_ENCRYPTION_SECRET not set! ENCRYPTION_SECRET is not available on the client.')
      console.error('⚠️ Set NEXT_PUBLIC_ENCRYPTION_SECRET in .env.local for client-side encryption to work.')
      return 'papel-chat-dev-secret-CHANGE-IN-PRODUCTION'
    }
    return serverSecret
  }
  
  // No secret found - use fallback
  if (typeof window !== 'undefined') {
    console.error('⚠️ NEXT_PUBLIC_ENCRYPTION_SECRET not set! Using fallback (INSECURE).')
    console.error('⚠️ Set NEXT_PUBLIC_ENCRYPTION_SECRET in .env.local for production.')
    return 'papel-chat-dev-secret-CHANGE-IN-PRODUCTION'
  }
  
  console.warn('ENCRYPTION_SECRET not set on server. Using dev fallback. Set NEXT_PUBLIC_ENCRYPTION_SECRET for production.')
  return 'papel-chat-server-dev-fallback'
}

// Generate a shared encryption key for a chat
// This ensures all participants in a chat can decrypt each other's messages
// Uses PBKDF2 for key derivation (more secure than SHA256)
function getChatEncryptionKey(chatId: string | null, groupId: string | null): string {
  // Use chatId or groupId to derive a shared key
  // All users in the same chat will generate the same key
  const contextId = chatId || groupId || 'default'

  // 🚀 OPTIMIZATION: Check if we already have the key cached
  // This prevents recalculating PBKDF2 (10,000 iterations) for every message in the same chat
  if (keyCache[contextId]) {
    return keyCache[contextId]
  }

  const masterSecret = getMasterSecret()

  // Use PBKDF2 for key derivation (more secure than SHA256)
  // Parameters: password, salt, iterations, keyLength
  // This makes brute-force attacks much harder
  // ⚠️ This operation is computationally expensive (10,000 iterations) - we only do it once per chat
  const salt = CryptoJS.SHA256(contextId + 'papel-chat-salt').toString()
  const key = CryptoJS.PBKDF2(contextId + masterSecret, salt, {
    keySize: 256/32, // 256 bits = 8 words
    iterations: 10000 // High iteration count for security
  })

  const keyString = key.toString()
  
  // 🚀 Save in cache to avoid recalculating for subsequent messages in the same chat
  keyCache[contextId] = keyString
  
  return keyString
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
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)

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
