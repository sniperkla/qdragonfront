#!/usr/bin/env node

/**
 * Script to convert all fetch calls in admin page to encryptedFetch
 */

const fs = require('fs');
const path = require('path');

const adminFile = path.join(__dirname, '..', 'src', 'app', 'admin', 'page.js');

let content = fs.readFileSync(adminFile, 'utf8');
const originalContent = content;

// Pattern 1: fetch with body: JSON.stringify(...)
const pattern1 = /await fetch\(([^,]+),\s*\{([^}]*?)body:\s*JSON\.stringify\(([^)]+)\)([^}]*?)\}\)/gs;
content = content.replace(pattern1, (match, url, before, bodyContent, after) => {
  return `await encryptedFetch(${url}, {${before}body: ${bodyContent}${after}})`;
});

// Pattern 2: Simple fetch calls without body
const pattern2 = /await fetch\(([^,]+),\s*\{([^}]+)\}\)/g;
content = content.replace(pattern2, 'await encryptedFetch($1, {$2})');

if (content !== originalContent) {
  fs.writeFileSync(adminFile, content, 'utf8');
  console.log('✅ Converted admin page fetch calls to encryptedFetch');
} else {
  console.log('ℹ️  No changes needed');
}
