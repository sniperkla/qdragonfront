# Client-Side Encryption Update Guide

## Current Status

✅ **Server-side encryption**: All API routes support encryption
✅ **Client-side encryption**: All user pages updated!
⚠️ **Admin page**: Import added, 20+ fetch calls need conversion

## What Needs to Be Updated

### Landing Page (`/src/app/landing/page.js`) ✅ COMPLETE

The following API calls need to be converted from `fetch()` to `encryptedFetch()`:

#### Already Updated ✅
- [x] `/api/my-licenses` (GET) - Line 245
- [x] `/api/purchase-license` (POST) - Line 1148  
- [x] `/api/extend-license` (POST) - Line 939
- [x] `/api/auth/me` (GET) - Lines 169, 197
- [x] `/api/plans` (GET) - Line 281
- [x] `/api/history` (GET) - Line 424
- [x] `/api/auth/logout` (POST) - Line 995
- [x] `/api/change-account-number` (PUT) - Lines 1015, 1075
- [x] `/api/topup` (POST) - Line 1198
- [x] `/api/purchase-points` (POST) - Line 1301

#### Still Need Updates ❌
- [ ] `/api/test-topup` (POST) - Line 1182 (Low priority - testing only)

### Admin Page (`/src/app/admin/page.js`)

✅ **Import added** - `encryptedFetch` is ready to use

⚠️ **20+ fetch calls need conversion**:
- [ ] `/api/admin/verify` - Line 248
- [ ] `/api/admin/login` - Line 335
- [ ] `/api/admin/codes` - Lines 362, 410
- [ ] `/api/admin/customers` - Lines 387, 466
- [ ] `/api/admin/customers/bulk` - Line 570
- [ ] `/api/admin/extension-requests` - Line 677
- [ ] `/api/admin/topup` - Lines 695, 917, 1085
- [ ] `/api/admin/plan-settings` - Lines 717, 827
- [ ] `/api/admin/system-settings` - Lines 850, 871, 897
- [ ] `/api/admin/topup/bulk` - Lines 985, 1034
- And more...

### Login/Register Pages ✅ COMPLETE

- [x] `/src/app/login/page.js` - `/api/auth/login`
- [x] `/src/app/register/page.js` - `/api/auth/register`

## How to Update

### Step 1: Import encryptedFetch

```javascript
import { encryptedFetch } from '@/lib/clientEncryption'
```

### Step 2: Replace fetch() calls

**Before:**
```javascript
const response = await fetch('/api/my-licenses', {
  credentials: 'include'
})
const data = await response.json()

if (response.ok) {
  // Handle success
} else {
  // Handle error
}
```

**After:**
```javascript
try {
  const data = await encryptedFetch('/api/my-licenses', {
    credentials: 'include'
  })
  
  // Data is already decrypted and parsed
  // Handle success
} catch (error) {
  // Handle error - encryptedFetch throws on non-200 status
  console.error(error.message)
}
```

### Step 3: Update error handling

`encryptedFetch()` throws errors instead of returning error responses, so:

**Before:**
```javascript
if (response.ok) {
  console.log(data.message)
} else {
  console.error(data.error)
}
```

**After:**
```javascript
try {
  const data = await encryptedFetch('/api/endpoint')
  console.log(data.message)
} catch (error) {
  console.error(error.message)
}
```

## Testing

After updating each endpoint:

1. Open browser DevTools → Network tab
2. Make a request to the updated endpoint
3. Check the request payload - should see:
   ```json
   {
     "encryptedData": "a1b2c3d4e5f6...",
     "iv": "2c3d4e5f6a7b...",
     "salt": "b2c3d4e5f6a7..."
   }
   ```
4. Check request headers - should see:
   ```
   X-Encrypted: true
   ```
5. Check response - should also be encrypted
6. Check console - should see decrypted data

## Priority Order

1. **HIGH**: Login, Register, Purchase operations (sensitive data)
2. **MEDIUM**: User data fetching (licenses, history, profile)
3. **LOW**: Public data (plans, system settings)

## Example: Complete Conversion

### Before (Plain fetch):
```javascript
const handlePurchasePoints = async () => {
  try {
    const response = await fetch('/api/purchase-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ points: 100, amount: 100 })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      alert('Purchase successful!')
      setPoints(data.newPoints)
    } else {
      alert(data.error || 'Purchase failed')
    }
  } catch (error) {
    alert('Network error')
  }
}
```

### After (Encrypted fetch):
```javascript
const handlePurchasePoints = async () => {
  try {
    const data = await encryptedFetch('/api/purchase-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ points: 100, amount: 100 })
    })
    
    // data is already decrypted
    alert('Purchase successful!')
    setPoints(data.newPoints)
  } catch (error) {
    // encryptedFetch throws on error
    alert(error.message || 'Purchase failed')
  }
}
```

## Notes

- `encryptedFetch()` automatically adds `X-Encrypted: true` header
- Request body is automatically encrypted before sending
- Response is automatically decrypted after receiving
- Errors are thrown instead of returned in response
- All encryption/decryption happens transparently

## Verification

Once all updates are complete, you should see in browser DevTools:

**Request (encrypted):**
```json
{
  "encryptedData": "long hex string...",
  "iv": "32 character hex...",
  "salt": "128 character hex..."
}
```

**Response (encrypted):**
```json
{
  "encryptedData": "long hex string...",
  "iv": "32 character hex...",
  "salt": "128 character hex..."
}
```

**Console (decrypted):**
```javascript
{ success: true, licenses: [...], user: {...} }
```

This proves end-to-end encryption is working! 🔒
