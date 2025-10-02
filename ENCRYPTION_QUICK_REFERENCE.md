# 🚀 Encryption Quick Reference

## 📦 Installation (One Time)

```bash
# 1. Generate keys
node scripts/setup-encryption.js

# 2. Restart dev server
npm run dev
```

---

## 🔧 Usage

### Client Side

```javascript
// Import
import { encryptedFetch } from '@/lib/clientEncryption'

// Use (replaces fetch)
const response = await encryptedFetch('/api/endpoint', {
  method: 'POST',
  body: { key: 'value' } // Don't stringify!
})

const data = await response.json() // Auto-decrypted
```

### Server Side

```javascript
// Import
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'

// Decrypt incoming
const body = await decryptRequestBody(request)

// Encrypt outgoing (optional)
const wantsEncrypted = request.headers.get('X-Encrypted') === 'true'
return wantsEncrypted
  ? createEncryptedResponse(data)
  : new Response(JSON.stringify(data))
```

---

## 🎯 Common Patterns

### Pattern 1: Simple API Call
```javascript
// Client
const result = await encryptedFetch('/api/do-something', {
  method: 'POST',
  body: { data: 'value' }
})
```

### Pattern 2: With Error Handling
```javascript
try {
  const response = await encryptedFetch('/api/endpoint', {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) throw new Error('Failed')
  
  const data = await response.json()
  // Handle success
} catch (error) {
  // Handle error
  console.error(error.message)
}
```

### Pattern 3: Using Hook
```javascript
import { useEncryptedFetch } from '@/hooks/useEncryptedFetch'

function MyComponent() {
  const { fetchData, loading, error } = useEncryptedFetch()
  
  const handleSubmit = async () => {
    await fetchData('/api/endpoint', {
      method: 'POST',
      body: formData
    })
  }
  
  return (
    <button onClick={handleSubmit} disabled={loading}>
      {loading ? 'Processing...' : 'Submit'}
    </button>
  )
}
```

---

## 📋 Update Checklist

For each route you want to encrypt:

### ✅ Server (API Route)

1. Add import:
   ```javascript
   import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'
   ```

2. Replace `request.json()`:
   ```javascript
   const body = await decryptRequestBody(request)
   ```

3. Update response (optional):
   ```javascript
   const wantsEncrypted = request.headers.get('X-Encrypted') === 'true'
   return wantsEncrypted 
     ? createEncryptedResponse(data)
     : new Response(JSON.stringify(data))
   ```

### ✅ Client (React Component)

1. Add import:
   ```javascript
   import { encryptedFetch } from '@/lib/clientEncryption'
   ```

2. Replace fetch:
   ```javascript
   // Before:
   fetch(url, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(data)
   })
   
   // After:
   encryptedFetch(url, {
     method: 'POST',
     body: data // Don't stringify!
   })
   ```

---

## 🔍 Debugging

### Check if encryption is working

**Browser Console:**
```javascript
// Test encryption
import('@/lib/clientEncryption').then(async ({ encryptClient, decryptClient }) => {
  const data = { test: 'value' }
  const encrypted = await encryptClient(data)
  const decrypted = await decryptClient(encrypted)
  console.log('Works:', JSON.stringify(data) === JSON.stringify(decrypted))
})
```

**Network Tab:**
- Request Payload: `{"encrypted":"base64string..."}`
- Response: `{"encrypted":"base64string..."}` (if server encrypts)

### Common Errors

| Error | Solution |
|-------|----------|
| "Web Crypto not available" | Use HTTPS or localhost |
| "Failed to decrypt" | Check keys match, data not corrupted |
| "Invalid format" | Check data has correct structure |
| Network error | Check server is running, URL is correct |

---

## 📊 Performance Tips

- Encryption adds ~5-20ms per request
- Use for sensitive data only
- Consider caching for frequently accessed data
- Compress large payloads before encrypting

---

## 🔐 Security Notes

- ✅ Keys in `.env.local` (not in code)
- ✅ Use HTTPS in production
- ✅ Keys are never sent over network
- ✅ Each request uses unique salt/IV
- ⚠️ Add `.env.local` to `.gitignore`

---

## 📚 Full Documentation

- **Setup Guide:** `ENCRYPTION_SETUP.md`
- **Architecture:** `ENCRYPTION_ARCHITECTURE.md`
- **Checklist:** `ENCRYPTION_CHECKLIST.md`
- **Server Examples:** `ENCRYPTION_EXAMPLE.js`
- **Client Examples:** `ENCRYPTION_CLIENT_EXAMPLES.js`

---

## 🆘 Need Help?

1. Check `ENCRYPTION_SETUP.md` for detailed instructions
2. Look at examples in `ENCRYPTION_EXAMPLE.js`
3. Review `ENCRYPTION_ARCHITECTURE.md` for how it works
4. Run `node scripts/setup-encryption.js` to reset

---

## 💡 Quick Tips

- Start with login/auth routes first
- Test in development before production
- Both encrypted and plain requests work (backward compatible)
- Can encrypt requests only, responses only, or both
- Performance impact is minimal (~10%)

---

**Ready?** Run: `node scripts/setup-encryption.js`
