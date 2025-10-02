#!/usr/bin/env node

/**
 * Simple Encryption Key Generator
 * 
 * Generates a secure ENCRYPTION_KEY and automatically adds it to .env.production
 * If the key already exists, it will be replaced.
 * 
 * Usage: node scripts/generate-encryption-key.js
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

console.log('🔐 Generating Encryption Key...\n')

// Generate ONE key for both server and client (they MUST match!)
const encryptionKey = crypto.randomBytes(32).toString('hex')

console.log('✅ Generated Key (will be used for ALL three env vars):\n')
console.log(encryptionKey)
console.log('\nThis key will be set for:')
console.log('  - ENCRYPTION_SECRET_KEY (server)')
console.log('  - NEXT_PUBLIC_ENCRYPTION_KEY (client)')
console.log('  - ENCRYPTION_KEY (legacy)')
console.log()

// Update .env.production
const envPath = path.join(process.cwd(), '.env.production')

function updateEnvFile(filePath, fileName) {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${fileName} not found, skipping...`)
    return false
  }

  let content = fs.readFileSync(filePath, 'utf8')
  let updated = false
  
  // Update or add ENCRYPTION_SECRET_KEY
  if (content.includes('ENCRYPTION_SECRET_KEY=')) {
    content = content.replace(
      /ENCRYPTION_SECRET_KEY=.*/g,
      `ENCRYPTION_SECRET_KEY="${encryptionKey}"`
    )
    console.log(`🔄 Updated ENCRYPTION_SECRET_KEY in ${fileName}`)
    updated = true
  } else {
    content += `\n# Server-side encryption key (Generated ${new Date().toISOString()})\nENCRYPTION_SECRET_KEY="${encryptionKey}"\n`
    console.log(`➕ Added ENCRYPTION_SECRET_KEY to ${fileName}`)
    updated = true
  }
  
  // Update or add NEXT_PUBLIC_ENCRYPTION_KEY (SAME as server!)
  if (content.includes('NEXT_PUBLIC_ENCRYPTION_KEY=')) {
    content = content.replace(
      /NEXT_PUBLIC_ENCRYPTION_KEY=.*/g,
      `NEXT_PUBLIC_ENCRYPTION_KEY="${encryptionKey}"`
    )
    console.log(`🔄 Updated NEXT_PUBLIC_ENCRYPTION_KEY in ${fileName}`)
  } else {
    content += `\n# Client-side encryption key - MUST MATCH SERVER! (Generated ${new Date().toISOString()})\nNEXT_PUBLIC_ENCRYPTION_KEY="${encryptionKey}"\n`
    console.log(`➕ Added NEXT_PUBLIC_ENCRYPTION_KEY to ${fileName}`)
  }
  
  // Update or add legacy ENCRYPTION_KEY (SAME as server!)
  if (content.includes('ENCRYPTION_KEY=')) {
    // Only update if it's the standalone ENCRYPTION_KEY, not ENCRYPTION_SECRET_KEY
    content = content.replace(
      /^ENCRYPTION_KEY=.*/gm,
      `ENCRYPTION_KEY="${encryptionKey}"`
    )
    console.log(`🔄 Updated ENCRYPTION_KEY (legacy) in ${fileName}`)
  } else {
    content += `\n# Legacy encryption key - fallback (Generated ${new Date().toISOString()})\nENCRYPTION_KEY="${encryptionKey}"\n`
    console.log(`➕ Added ENCRYPTION_KEY (legacy) to ${fileName}`)
  }
  
  fs.writeFileSync(filePath, content)
  if (updated) {
    console.log(`✅ ${fileName} updated successfully!\n`)
  }
  return true
}

// Update both files if they exist
let updated = false
updated = updateEnvFile(envPath, '.env.production') || updated

if (!updated) {
  console.log('⚠️  No .env files found!')
  console.log('   Please create .env.production or .env.local and add:')
  console.log(`   ENCRYPTION_SECRET_KEY="${encryptionKey}"`)
  console.log(`   NEXT_PUBLIC_ENCRYPTION_KEY="${encryptionKey}"`)
  console.log(`   ENCRYPTION_KEY="${encryptionKey}"`)
}

console.log('\n📋 Summary:')
console.log(`   Key Length: 64 characters (256 bits)`)
console.log(`   Algorithm: AES-256-GCM`)
console.log(`   All three env vars use SAME KEY (required!)`)
console.log(`   Generated: ${new Date().toISOString()}`)
console.log()
console.log('⚠️  IMPORTANT: After updating keys, you MUST rebuild:')
console.log('   rm -rf .next && npm run build')
console.log()
console.log('🎉 Done! Your encryption keys are ready to use.\n')
