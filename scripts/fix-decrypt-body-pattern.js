#!/usr/bin/env node

/**
 * Script to fix the decryptRequestBody pattern
 * Removes the redundant try-catch fallback since decryptRequestBody already handles both cases
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fixCount = 0;
    
    // Pattern 1: With comment "supports both encrypted and plain requests"
    const pattern1 = /(\s+)\/\/ Decrypt request body \(supports both encrypted and plain requests\)\n\s+let body\n\s+try \{\n\s+body = await decryptRequestBody\((req|request)\)\n\s+\} catch \(decryptError\) \{\n\s+body = await (req|request)\.json\(\)\n\s+\}/g;
    
    content = content.replace(pattern1, (match, indent, param) => {
      fixCount++;
      return `${indent}// Decrypt request body (automatically handles both encrypted and plain requests)\n${indent}const body = await decryptRequestBody(${param})`;
    });
    
    // Pattern 2: Without specific comment or different variations
    const pattern2 = /(\s+)let body\n\s+try \{\n\s+body = await decryptRequestBody\((req|request)\)\n\s+\} catch \(decryptError\) \{\n\s+body = await (req|request)\.json\(\)\n\s+\}/g;
    
    content = content.replace(pattern2, (match, indent, param) => {
      fixCount++;
      return `${indent}const body = await decryptRequestBody(${param})`;
    });
    
    // If content changed, write back to file
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(apiDir, filePath)} (${fixCount} occurrence(s))`);
      return fixCount;
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

console.log('🔧 Fixing decryptRequestBody pattern in API routes...\n');
const totalFixed = scanDirectory(apiDir);
console.log(`\n✨ Complete! Fixed ${totalFixed} files.`);
