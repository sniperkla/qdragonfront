#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const landingFile = path.join(__dirname, '..', 'src', 'app', 'landing', 'page.js');

let content = fs.readFileSync(landingFile, 'utf8');
const originalContent = content;
let changeCount = 0;

// Pattern 1: Remove JSON.stringify from body in encryptedFetch calls
// Match: body: JSON.stringify({...}) or body: JSON.stringify({ test: true, amount })
const pattern1 = /body: JSON\.stringify\((\{[^}]+\})\)/g;
content = content.replace(pattern1, (match, bodyContent) => {
  changeCount++;
  return `body: ${bodyContent}`;
});

// Pattern 2: Fix encryptedFetch calls that expect direct data
// Match: const data = await encryptedFetch(...) followed by if (data.success or similar)
// Change to: const response = await encryptedFetch(...); const data = await response.json()

// This is more complex - let's do specific patterns

// Pattern for POST requests with method: 'POST'
const pattern2 = /const data = await encryptedFetch\(([^,]+),\s*\{([^}]*method:\s*'POST'[^}]*)\}\)/gs;
content = content.replace(pattern2, (match, url, options) => {
  changeCount++;
  return `const response = await encryptedFetch(${url}, {${options}})\n      const data = await response.json()`;
});

// Pattern for GET requests (history)
const pattern3 = /const data = await encryptedFetch\(`\/api\/history[^`]+`,\s*\{[^}]+\}\)/g;
content = content.replace(pattern3, (match) => {
  changeCount++;
  const urlMatch = match.match(/`([^`]+)`/);
  const url = urlMatch[1];
  return `const response = await encryptedFetch(\`${url}\`, {\n        credentials: 'include',\n        cache: 'no-store'\n      })\n      const data = await response.json()`;
});

if (content !== originalContent) {
  fs.writeFileSync(landingFile, content, 'utf8');
  console.log(`✅ Fixed landing page encryptedFetch calls (${changeCount} changes)`);
} else {
  console.log('ℹ️  No changes needed');
}
