/**
 * Client-side encryption utilities using Web Crypto API
 * This is a simplified version for browser environments
 */

// Use the same secret key (should match server-side in production)
// In production, this could be exchanged during authentication
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'your-32-character-secret-key!!'

/**
 * Convert string to ArrayBuffer
 */
function str2ab(str) {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

/**
 * Convert ArrayBuffer to string
 */
function ab2str(buffer) {
  const decoder = new TextDecoder()
  return decoder.decode(buffer)
}

/**
 * Convert ArrayBuffer to base64
 */
function ab2base64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 to ArrayBuffer
 */
function base642ab(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Derive a crypto key from the secret
 */
async function deriveKey(secret, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    str2ab(secret),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data using AES-256-GCM (client-side)
 * @param {string|object} data - Data to encrypt
 * @returns {Promise<string>} - Encrypted data in format: salt:iv:tag:encryptedData (base64)
 */
export async function encryptClient(data) {
  try {
    // Convert data to string if it's an object
    const text = typeof data === 'string' ? data : JSON.stringify(data)
    
    // Generate random salt and IV (16 bytes to match server)
    const salt = crypto.getRandomValues(new Uint8Array(64))
    const iv = crypto.getRandomValues(new Uint8Array(16))
    
    // Derive key
    const key = await deriveKey(ENCRYPTION_KEY, salt)
    
    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128  // 16 bytes auth tag
      },
      key,
      str2ab(text)
    )
    
    // In AES-GCM, the auth tag is appended to the ciphertext
    // We need to split it: last 16 bytes are the tag
    const encryptedArray = new Uint8Array(encrypted)
    const ciphertext = encryptedArray.slice(0, -16)
    const tag = encryptedArray.slice(-16)
    
    // Combine salt, IV, tag, and encrypted data (matching server format)
    const result = `${ab2base64(salt)}:${ab2base64(iv)}:${ab2base64(tag)}:${ab2base64(ciphertext)}`
    
    return result
  } catch (error) {
    console.error('Client encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data using AES-256-GCM (client-side)
 * @param {string} encryptedData - Encrypted data in format: salt:iv:tag:encryptedData
 * @returns {Promise<object|string>} - Decrypted data
 */
export async function decryptClient(encryptedData) {
  try {
    // Split the encrypted data
    const parts = encryptedData.split(':')
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format')
    }
    
    const [saltBase64, ivBase64, tagBase64, encryptedBase64] = parts
    
    // Convert from base64
    const salt = base642ab(saltBase64)
    const iv = base642ab(ivBase64)
    const tag = base642ab(tagBase64)
    const ciphertext = base642ab(encryptedBase64)
    
    // Combine ciphertext and tag (AES-GCM expects them together)
    const encryptedBuffer = new Uint8Array(ciphertext.byteLength + tag.byteLength)
    encryptedBuffer.set(new Uint8Array(ciphertext), 0)
    encryptedBuffer.set(new Uint8Array(tag), ciphertext.byteLength)
    
    // Derive key
    const key = await deriveKey(ENCRYPTION_KEY, new Uint8Array(salt))
    
    // Decrypt data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
        tagLength: 128
      },
      key,
      encryptedBuffer
    )
    
    const decryptedText = ab2str(decrypted)
    
    // Try to parse as JSON, otherwise return as string
    try {
      return JSON.parse(decryptedText)
    } catch {
      return decryptedText
    }
  } catch (error) {
    console.error('Client decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Wrapper for fetch with automatic encryption
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>}
 */
export async function encryptedFetch(url, options = {}) {
  try {
    // If there's a body, encrypt it
    if (options.body) {
      const bodyData = typeof options.body === 'string' 
        ? JSON.parse(options.body) 
        : options.body
      
      const encryptedBody = await encryptClient(bodyData)
      
      options.body = JSON.stringify({ encrypted: encryptedBody })
      
      // Ensure Content-Type is set
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'X-Encrypted': 'true' // Flag to indicate encrypted payload
      }
    }
    
    // Make the request
    const response = await fetch(url, options)
    
    // If response contains encrypted data, decrypt it and create a custom response
    if (response.ok && response.headers.get('X-Encrypted') === 'true') {
      const responseData = await response.json()
      if (responseData.encrypted) {
        const decrypted = await decryptClient(responseData.encrypted)
        
        // Create a new Response-like object with the decrypted data
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          url: response.url,
          redirected: response.redirected,
          type: response.type,
          json: async () => decrypted,
          text: async () => JSON.stringify(decrypted),
          clone: () => response.clone()
        }
      }
    }
    
    return response
  } catch (error) {
    console.error('Encrypted fetch error:', error)
    throw error
  }
}

/**
 * Verify if Web Crypto API is available
 */
export function isWebCryptoAvailable() {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.getRandomValues !== 'undefined'
}
