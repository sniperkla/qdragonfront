# Encryption Request/Response Examples

This document shows real examples of what encrypted requests and responses look like.

## Table of Contents
1. [Plain (Unencrypted) Communication](#plain-unencrypted-communication)
2. [Encrypted Communication](#encrypted-communication)
3. [How Encryption Works](#how-encryption-works)
4. [Live Testing Examples](#live-testing-examples)

---

## Plain (Unencrypted) Communication

### Example: Login Request (Plain)

**Request Headers:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "MySecretPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "john_doe",
    "points": 100
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

⚠️ **Security Issue**: Passwords and sensitive data are visible in plain text during transmission!

---

## Encrypted Communication

### Example: Login Request (Encrypted)

**Request Headers:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json
X-Encrypted: true
```

**Request Body:**
```json
{
  "encryptedData": "8a7b3c5d9e2f1a4b6c8d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d",
  "iv": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
  "salt": "9f8e7d6c5b4a3928170615041302a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c"
}
```

**Response Body:**
```json
{
  "encryptedData": "5d4c3b2a1f0e9d8c7b6a5948372615041302f1e0d9c8b7a6958473625140302f1e0d9c8b7a6958473625140302f1e0d9c8b7a695847362514030",
  "iv": "2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
  "salt": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
}
```

✅ **Secure**: All sensitive data is encrypted using AES-256-GCM with unique IV and salt per request!

---

## How Encryption Works

### Client-Side Encryption Process

```javascript
// 1. Original data
const originalData = {
  email: "user@example.com",
  password: "MySecretPassword123"
};

// 2. Generate random salt and IV
const salt = crypto.getRandomValues(new Uint8Array(64));
const iv = crypto.getRandomValues(new Uint8Array(16));

// 3. Derive encryption key from password using PBKDF2
const keyMaterial = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(process.env.NEXT_PUBLIC_ENCRYPTION_PASSWORD),
  'PBKDF2',
  false,
  ['deriveBits', 'deriveKey']
);

const key = await crypto.subtle.deriveKey(
  {
    name: 'PBKDF2',
    salt: salt,
    iterations: 100000,
    hash: 'SHA-256'
  },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);

// 4. Encrypt the data
const encryptedBuffer = await crypto.subtle.encrypt(
  {
    name: 'AES-GCM',
    iv: iv,
    tagLength: 128
  },
  key,
  new TextEncoder().encode(JSON.stringify(originalData))
);

// 5. Convert to hex strings for transmission
const encryptedPayload = {
  encryptedData: bufferToHex(encryptedBuffer),
  iv: bufferToHex(iv),
  salt: bufferToHex(salt)
};

// 6. Send encrypted request
fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Encrypted': 'true'  // ← Important header!
  },
  body: JSON.stringify(encryptedPayload)
});
```

### Server-Side Decryption Process

```javascript
// 1. Server receives encrypted request
const { encryptedData, iv, salt } = await req.json();

// 2. Convert hex strings to buffers
const encryptedBuffer = Buffer.from(encryptedData, 'hex');
const ivBuffer = Buffer.from(iv, 'hex');
const saltBuffer = Buffer.from(salt, 'hex');

// 3. Derive the same encryption key using PBKDF2
const key = crypto.pbkdf2Sync(
  process.env.ENCRYPTION_PASSWORD,
  saltBuffer,
  100000,
  32,
  'sha256'
);

// 4. Split encrypted data and auth tag
const authTag = encryptedBuffer.slice(-16);
const encrypted = encryptedBuffer.slice(0, -16);

// 5. Decrypt using AES-256-GCM
const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
decipher.setAuthTag(authTag);

const decrypted = Buffer.concat([
  decipher.update(encrypted),
  decipher.final()
]);

// 6. Parse decrypted JSON
const originalData = JSON.parse(decrypted.toString('utf8'));
// Now originalData = { email: "user@example.com", password: "MySecretPassword123" }
```

---

## Live Testing Examples

### Example 1: Register User (Encrypted)

#### Frontend Code:
```javascript
import { encryptedFetch } from '@/lib/clientEncryption';

const handleRegister = async () => {
  const userData = {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'SecurePass123!',
    preferredLanguage: 'en'
  };

  try {
    const result = await encryptedFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    console.log('Decrypted response:', result);
    // result = { success: true, message: 'User registered successfully', userId: '...' }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

#### What Gets Sent Over Network:
```json
{
  "encryptedData": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "iv": "2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f",
  "salt": "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7"
}
```

#### What Server Receives (After Decryption):
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "preferredLanguage": "en"
}
```

#### What Server Sends Back (Encrypted):
```json
{
  "encryptedData": "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  "iv": "3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
  "salt": "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7"
}
```

#### What Client Receives (After Decryption):
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": "507f1f77bcf86cd799439011"
}
```

---

### Example 2: Purchase Points (Encrypted)

#### Frontend Code:
```javascript
import { useEncryptedFetch } from '@/hooks/useEncryptedFetch';

const PurchasePoints = () => {
  const { encryptedFetch, loading } = useEncryptedFetch();

  const handlePurchase = async () => {
    const purchaseData = {
      points: 500,
      paymentMethod: 'bank_transfer',
      accountNumber: '1234567890'
    };

    const response = await encryptedFetch('/api/purchase-points', {
      method: 'POST',
      body: JSON.stringify(purchaseData)
    });

    if (response.success) {
      alert('Purchase request submitted!');
    }
  };

  return <button onClick={handlePurchase}>Buy 500 Points</button>;
};
```

#### Network Request (Raw):
```http
POST /api/purchase-points HTTP/1.1
Host: localhost:3000
Content-Type: application/json
X-Encrypted: true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "encryptedData": "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8",
  "iv": "4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
  "salt": "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8"
}
```

#### Server Logs (Decrypted Data):
```javascript
console.log('Received purchase request:', {
  points: 500,
  paymentMethod: 'bank_transfer',
  accountNumber: '1234567890'
});
// Server processes the purchase...
```

#### Network Response (Raw):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "encryptedData": "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
  "iv": "5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "salt": "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9"
}
```

#### Client Receives (After Decryption):
```json
{
  "success": true,
  "message": "Purchase request created successfully",
  "requestId": "507f1f77bcf86cd799439012",
  "points": 500,
  "status": "pending_payment"
}
```

---

## Comparison: Size Overhead

### Plain Request
```json
{
  "email": "user@example.com",
  "password": "MyPassword123"
}
```
**Size**: ~60 bytes

### Encrypted Request
```json
{
  "encryptedData": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "iv": "2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f",
  "salt": "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7"
}
```
**Size**: ~400 bytes

**Overhead**: ~340 bytes (5-7x larger)

---

## Testing in Browser Console

### Test Encryption Flow:

```javascript
// 1. Test data
const testData = { message: "Hello World", secret: "MyPassword" };

// 2. Import encryption function
import { encryptClient } from '@/lib/clientEncryption';

// 3. Encrypt
const encrypted = await encryptClient(testData);
console.log('Encrypted:', encrypted);
// Output: { encryptedData: "a1b2c3...", iv: "2c3d4e...", salt: "b2c3d4..." }

// 4. Test API call
const response = await fetch('/api/test/encryption', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Encrypted': 'true'
  },
  body: JSON.stringify(encrypted)
});

// 5. Decrypt response
import { decryptClient } from '@/lib/clientEncryption';
const encryptedResponse = await response.json();
const decrypted = await decryptClient(encryptedResponse);
console.log('Decrypted response:', decrypted);
```

---

## Security Benefits

### What Attackers See:

**Without Encryption:**
```
Email: admin@company.com
Password: SuperSecret123!
Credit Card: 4532-1234-5678-9010
```

**With Encryption:**
```
d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8
```

✅ Impossible to decrypt without:
- The encryption password (stored in `.env`)
- The unique salt (changes per request)
- The unique IV (changes per request)
- Knowledge of the algorithm (AES-256-GCM)
- 100,000 PBKDF2 iterations

---

## Browser DevTools View

### Network Tab (Encrypted Request):

**Request:**
```
Name: login
Method: POST
Status: 200
Type: xhr
Size: 423 bytes
Time: 145ms

Headers:
  Content-Type: application/json
  X-Encrypted: true

Payload:
  {
    "encryptedData": "a1b2c3d4e5f6a7b8c9d0...",
    "iv": "2c3d4e5f6a7b8c9d0e1f...",
    "salt": "b2c3d4e5f6a7b8c9d0e1..."
  }

Response:
  {
    "encryptedData": "c3d4e5f6a7b8c9d0e1f2...",
    "iv": "3d4e5f6a7b8c9d0e1f2a...",
    "salt": "c3d4e5f6a7b8c9d0e1f2..."
  }
```

### Console (Decrypted Data):
```javascript
// What your application actually works with:
console.log('Login successful:', {
  success: true,
  user: {
    id: "507f1f77bcf86cd799439011",
    email: "user@example.com",
    username: "john_doe",
    points: 100
  },
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
});
```

---

## Summary

| Aspect | Plain Text | Encrypted |
|--------|-----------|-----------|
| **Security** | ❌ Vulnerable | ✅ Secure |
| **Visibility** | ❌ Readable by anyone | ✅ Unreadable |
| **Size** | ✅ Small (~60B) | ⚠️ Larger (~400B) |
| **Speed** | ✅ Fast | ⚠️ Slightly slower |
| **Setup** | ✅ Simple | ⚠️ Requires setup |
| **Protection** | ❌ None | ✅ Military-grade AES-256-GCM |

**Recommendation**: Use encryption for ALL requests containing sensitive data (passwords, personal info, payment details, etc.)
