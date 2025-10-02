import crypto from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

// Get encryption key from environment variable
// In production, use a strong secret key stored in environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET_KEY || 'your-32-character-secret-key!!'

/**
 * Derive a key from the secret using PBKDF2
 */
function deriveKey(secret, salt) {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256')
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string|object} data - Data to encrypt (will be stringified if object)
 * @returns {string} - Encrypted data in format: salt:iv:tag:encryptedData (base64)
 */
export function encrypt(data) {
  try {
    // Convert data to string if it's an object
    const text = typeof data === 'string' ? data : JSON.stringify(data)
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Derive key from secret
    const key = deriveKey(ENCRYPTION_KEY, salt)
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    // Encrypt data
    let encrypted = cipher.update(text, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    
    // Get authentication tag
    const tag = cipher.getAuthTag()
    
    // Combine salt, IV, tag, and encrypted data
    const result = `${salt.toString('base64')}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`
    
    return result
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Encrypted data in format: salt:iv:tag:encryptedData
 * @returns {object|string} - Decrypted data (parsed as JSON if possible)
 */
export function decrypt(encryptedData) {
  try {
    // Split the encrypted data
    const parts = encryptedData.split(':')
    
    if (parts.length !== 4) {
      throw new Error(`Invalid encrypted data format: expected 4 parts, got ${parts.length}`)
    }
    
    const [saltBase64, ivBase64, tagBase64, encrypted] = parts
    
    // Convert from base64
    const salt = Buffer.from(saltBase64, 'base64')
    const iv = Buffer.from(ivBase64, 'base64')
    const tag = Buffer.from(tagBase64, 'base64')
    
    // Derive key from secret
    const key = deriveKey(ENCRYPTION_KEY, salt)
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    
    // Try to parse as JSON, otherwise return as string
    try {
      return JSON.parse(decrypted)
    } catch {
      return decrypted
    }
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Verify if data is encrypted (has the expected format)
 */
export function isEncrypted(data) {
  if (typeof data !== 'string') return false
  const parts = data.split(':')
  return parts.length === 4
}

/**
 * Generate a secure random encryption key
 * Use this to generate a new ENCRYPTION_SECRET_KEY for your .env file
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('base64')
}
