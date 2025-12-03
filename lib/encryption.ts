// Encryption utilities for messages and reactions
// Uses crypto-js library for symmetric encryption/decryption

import CryptoJS from 'crypto-js'

const ENCRYPTION_PREFIX = 'ENC:'

// Master secret handling:
// - Server: set `ENCRYPTION_SECRET` (no NEXT_PUBLIC_ prefix) in server env.
// - Client: no build-time secret. We derive a per-client key persisted in localStorage
//   to avoid baking any secret into the bundle. For true E2EE, implement a proper
//   key exchange (out of scope here).
function getMasterSecret(): string {
  if (typeof window !== 'undefined') {
    try {
      const storageKey = 'papel-chat-encryption-key'
      let clientKey = localStorage.getItem(storageKey)
      if (!clientKey) {
        // generate 32 random bytes and convert to hex
        const arr = new Uint8Array(32)
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
          crypto.getRandomValues(arr)
          clientKey = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
        } else {
          // fallback (not cryptographically secure)
          clientKey = Array.from({ length: 32 }).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
        }
        try { localStorage.setItem(storageKey, clientKey) } catch (e) { /* ignore */ }
      }
      return clientKey || 'papel-chat-dev-fallback'
    } catch (err) {
      console.warn('Failed to access localStorage for encryption key, using fallback.', err)
      return 'papel-chat-dev-fallback'
    }
  }

  const serverSecret = process.env.ENCRYPTION_SECRET
  if (!serverSecret) {
    console.warn('ENCRYPTION_SECRET not set on server. Using dev fallback. Set ENCRYPTION_SECRET for production.')
    return 'papel-chat-server-dev-fallback'
  }
  return serverSecret
}

// Derive a chat-specific key using PBKDF2
function getChatEncryptionKey(chatId: string | null, groupId: string | null): string {
  const contextId = chatId || groupId || 'default'
  const masterSecret = getMasterSecret()
  const salt = CryptoJS.SHA256(contextId + 'papel-chat-salt').toString()
  const key = CryptoJS.PBKDF2(contextId + masterSecret, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  })
  return key.toString()
}

export function encrypt(text: string, chatId?: string | null, groupId?: string | null): string {
  if (!text || typeof text !== 'string') return text
  try {
    if (text.startsWith(ENCRYPTION_PREFIX)) return text
    const key = getChatEncryptionKey(chatId || null, groupId || null)
    const encrypted = CryptoJS.AES.encrypt(text, key).toString()
    return ENCRYPTION_PREFIX + encrypted
  } catch (err) {
    console.error('Encryption error:', err)
    return text
  }
}

export function decrypt(encryptedText: string, chatId?: string | null, groupId?: string | null): string {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText
  try {
    if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) return encryptedText
    const encrypted = encryptedText.substring(ENCRYPTION_PREFIX.length)
    const key = getChatEncryptionKey(chatId || null, groupId || null)
    const decrypted = CryptoJS.AES.decrypt(encrypted, key)
    let decryptedText = decrypted.toString(CryptoJS.enc.Utf8)

    if (!decryptedText && typeof window !== 'undefined') {
      // Fallback: try client-stored key for backward compatibility
      const oldKey = localStorage.getItem('papel-chat-encryption-key')
      if (oldKey) {
        const decryptedOld = CryptoJS.AES.decrypt(encrypted, oldKey)
        decryptedText = decryptedOld.toString(CryptoJS.enc.Utf8)
      }
    }

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

export function isEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return text.startsWith(ENCRYPTION_PREFIX)
}

// Master secret handling:
// - Server: set `ENCRYPTION_SECRET` (no NEXT_PUBLIC_ prefix) in server env.
// - Client: no build-time secret. We derive a per-client key persisted in localStorage
//   to avoid baking any secret into the bundle. For true E2EE, implement a proper
//   key exchange (out of scope here).
function getMasterSecret(): string {
  if (typeof window !== 'undefined') {
    try {
      const storageKey = 'papel-chat-encryption-key'
      let clientKey = localStorage.getItem(storageKey)
      if (!clientKey) {
        // generate 32 random bytes and convert to hex
        const arr = new Uint8Array(32)
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
          crypto.getRandomValues(arr)
          clientKey = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
        } else {
          // fallback (not cryptographically secure)
          clientKey = Array.from({ length: 32 }).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
        }
        try { localStorage.setItem(storageKey, clientKey) } catch (e) { /* ignore */ }
      }
      return clientKey || 'papel-chat-dev-fallback'
    } catch (err) {
      console.warn('Failed to access localStorage for encryption key, using fallback.', err)
      return 'papel-chat-dev-fallback'
    }
  }

  const serverSecret = process.env.ENCRYPTION_SECRET
  if (!serverSecret) {
    console.warn('ENCRYPTION_SECRET not set on server. Using dev fallback. Set ENCRYPTION_SECRET for production.')
    return 'papel-chat-server-dev-fallback'
  }
  return serverSecret
}

// Derive a chat-specific key using PBKDF2
function getChatEncryptionKey(chatId: string | null, groupId: string | null): string {
  const contextId = chatId || groupId || 'default'
  const masterSecret = getMasterSecret()
  const salt = CryptoJS.SHA256(contextId + 'papel-chat-salt').toString()
  const key = CryptoJS.PBKDF2(contextId + masterSecret, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  })
  return key.toString()
}

export function encrypt(text: string, chatId?: string | null, groupId?: string | null): string {
  if (!text || typeof text !== 'string') return text
  try {
    if (text.startsWith(ENCRYPTION_PREFIX)) return text
    const key = getChatEncryptionKey(chatId || null, groupId || null)
    const encrypted = CryptoJS.AES.encrypt(text, key).toString()
    return ENCRYPTION_PREFIX + encrypted
  } catch (err) {
    console.error('Encryption error:', err)
    return text
  }
}

export function decrypt(encryptedText: string, chatId?: string | null, groupId?: string | null): string {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText
  try {
    if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) return encryptedText
    const encrypted = encryptedText.substring(ENCRYPTION_PREFIX.length)
    const key = getChatEncryptionKey(chatId || null, groupId || null)
    const decrypted = CryptoJS.AES.decrypt(encrypted, key)
    let decryptedText = decrypted.toString(CryptoJS.enc.Utf8)

    if (!decryptedText && typeof window !== 'undefined') {
      // Fallback: try client-stored key for backward compatibility
      const oldKey = localStorage.getItem('papel-chat-encryption-key')
      if (oldKey) {
        const decryptedOld = CryptoJS.AES.decrypt(encrypted, oldKey)
        decryptedText = decryptedOld.toString(CryptoJS.enc.Utf8)
      }
    }

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

export function isEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return text.startsWith(ENCRYPTION_PREFIX)
}
// Encryption utilities for messages and reactions
// Uses crypto-js library for reliable encryption/decryption

import CryptoJS from 'crypto-js'

const ENCRYPTION_PREFIX = 'ENC:'

// Get master secret from environment variable
// IMPORTANT: Set NEXT_PUBLIC_ENCRYPTION_SECRET in your .env.local file
// Encryption utilities for messages and reactions
// Uses crypto-js library for reliable encryption/decryption

import CryptoJS from 'crypto-js'

const ENCRYPTION_PREFIX = 'ENC:'

// Get master secret used to derive chat keys.
// Security notes:
// - Do NOT embed production secrets in client builds.
// - On the server, set a non-public env var `ENCRYPTION_SECRET` (no NEXT_PUBLIC_ prefix).
// - On the client we avoid reading any build-time secret; instead we derive a per-client
//   key stored in `localStorage` (or your preferred secure storage) so no master secret
//   is baked into the bundle. For real end-to-end security you should implement a proper
//   key exchange and key management strategy.
function getMasterSecret(): string {
  if (typeof window !== 'undefined') {
    try {
      const storageKey = 'papel-chat-encryption-key'
      let clientKey = localStorage.getItem(storageKey)
      if (!clientKey) {
        // Generate a random 32-byte key (hex) for this client and persist locally
        const arr = new Uint8Array(32)
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
          crypto.getRandomValues(arr)
          clientKey = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
        } else {
          import CryptoJS from 'crypto-js'

          const ENCRYPTION_PREFIX = 'ENC:'

          // Generate a shared encryption key for a chat
          // This ensures all participants in a chat can decrypt each other's messages
          // Uses PBKDF2 for key derivation (more secure than SHA256)
          function getChatEncryptionKey(chatId: string | null, groupId: string | null): string {
            // Use chatId or groupId to derive a shared key
            // All users in the same chat will generate the same key
            const contextId = chatId || groupId || 'default'
            const masterSecret = getMasterSecret()
  
            // Use PBKDF2 for key derivation (more secure than SHA256)
            // Encryption utilities for messages and reactions
            // Uses crypto-js library for reliable encryption/decryption

            import CryptoJS from 'crypto-js'

            const ENCRYPTION_PREFIX = 'ENC:'

            // Get master secret used to derive chat keys.
            // Security notes:
            // - Do NOT embed production secrets in client builds.
            // - On the server, set a non-public env var `ENCRYPTION_SECRET` (no NEXT_PUBLIC_ prefix).
            // - On the client we avoid reading any build-time secret; instead we derive a per-client
            //   key stored in `localStorage` (or your preferred secure storage) so no master secret
            //   is baked into the bundle. For real end-to-end security you should implement a proper
            //   key exchange and key management strategy.
            function getMasterSecret(): string {
              if (typeof window !== 'undefined') {
                try {
                  const storageKey = 'papel-chat-encryption-key'
                  let clientKey = localStorage.getItem(storageKey)
                  if (!clientKey) {
                    // Generate a random 32-byte key (hex) for this client and persist locally
                    const arr = new Uint8Array(32)
                    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
                      crypto.getRandomValues(arr)
                      clientKey = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
                    } else {
                      // Fallback: use Math.random (not cryptographically secure)
                      clientKey = Array.from({ length: 32 }).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
                    }
                    try { localStorage.setItem(storageKey, clientKey) } catch (e) { /* ignore */ }
                    console.warn('No client encryption key found — generated a local ephemeral key. For production use a secure key exchange.')
                  }
                  return clientKey || 'papel-chat-dev-fallback'
                } catch (error) {
                  console.warn('Error accessing localStorage for encryption key, using fallback.', error)
                  return 'papel-chat-dev-fallback'
                }
              }

              // Server-side: read a non-public env var. This must NOT be exposed to the client.
              const serverSecret = process.env.ENCRYPTION_SECRET
              if (!serverSecret) {
                console.warn('ENCRYPTION_SECRET not set on server. Encryption will still work for development, but set ENCRYPTION_SECRET for production.')
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
                // Encryption utilities for messages and reactions
                // Uses crypto-js library for reliable encryption/decryption

                import CryptoJS from 'crypto-js'

                const ENCRYPTION_PREFIX = 'ENC:'

                // Master secret handling:
                // - Server: set `ENCRYPTION_SECRET` (no NEXT_PUBLIC_ prefix) in server env.
                // - Client: no build-time secret. We derive a per-client key persisted in localStorage
                //   to avoid baking any secret into the bundle. For true E2EE, implement proper
                //   key exchange (out of scope here).
                function getMasterSecret(): string {
                  if (typeof window !== 'undefined') {
                    try {
                      const storageKey = 'papel-chat-encryption-key'
                      let clientKey = localStorage.getItem(storageKey)
                      if (!clientKey) {
                        const arr = new Uint8Array(32)
                        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
                          crypto.getRandomValues(arr)
                          clientKey = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
                        } else {
                          clientKey = Array.from({ length: 32 }).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
                        }
                        try { localStorage.setItem(storageKey, clientKey) } catch (e) { /* ignore */ }
                      }
                      return clientKey || 'papel-chat-dev-fallback'
                    } catch (err) {
                      console.warn('Failed to access localStorage for encryption key, using fallback.', err)
                      return 'papel-chat-dev-fallback'
                    }
                  }

                  const serverSecret = process.env.ENCRYPTION_SECRET
                  if (!serverSecret) {
                    console.warn('ENCRYPTION_SECRET not set on server. Using dev fallback. Set ENCRYPTION_SECRET for production.')
                    return 'papel-chat-server-dev-fallback'
                  }
                  return serverSecret
                }

                // Derive a chat-specific key using PBKDF2
                function getChatEncryptionKey(chatId: string | null, groupId: string | null): string {
                  const contextId = chatId || groupId || 'default'
                  const masterSecret = getMasterSecret()
                  const salt = CryptoJS.SHA256(contextId + 'papel-chat-salt').toString()
                  const key = CryptoJS.PBKDF2(contextId + masterSecret, salt, {
                    keySize: 256 / 32,
                    iterations: 10000,
                  })
                  return key.toString()
                }

                export function encrypt(text: string, chatId?: string | null, groupId?: string | null): string {
                  if (!text || typeof text !== 'string') return text
                  try {
                    if (text.startsWith(ENCRYPTION_PREFIX)) return text
                    const key = getChatEncryptionKey(chatId || null, groupId || null)
                    const encrypted = CryptoJS.AES.encrypt(text, key).toString()
                    return ENCRYPTION_PREFIX + encrypted
                  } catch (err) {
                    console.error('Encryption error:', err)
                    return text
                  }
                }

                export function decrypt(encryptedText: string, chatId?: string | null, groupId?: string | null): string {
                  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText
                  try {
                    if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) return encryptedText
                    const encrypted = encryptedText.substring(ENCRYPTION_PREFIX.length)
                    const key = getChatEncryptionKey(chatId || null, groupId || null)
                    const decrypted = CryptoJS.AES.decrypt(encrypted, key)
                    let decryptedText = decrypted.toString(CryptoJS.enc.Utf8)

                    if (!decryptedText && typeof window !== 'undefined') {
                      // Fallback: try client-stored key for backward compatibility
                      const oldKey = localStorage.getItem('papel-chat-encryption-key')
                      if (oldKey) {
                        const decryptedOld = CryptoJS.AES.decrypt(encrypted, oldKey)
                        decryptedText = decryptedOld.toString(CryptoJS.enc.Utf8)
                      }
                    }

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

                export function isEncrypted(text: string): boolean {
                  if (!text || typeof text !== 'string') return false
                  return text.startsWith(ENCRYPTION_PREFIX)
                }
