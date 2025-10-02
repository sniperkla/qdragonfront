#!/usr/bin/env node

/**
 * Mass Route Encryption Update Script
 * 
 * This script automatically adds encryption support to ALL API routes.
 * It's safe to run multiple times (idempotent).
 * 
 * Usage: node scripts/encrypt-all-routes.js
 */

const fs = require('fs')
const path = require('path')

console.log('🔐 Mass Route Encryption Update\n')

const API_DIR = path.join(process.cwd(), 'src/app/api')

// Routes to skip
const SKIP_DIRS = ['test', 'debug', 'diagnostic', 'health', 'init', 'force-init', 'sse']

// Track progress
let stats = {
  total: 0,
  updated: 0,
  skipped: 0,
  errors: 0
}

/**
 * Recursively find all route.js files
 */
function findRouteFiles(dir) {
  let results = []
  
  try {
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // Skip certain directories
        if (!SKIP_DIRS.includes(item)) {
          results = results.concat(findRouteFiles(fullPath))
        }
      } else if (item === 'route.js') {
        results.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message)
  }
  
  return results
}

/**
 * Check if file already has encryption imports
 */
function hasEncryption(content) {
  return content.includes('decryptRequestBody') || 
         content.includes('createEncryptedResponse')
}

/**
 * Update a route file with encryption support
 */
function updateRoute(filePath) {
  stats.total++
  
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const relativePath = path.relative(API_DIR, filePath)
    
    // Skip if already has encryption
    if (hasEncryption(content)) {
      console.log(`⏭️  ${relativePath} (already encrypted)`)
      stats.skipped++
      return
    }
    
    let modified = content
    
    // Step 1: Add import after last existing import
    const importStatement = "import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'\n"
    
    if (modified.match(/^import .+ from/m)) {
      // Find last import line
      const lines = modified.split('\n')
      let lastImportIndex = -1
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^import .+ from/)) {
          lastImportIndex = i
        }
      }
      
      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, importStatement)
        modified = lines.join('\n')
      }
    } else {
      // No imports, add at top
      modified = importStatement + '\n' + modified
    }
    
    // Step 2: Replace req.json() calls with decryption
    modified = modified.replace(
      /(const\s+(?:{[^}]+}|\w+)\s*=\s*)?await\s+(req|request)\.json\(\)/g,
      (match, varDecl, paramName) => {
        if (varDecl) {
          return `// Decrypt request body (supports both encrypted and plain requests)\n    let body\n    try {\n      body = await decryptRequestBody(${paramName})\n    } catch (decryptError) {\n      body = await ${paramName}.json()\n    }\n    ${varDecl.trim()}body`
        }
        return match
      }
    )
    
    // Step 3: Wrap Response returns with encryption check
    modified = modified.replace(
      /return new Response\(\s*JSON\.stringify\(([^)]+)\),?\s*({[^}]+})?\s*\)/g,
      (match, dataVar, options) => {
        // Extract status and headers from options
        const statusMatch = options?.match(/status:\s*(\d+)/)
        const status = statusMatch ? statusMatch[1] : '200'
        
        return `// Check if client wants encrypted response
    const wantsEncrypted = (req?.headers?.get('X-Encrypted') === 'true') || (request?.headers?.get('X-Encrypted') === 'true')
    
    if (wantsEncrypted) {
      return createEncryptedResponse(${dataVar}, ${status})
    }
    
    return new Response(JSON.stringify(${dataVar}), ${options || '{ status: ' + status + ' }'})`
      }
    )
    
    // Only save if changes were made
    if (modified !== content) {
      // Create backup
      const backupPath = filePath + '.backup'
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, content)
      }
      
      // Write updated file
      fs.writeFileSync(filePath, modified)
      console.log(`✅ ${relativePath}`)
      stats.updated++
    } else {
      console.log(`⚠️  ${relativePath} (no changes needed)`)
      stats.skipped++
    }
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message)
    stats.errors++
  }
}

/**
 * Main execution
 */
function main() {
  console.log('📁 Finding all route files...\n')
  
  const routeFiles = findRouteFiles(API_DIR)
  console.log(`Found ${routeFiles.length} route files\n`)
  console.log('🔄 Processing...\n')
  
  routeFiles.forEach(updateRoute)
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary')
  console.log('='.repeat(60))
  console.log(`Total files: ${stats.total}`)
  console.log(`✅ Updated: ${stats.updated}`)
  console.log(`⏭️  Skipped: ${stats.skipped}`)
  console.log(`❌ Errors: ${stats.errors}`)
  console.log('='.repeat(60))
  
  if (stats.updated > 0) {
    console.log('\n💾 Backup files created with .backup extension')
    console.log('\n📋 Next Steps:')
    console.log('1. Review the changes: git diff src/app/api')
    console.log('2. Test the application: npm run dev')
    console.log('3. Update client code to use encryptedFetch')
    console.log('4. Remove .backup files when confident: find src/app/api -name "*.backup" -delete')
  }
  
  console.log('\n✅ Done!')
}

// Run
try {
  main()
} catch (error) {
  console.error('\n❌ Fatal error:', error.message)
  process.exit(1)
}
