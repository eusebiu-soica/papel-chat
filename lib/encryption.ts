// Encryption utilities for messages and reactions
// Uses crypto-js library for reliable encryption/decryption

import CryptoJS from 'crypto-js'

const ENCRYPTION_PREFIX = 'ENC:'

// Get master secret from environment variable
// IMPORTANT: Set NEXT_PUBLIC_ENCRYPTION_SECRET in your .env.local file
// Use a strong random string (at least 32 characters)
// Example: openssl rand -hex 32
function getMasterSecret(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use environment variable
    const secret = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET
    if (!secret) {
      console.error('⚠️ NEXT_PUBLIC_ENCRYPTION_SECRET not set! Using fallback (INSECURE).')
      console.error('⚠️ Set NEXT_PUBLIC_ENCRYPTION_SECRET in .env.local for production.')
      // Fallback for development only - MUST be set in production
      return 'papel-chat-dev-secret-CHANGE-IN-PRODUCTION'
    }
    return secret
  }
  // Server-side: should not be used for encryption
  return 'server-side-not-used'
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
    
    // Add prefix to identify encrypted content
    return ENCRYPTION_PREFIX + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    // Fallback: return original text if encryption fails
    return text
  }
}

// Decrypt text with chat-specific key
export function decrypt(encryptedText: string, chatId?: string | null, groupId?: string | null): string {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText
  
  try {
    // Check if text is encrypted (has prefix)
    if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) {
      // Not encrypted, return as-is (for backward compatibility with old messages)
      return encryptedText
    }
    
    // Remove prefix
    const encrypted = encryptedText.substring(ENCRYPTION_PREFIX.length)
    
    // Try with chat-specific key first
    const key = getChatEncryptionKey(chatId || null, groupId || null)
    const decrypted = CryptoJS.AES.decrypt(encrypted, key)
    let decryptedText = decrypted.toString(CryptoJS.enc.Utf8)
    
    // If decryption failed, try with old user-specific key (for backward compatibility)
    if (!decryptedText) {
      // Try old key from localStorage if exists
      const oldKey = typeof window !== 'undefined' ? localStorage.getItem('papel-chat-encryption-key') : null
      if (oldKey) {
        const decryptedOld = CryptoJS.AES.decrypt(encrypted, oldKey)
        decryptedText = decryptedOld.toString(CryptoJS.enc.Utf8)
      }
    }
    
    // If still failed, return original
    if (!decryptedText) {
      console.warn('Decryption failed - empty result, returning original')
      return encryptedText
    }
    
    return decryptedText
  } catch (error) {
    console.warn('Decryption error:', error, '- returning original text')
    // Fallback: return original text if decryption fails (might be old unencrypted message)
    return encryptedText
  }
}

// Check if text is encrypted
export function isEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  // Simple check: encrypted content has prefix
  return text.startsWith(ENCRYPTION_PREFIX)
}
