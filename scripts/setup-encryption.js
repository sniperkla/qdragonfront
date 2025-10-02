#!/usr/bin/env node

/**
 * Quick Start Script for Encryption Setup
 * 
 * This script helps you:
 * 1. Generate secure encryption keys
 * 2. Update your .env.local file
 * 3. Test encryption functionality
 * 
 * Usage: node scripts/setup-encryption.js
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

console.log('🔐 Q-Dragon Encryption Setup\n')

// Generate encryption keys
console.log('📝 Generating secure encryption keys...\n')

const serverKey = crypto.randomBytes(32).toString('base64')
const clientKey = crypto.randomBytes(32).toString('base64')

console.log('Server Key (ENCRYPTION_SECRET_KEY):')
console.log(serverKey)
console.log('\nClient Key (NEXT_PUBLIC_ENCRYPTION_KEY):')
console.log(clientKey)
console.log()

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
const envExists = fs.existsSync(envPath)

if (envExists) {
  console.log('⚠️  .env.local file already exists')
  console.log('   Please manually add these keys to your .env.local file:\n')
} else {
  console.log('📄 Creating .env.local file...\n')
}

const envContent = `
# Encryption Keys (Generated ${new Date().toISOString()})
# ⚠️ IMPORTANT: Keep these keys secret and never commit to version control!

# Server-side encryption key (keep secret)
ENCRYPTION_SECRET_KEY=${serverKey}

# Client-side encryption key (public)
NEXT_PUBLIC_ENCRYPTION_KEY=${clientKey}
`

if (!envExists) {
  fs.writeFileSync(envPath, envContent)
  console.log('✅ .env.local file created successfully!')
} else {
  console.log('Add these lines to your .env.local:')
  console.log(envContent)
}

console.log('\n📋 Next Steps:\n')
console.log('1. ✅ Encryption keys generated')
console.log('2. ⏳ Update API routes to use encryption middleware')
console.log('3. ⏳ Update client code to use encryptedFetch')
console.log('4. ⏳ Test with: npm run dev')
console.log('5. ⏳ Check ENCRYPTION_SETUP.md for detailed guide')
console.log()

// Test encryption
console.log('🧪 Testing encryption...\n')

try {
  const testData = { username: 'test', password: 'secret123', points: 100 }
  
  // Create a quick encryption test
  const algorithm = 'aes-256-gcm'
  const iv = crypto.randomBytes(16)
  const salt = crypto.randomBytes(64)
  const key = crypto.pbkdf2Sync(serverKey, salt, 100000, 32, 'sha256')
  
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(JSON.stringify(testData), 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const tag = cipher.getAuthTag()
  
  const encryptedData = `${salt.toString('base64')}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`
  
  // Decrypt
  const parts = encryptedData.split(':')
  const saltBuf = Buffer.from(parts[0], 'base64')
  const ivBuf = Buffer.from(parts[1], 'base64')
  const tagBuf = Buffer.from(parts[2], 'base64')
  const encData = parts[3]
  
  const keyDec = crypto.pbkdf2Sync(serverKey, saltBuf, 100000, 32, 'sha256')
  const decipher = crypto.createDecipheriv(algorithm, keyDec, ivBuf)
  decipher.setAuthTag(tagBuf)
  
  let decrypted = decipher.update(encData, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  
  const decryptedData = JSON.parse(decrypted)
  
  if (JSON.stringify(testData) === JSON.stringify(decryptedData)) {
    console.log('✅ Encryption test passed!')
    console.log('   Original:', testData)
    console.log('   Encrypted length:', encryptedData.length, 'chars')
    console.log('   Decrypted:', decryptedData)
  } else {
    console.log('❌ Encryption test failed - data mismatch')
  }
} catch (error) {
  console.log('❌ Encryption test failed:', error.message)
}

console.log('\n🎉 Setup complete! Read ENCRYPTION_SETUP.md for usage instructions.\n')
