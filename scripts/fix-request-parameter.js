#!/usr/bin/env node

/**
 * Script to fix the "request is not defined" error in all API routes
 * Replaces: (req?.headers?.get('X-Encrypted') === 'true') || (request?.headers?.get('X-Encrypted') === 'true')
 * With: req?.headers?.get('X-Encrypted') === 'true'
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Pattern to fix
    const pattern = /\(req\?\.\s*headers\?\.\s*get\s*\(\s*['"]X-Encrypted['"]\s*\)\s*===\s*['"]true['"]\s*\)\s*\|\|\s*\(\s*request\?\.\s*headers\?\.\s*get\s*\(\s*['"]X-Encrypted['"]\s*\)\s*===\s*['"]true['"]\s*\)/g;
    
    // Replacement
    const replacement = `req?.headers?.get('X-Encrypted') === 'true'`;
    
    // Apply fix
    content = content.replace(pattern, replacement);
    
    // If content changed, write back to file
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      const matches = originalContent.match(pattern);
      console.log(`✅ Fixed ${matches.length} occurrence(s) in: ${path.relative(apiDir, filePath)}`);
      return matches.length;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}: ${error.message}`);
    return 0;
  }
}

function scanDirectory(dir) {
  let totalFixed = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      totalFixed += scanDirectory(fullPath);
    } else if (entry.isFile() && entry.name === 'route.js') {
      totalFixed += fixFile(fullPath);
    }
  }
  
  return totalFixed;
}

console.log('🔧 Fixing "request is not defined" errors in API routes...\n');
const totalFixed = scanDirectory(apiDir);
console.log(`\n✨ Complete! Fixed ${totalFixed} total occurrences across all files.`);
