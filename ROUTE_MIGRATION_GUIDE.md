# 🔐 Route Encryption Migration Guide

## Critical Routes Already Updated ✅

1. ✅ `/api/auth/login/route.js` - Login with encryption support
2. ✅ `/api/admin/add-credits/route.js` - Credit management (already done)

## Routes to Update by Priority

### 🔴 CRITICAL - Authentication & Security (Do First)

```bash
# These handle passwords and sensitive credentials
/api/auth/register/route.js
/api/auth/forgot-password/route.js
/api/auth/reset-password/route.js
/api/admin/login/route.js
```

### 🟡 HIGH - Payment & Financial

```bash
# These handle money and payment data
/api/purchase-points/route.js
/api/purchase-license/route.js
/api/topup/route.js
/api/admin/topup/route.js
/api/admin/payment-confirm/route.js
```

### 🟢 MEDIUM - User Data Modification

```bash
# These modify user accounts and licenses
/api/admin/create-account/route.js
/api/extend-license/route.js
/api/extend-code/route.js
/api/change-account-number/route.js
/api/admin/extend-customer/route.js
/api/admin/customers/route.js
```

### ⚪ LOW - Read Operations

```bash
# These mostly read data (less critical)
/api/plans/route.js
/api/history/route.js
/api/my-licenses/route.js
/api/my-codes/route.js
/api/my-customer-accounts/route.js
```

## Manual Update Pattern

For each route file, follow this pattern:

### Step 1: Add Import (at the top)

```javascript
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'
```

### Step 2: Update Request Body Parsing

**Find this:**
```javascript
const body = await req.json()
// or
const { field1, field2 } = await req.json()
```

**Replace with:**
```javascript
// Decrypt request body (supports both encrypted and plain requests)
let body
try {
  body = await decryptRequestBody(req)
} catch (decryptError) {
  // Fallback to plain JSON if decryption fails (backward compatibility)
  body = await req.json()
}

const { field1, field2 } = body
```

### Step 3: Update Response

**Find this:**
```javascript
return new Response(JSON.stringify(data), { 
  status: 200,
  headers: someHeaders 
})
```

**Replace with:**
```javascript
// Check if client wants encrypted response
const wantsEncrypted = req.headers.get('X-Encrypted') === 'true'

if (wantsEncrypted) {
  const encryptedResponse = createEncryptedResponse(data, 200)
  // Copy any custom headers if needed
  if (someHeaders) {
    someHeaders.forEach((value, key) => {
      encryptedResponse.headers.set(key, value)
    })
  }
  return encryptedResponse
}

return new Response(JSON.stringify(data), { 
  status: 200,
  headers: someHeaders 
})
```

## Quick Update Script

Save this as a bash script to help identify files that need updating:

```bash
#!/bin/bash

echo "🔍 Finding routes that need encryption..."
echo ""

# Find all route.js files
find src/app/api -name "route.js" -type f | while read file; do
  # Skip test/debug routes
  if [[ "$file" == *"/test/"* ]] || [[ "$file" == *"/debug/"* ]]; then
    continue
  fi
  
  # Check if already has encryption imports
  if ! grep -q "decryptRequestBody\|createEncryptedResponse" "$file"; then
    echo "❌ Needs update: $file"
    
    # Show which HTTP methods it has
    echo "   Methods:"
    grep -E "export async function (POST|GET|PUT|DELETE|PATCH)" "$file" | sed 's/^/   - /'
    echo ""
  fi
done

echo "✅ Files with encryption already:"
find src/app/api -name "route.js" -type f | while read file; do
  if grep -q "decryptRequestBody\|createEncryptedResponse" "$file"; then
    echo "   $file"
  fi
done
```

## Bulk Update Strategy

### Week 1: Critical Routes
1. Update all `/api/auth/*` routes
2. Update `/api/admin/login` route
3. Test thoroughly

### Week 2: Payment Routes
1. Update all payment-related routes
2. Update top-up routes
3. Test with dummy payments

### Week 3: User Data Routes
1. Update account modification routes
2. Update license management routes
3. Full regression testing

### Week 4: Remaining Routes
1. Update read-only routes
2. Final testing
3. Deploy to production

## Testing Each Route

After updating a route:

```bash
# 1. Start dev server
npm run dev

# 2. Test with encrypted request (in browser console)
import { encryptedFetch } from '@/lib/clientEncryption'

const result = await encryptedFetch('/api/your-route', {
  method: 'POST',
  body: { test: 'data' }
})

console.log(await result.json())

# 3. Test with plain request (should still work)
const result2 = await fetch('/api/your-route', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: 'data' })
})

console.log(await result2.json())
```

## Common Patterns

### Pattern 1: Simple POST Route

```javascript
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'

export async function POST(req) {
  try {
    // Decrypt request
    let body
    try {
      body = await decryptRequestBody(req)
    } catch {
      body = await req.json()
    }
    
    // Your logic here
    const result = await processData(body)
    
    // Encrypt response
    const wantsEncrypted = req.headers.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ success: true, data: result })
    }
    
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    })
  }
}
```

### Pattern 2: GET Route (Response Only)

```javascript
import { createEncryptedResponse } from '@/lib/encryptionMiddleware'

export async function GET(req) {
  try {
    // Fetch data
    const data = await getData()
    
    // Encrypt response if requested
    const wantsEncrypted = req.headers.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ success: true, data })
    }
    
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    })
  }
}
```

### Pattern 3: With Authentication

```javascript
import { verifyAuth } from '@/lib/auth'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'

export async function POST(req) {
  try {
    // Verify auth first
    const authData = verifyAuth(req)
    if (!authData) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }
    
    // Decrypt request
    let body
    try {
      body = await decryptRequestBody(req)
    } catch {
      body = await req.json()
    }
    
    // Process with auth context
    const result = await processData(body, authData.userId)
    
    // Return encrypted if requested
    const wantsEncrypted = req.headers.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ success: true, data: result })
    }
    
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    })
  }
}
```

## Verification Checklist

After updating all routes:

- [ ] All authentication routes support encryption
- [ ] All payment routes support encryption
- [ ] All user data modification routes support encryption
- [ ] Backward compatibility maintained (plain requests still work)
- [ ] No console errors during testing
- [ ] Client code updated to use `encryptedFetch`
- [ ] Production deployment tested
- [ ] Documentation updated

## Rollback Plan

If issues occur:

1. Check `/backup-routes` directory for original files
2. Restore specific route: `cp backup-routes/path/to/route.js src/app/api/path/to/route.js`
3. Restart server: `npm run dev`

## Support

- **Quick Reference:** `ENCRYPTION_QUICK_REFERENCE.md`
- **Examples:** `ENCRYPTION_EXAMPLE.js`, `ENCRYPTION_CLIENT_EXAMPLES.js`
- **Architecture:** `ENCRYPTION_ARCHITECTURE.md`

---

**Progress Tracking:**

Update this list as you complete routes:

- [x] /api/auth/login/route.js
- [x] /api/admin/add-credits/route.js
- [ ] /api/auth/register/route.js
- [ ] /api/auth/forgot-password/route.js
- [ ] /api/auth/reset-password/route.js
- [ ] /api/admin/login/route.js
- [ ] /api/purchase-points/route.js
- [ ] /api/topup/route.js
- [ ] ... (add more as you go)
