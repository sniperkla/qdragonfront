# 🔐 Encryption Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  1. User Input (username, password)                             │
│           ↓                                                      │
│  2. encryptClient() - Web Crypto API                            │
│     • Generate random salt + IV                                 │
│     • Derive key with PBKDF2                                    │
│     • Encrypt with AES-256-GCM                                  │
│           ↓                                                      │
│  3. Encrypted Payload                                           │
│     {"encrypted": "salt:iv:ciphertext"}                         │
│           ↓                                                      │
│  4. HTTP Request (HTTPS)                                        │
│     Headers: { "X-Encrypted": "true" }                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    [HTTPS Channel]
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER (Next.js)                          │
├─────────────────────────────────────────────────────────────────┤
│  5. API Route Handler                                           │
│           ↓                                                      │
│  6. decryptRequestBody()                                        │
│     • Extract salt, IV, ciphertext                              │
│     • Derive key with PBKDF2                                    │
│     • Decrypt with AES-256-GCM                                  │
│     • Verify authentication tag                                 │
│           ↓                                                      │
│  7. Plain Data (username, password)                             │
│           ↓                                                      │
│  8. Business Logic                                              │
│     • Validate credentials                                      │
│     • Query database                                            │
│     • Generate token                                            │
│           ↓                                                      │
│  9. Response Data                                               │
│     {success: true, token: "..."}                               │
│           ↓                                                      │
│  10. encrypt() [if client wants encrypted response]             │
│      • Generate new salt + IV                                   │
│      • Encrypt response                                         │
│           ↓                                                      │
│  11. Encrypted Response                                         │
│      {"encrypted": "salt:iv:tag:ciphertext"}                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    [HTTPS Channel]
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  12. Receive Response                                           │
│           ↓                                                      │
│  13. decryptClient() [if response is encrypted]                 │
│      • Extract salt, IV, tag, ciphertext                        │
│      • Derive key with PBKDF2                                   │
│      • Decrypt with AES-256-GCM                                 │
│           ↓                                                      │
│  14. Plain Response Data                                        │
│      {success: true, token: "..."}                              │
│           ↓                                                      │
│  15. Update UI / Store token                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Encryption Details

### AES-256-GCM
- **Algorithm:** Advanced Encryption Standard
- **Key Size:** 256 bits (32 bytes)
- **Mode:** Galois/Counter Mode (GCM)
- **Benefits:**
  - ✅ Authenticated encryption (prevents tampering)
  - ✅ High performance
  - ✅ Industry standard
  - ✅ Built-in authentication tag

### Key Derivation (PBKDF2)
- **Function:** Password-Based Key Derivation Function 2
- **Hash:** SHA-256
- **Iterations:** 100,000
- **Salt:** Random 64 bytes
- **Benefits:**
  - ✅ Protects against rainbow table attacks
  - ✅ Makes brute-force attacks expensive
  - ✅ Each encryption uses unique salt

### Data Format

**Client to Server:**
```
salt:iv:ciphertext
[64B]:[12B]:[variable]
```

**Server to Client:**
```
salt:iv:tag:ciphertext
[64B]:[16B]:[16B]:[variable]
```

All parts are Base64 encoded.

---

## Security Features

### 1. Forward Secrecy
Each request uses a new random salt and IV:
- ✅ Different encryption for identical data
- ✅ Prevents pattern analysis
- ✅ No key reuse

### 2. Authentication
GCM mode includes authentication tag:
- ✅ Detects tampering
- ✅ Prevents manipulation
- ✅ Ensures data integrity

### 3. Key Security
- ✅ Keys stored in environment variables
- ✅ Never sent over network
- ✅ Not in source code
- ✅ Separate server/client keys possible

### 4. HTTPS Required
Encryption + HTTPS = Maximum Security:
- ✅ Protects against man-in-the-middle
- ✅ Certificate validation
- ✅ Transport security
- ✅ Defense in depth

---

## Attack Resistance

### ❌ Prevented Attacks

| Attack Type | How It's Prevented |
|-------------|-------------------|
| **Man-in-the-Middle** | HTTPS + End-to-end encryption |
| **Replay Attack** | Each request has unique salt/IV |
| **Tampering** | GCM authentication tag |
| **Pattern Analysis** | Random salt/IV for each encryption |
| **Brute Force** | 256-bit keys + PBKDF2 (100k iterations) |
| **Rainbow Table** | Random salt per encryption |
| **Known Plaintext** | AES-256 is resistant |

### ⚠️ Still Need to Consider

| Concern | Mitigation |
|---------|-----------|
| **Key Theft** | Secure key storage, rotation |
| **Server Compromise** | Regular security audits, monitoring |
| **Phishing** | User education, 2FA |
| **XSS** | CSP headers, input sanitization |
| **CSRF** | Tokens, SameSite cookies |

---

## Performance Analysis

### Encryption Overhead

```
┌──────────────────────────────────────────────────────┐
│ Data Size │ Encrypt Time │ Decrypt Time │ Overhead  │
├──────────────────────────────────────────────────────┤
│    1 KB   │    2-3 ms    │    2-3 ms    │   +4-6 ms │
│   10 KB   │    5-8 ms    │    5-8 ms    │  +10-16ms │
│  100 KB   │   15-25 ms   │   15-25 ms   │  +30-50ms │
│    1 MB   │  100-150 ms  │  100-150 ms  │ +200-300ms│
└──────────────────────────────────────────────────────┘

Note: Times measured on average hardware.
Actual performance may vary by device.
```

### Request Flow Timing

```
Plain Request:
┌────────────┬─────────────┬──────────────┬───────────┐
│   Client   │   Network   │    Server    │   Total   │
│    5ms     │    50ms     │     45ms     │   100ms   │
└────────────┴─────────────┴──────────────┴───────────┘

Encrypted Request:
┌────────────┬─────────────┬──────────────┬───────────┐
│   Client   │   Network   │    Server    │   Total   │
│  5ms+5ms   │    50ms     │   45ms+5ms   │   110ms   │
│ (encrypt)  │             │  (decrypt)   │  (+10ms)  │
└────────────┴─────────────┴──────────────┴───────────┘

Impact: ~10% overhead for typical requests
```

---

## Implementation Patterns

### Pattern 1: Full Encryption (Recommended for Sensitive Data)

```javascript
// Client
const response = await encryptedFetch('/api/auth', {
  method: 'POST',
  body: { username, password }
})

// Server
const body = await decryptRequestBody(request)
// ... process ...
return createEncryptedResponse(result)
```

**Use for:** Login, payment, password reset

### Pattern 2: Request-Only Encryption

```javascript
// Client
const response = await encryptedFetch('/api/update-profile', {
  method: 'POST',
  body: { email, phone }
})

// Server
const body = await decryptRequestBody(request)
// ... process ...
return new Response(JSON.stringify(result)) // Plain response
```

**Use for:** Profile updates, settings changes

### Pattern 3: Response-Only Encryption

```javascript
// Client
const response = await fetch('/api/sensitive-data', {
  headers: { 'X-Encrypted': 'true' }
})
const data = await decryptResponse(response)

// Server
// ... process plain request ...
return createEncryptedResponse(sensitiveData)
```

**Use for:** Fetching sensitive reports, financial data

### Pattern 4: Conditional Encryption

```javascript
// Client
const useEncryption = isProductionAndSensitive()
const fetchFn = useEncryption ? encryptedFetch : fetch

// Server
const body = await decryptRequestBody(request) // Auto-detects
// ... process ...
const wantsEncrypted = request.headers.get('X-Encrypted') === 'true'
return wantsEncrypted 
  ? createEncryptedResponse(result)
  : plainResponse(result)
```

**Use for:** Gradual rollout, A/B testing

---

## Monitoring & Debugging

### What to Monitor

1. **Encryption Failures**
   ```javascript
   // Log encryption/decryption errors
   console.error('Encryption failed:', {
     timestamp: new Date(),
     error: error.message,
     route: request.url
   })
   ```

2. **Performance Impact**
   ```javascript
   const start = performance.now()
   const encrypted = await encryptClient(data)
   const duration = performance.now() - start
   if (duration > 50) {
     console.warn('Slow encryption:', duration, 'ms')
   }
   ```

3. **Usage Statistics**
   ```javascript
   // Track encrypted vs plain requests
   const stats = {
     encrypted: 0,
     plain: 0,
     failed: 0
   }
   ```

### Debug Mode

```javascript
// Enable encryption debugging
localStorage.setItem('DEBUG_ENCRYPTION', 'true')

// In encryption code
if (localStorage.getItem('DEBUG_ENCRYPTION')) {
  console.log('Encrypting:', data)
  console.log('Encrypted:', encrypted)
  console.log('Format:', encrypted.split(':').map(p => p.length))
}
```

---

## Migration Roadmap

### Phase 1: Setup (Week 1)
- ✅ Install encryption utilities
- ✅ Generate keys
- ✅ Test encryption/decryption
- ✅ Update one non-critical route

### Phase 2: Critical Routes (Week 2)
- 🔐 Auth routes (login, register, password reset)
- 🔐 Admin authentication
- 🔐 Test thoroughly

### Phase 3: Payment Routes (Week 3)
- 💰 Purchase endpoints
- 💰 Top-up endpoints
- 💰 Credit management
- 💰 Verify financial data security

### Phase 4: User Data Routes (Week 4)
- 👤 Profile updates
- 👤 Account management
- 👤 License operations
- 👤 Settings changes

### Phase 5: Monitoring & Optimization (Ongoing)
- 📊 Monitor performance
- 📊 Track errors
- 📊 Optimize slow routes
- 📊 User feedback

---

## Best Practices Checklist

- [ ] Keys are stored in environment variables
- [ ] `.env.local` is in `.gitignore`
- [ ] HTTPS is enforced in production
- [ ] Error messages don't leak encryption details
- [ ] Encryption failures are logged
- [ ] Performance is monitored
- [ ] Both encrypted and plain requests are tested
- [ ] Backward compatibility is maintained
- [ ] Documentation is up to date
- [ ] Team is trained on encryption usage

---

**Ready to implement? Start with:** `ENCRYPTION_CHECKLIST.md`
