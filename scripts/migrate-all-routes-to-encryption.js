#!/usr/bin/env node

/**
 * Automated Route Encryption Migration Script
 * 
 * This script automatically updates all API routes to support encryption.
 * It backs up original files and adds encryption support while maintaining
 * backward compatibility.
 * 
 * Usage: node scripts/migrate-all-routes-to-encryption.js
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

console.log('🔐 Starting API Route Encryption Migration\n')

// Configuration
const API_DIR = path.join(process.cwd(), 'src/app/api')
const BACKUP_DIR = path.join(process.cwd(), 'backup-routes')
const DRY_RUN = process.argv.includes('--dry-run')

if (DRY_RUN) {
  console.log('⚠️  DRY RUN MODE - No files will be modified\n')
}

// Track statistics
const stats = {
  total: 0,
  modified: 0,
  skipped: 0,
  errors: 0,
  routes: []
}

// Routes to skip (already encrypted or test routes)
const SKIP_PATTERNS = [
  '/test/',
  '/debug/',
  '/diagnostic/',
  '/health/',
  '/init/',
  '/force-init/',
  '/sse/'
]

/**
 * Check if route should be skipped
 */
function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => filePath.includes(pattern))
}

/**
 * Check if file already has encryption imports
 */
function hasEncryptionImports(content) {
  return content.includes('decryptRequestBody') || 
         content.includes('createEncryptedResponse') ||
         content.includes('encryptionMiddleware')
}

/**
 * Add encryption imports to file
 */
function addEncryptionImports(content) {
  // Check if there are already imports
  const hasImports = content.match(/^import .+ from/m)
  
  const importStatement = "import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'\n"
  
  if (hasImports) {
    // Add after existing imports
    const lines = content.split('\n')
    let lastImportIndex = -1
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^import .+ from/)) {
        lastImportIndex = i
      }
    }
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importStatement)
      return lines.join('\n')
    }
  }
  
  // Add at the beginning if no imports found
  return importStatement + '\n' + content
}

/**
 * Wrap function body to support encryption
 */
function wrapFunctionForEncryption(content, method) {
  // Pattern to match export async function POST/GET/PUT/DELETE/PATCH
  const functionPattern = new RegExp(
    `export async function ${method}\\s*\\([^)]+\\)\\s*{`,
    'g'
  )
  
  if (!functionPattern.test(content)) {
    return content // Function not found
  }
  
  // Reset regex
  functionPattern.lastIndex = 0
  
  let modified = content
  
  // For POST, PUT, PATCH - add request body decryption
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    modified = modified.replace(
      new RegExp(`(export async function ${method}\\s*\\(\\s*(\\w+)\\s*\\)\\s*{)([\\s\\S]*?)(const body = await \\2\\.json\\(\\))`, 'g'),
      (match, funcStart, paramName, beforeBody, jsonCall) => {
        return `${funcStart}${beforeBody}// Decrypt request body (supports both encrypted and plain requests)\n    const body = await decryptRequestBody(${paramName}).catch(() => ${paramName}.json())`
      }
    )
    
    // If no .json() call found, add decryption support
    if (!modified.includes('decryptRequestBody')) {
      modified = modified.replace(
        new RegExp(`(export async function ${method}\\s*\\(\\s*(\\w+)\\s*\\)\\s*{)`, 'g'),
        (match, funcStart, paramName) => {
          return `${funcStart}\n  try {\n    // Decrypt request body (supports both encrypted and plain requests)\n    let body\n    try {\n      body = await decryptRequestBody(${paramName})\n    } catch (decryptError) {\n      // Fallback to plain JSON if decryption fails\n      body = await ${paramName}.json()\n    }\n`
        }
      )
    }
  }
  
  // Add encrypted response support before all Response returns
  modified = modified.replace(
    /return new Response\(\s*JSON\.stringify\(([^)]+)\)/g,
    (match, dataVar) => {
      return `// Check if client wants encrypted response
    const wantsEncrypted = request.headers?.get?.('X-Encrypted') === 'true' || req.headers?.get?.('X-Encrypted') === 'true'
    if (wantsEncrypted) {
      return createEncryptedResponse(${dataVar})
    }
    return new Response(JSON.stringify(${dataVar})`
    }
  )
  
  return modified
}

/**
 * Process a single route file
 */
function processRoute(filePath) {
  stats.total++
  
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const relativePath = path.relative(API_DIR, filePath)
    
    // Skip if should be skipped
    if (shouldSkip(filePath)) {
      console.log(`⏭️  Skipped: ${relativePath} (test/debug route)`)
      stats.skipped++
      return
    }
    
    // Skip if already has encryption
    if (hasEncryptionImports(content)) {
      console.log(`⏭️  Skipped: ${relativePath} (already encrypted)`)
      stats.skipped++
      return
    }
    
    // Detect HTTP methods in file
    const methods = []
    if (content.includes('export async function POST')) methods.push('POST')
    if (content.includes('export async function GET')) methods.push('GET')
    if (content.includes('export async function PUT')) methods.push('PUT')
    if (content.includes('export async function DELETE')) methods.push('DELETE')
    if (content.includes('export async function PATCH')) methods.push('PATCH')
    
    if (methods.length === 0) {
      console.log(`⏭️  Skipped: ${relativePath} (no HTTP methods found)`)
      stats.skipped++
      return
    }
    
    // Start modification
    let modified = content
    
    // Add imports
    modified = addEncryptionImports(modified)
    
    // Wrap each method
    methods.forEach(method => {
      modified = wrapFunctionForEncryption(modified, method)
    })
    
    // Check if anything changed
    if (modified === content) {
      console.log(`⏭️  Skipped: ${relativePath} (no changes needed)`)
      stats.skipped++
      return
    }
    
    if (!DRY_RUN) {
      // Backup original file
      const backupPath = path.join(BACKUP_DIR, relativePath)
      const backupDir = path.dirname(backupPath)
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }
      
      fs.writeFileSync(backupPath, content)
      
      // Write modified file
      fs.writeFileSync(filePath, modified)
    }
    
    console.log(`✅ Modified: ${relativePath} (${methods.join(', ')})`)
    stats.modified++
    stats.routes.push({ path: relativePath, methods })
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    stats.errors++
  }
}

/**
 * Find all route files
 */
function findRouteFiles() {
  const pattern = path.join(API_DIR, '**/route.js')
  return glob.sync(pattern)
}

/**
 * Main execution
 */
function main() {
  // Create backup directory
  if (!DRY_RUN && !fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
  
  // Find all routes
  const routeFiles = findRouteFiles()
  console.log(`📁 Found ${routeFiles.length} route files\n`)
  
  // Process each route
  routeFiles.forEach(processRoute)
  
  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`Total routes found: ${stats.total}`)
  console.log(`✅ Modified: ${stats.modified}`)
  console.log(`⏭️  Skipped: ${stats.skipped}`)
  console.log(`❌ Errors: ${stats.errors}`)
  
  if (stats.modified > 0) {
    console.log('\n📝 Modified Routes:')
    stats.routes.forEach(route => {
      console.log(`  - ${route.path} (${route.methods.join(', ')})`)
    })
  }
  
  if (!DRY_RUN && stats.modified > 0) {
    console.log(`\n💾 Backups saved to: ${BACKUP_DIR}`)
  }
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - No files were modified')
    console.log('Run without --dry-run flag to apply changes')
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Migration complete!')
  console.log('='.repeat(60))
  
  if (!DRY_RUN && stats.modified > 0) {
    console.log('\n📋 Next Steps:')
    console.log('1. Review the changes in modified files')
    console.log('2. Test each modified route')
    console.log('3. Update client code to use encryptedFetch')
    console.log('4. Run: npm run dev')
    console.log('5. Check for any errors')
    console.log('\n💡 Backup files are in:', BACKUP_DIR)
  }
}

// Run the migration
try {
  main()
} catch (error) {
  console.error('\n❌ Fatal error:', error.message)
  process.exit(1)
}
