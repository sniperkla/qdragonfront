#!/usr/bin/env node

/**
 * Test script to verify encryption key generation
 * This creates a test .env file to show what the script will do
 */

const crypto = require('crypto')

console.log('🧪 Encryption Key Generation Test\n')
console.log('=' .repeat(60))

// Generate keys
const serverKey = crypto.randomBytes(32).toString('hex')
const clientKey = crypto.randomBytes(32).toString('hex')

console.log('\n📝 Generated Keys:\n')

console.log('1️⃣  ENCRYPTION_SECRET_KEY (Server-side):')
console.log('   Used by: /src/lib/encryption.js')
console.log('   Exposed to browser: ❌ NO')
console.log('   Value:', serverKey)
console.log()

console.log('2️⃣  NEXT_PUBLIC_ENCRYPTION_KEY (Client-side):')
console.log('   Used by: /src/lib/clientEncryption.js')
console.log('   Exposed to browser: ✅ YES (embedded in JS)')
console.log('   Value:', clientKey)
console.log()

console.log('3️⃣  ENCRYPTION_KEY (Legacy fallback):')
console.log('   Used by: Both (fallback)')
console.log('   Value:', serverKey, '(same as server)')
console.log()

console.log('=' .repeat(60))
console.log('\n📄 What will be added to your .env files:\n')

const envContent = `
# Encryption Keys (Generated ${new Date().toISOString()})

# Server-side encryption key (private, never exposed to client)
ENCRYPTION_SECRET_KEY="${serverKey}"

# Client-side encryption key (public, embedded in JS bundle)
NEXT_PUBLIC_ENCRYPTION_KEY="${clientKey}"

# Legacy encryption key - fallback (for backward compatibility)
ENCRYPTION_KEY="${serverKey}"
`

console.log(envContent)

console.log('=' .repeat(60))
console.log('\n✅ All three keys will be added/updated automatically!')
console.log('   Run: npm run generate:key')
console.log()
console.log('⚠️  Remember to rebuild after updating:')
console.log('   rm -rf .next && npm run build')
console.log()
