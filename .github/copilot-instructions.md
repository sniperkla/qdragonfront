# Q-Dragon Trading License Management System

## Architecture Overview

This Next.js 15 application manages trading licenses with real-time admin/client communication via WebSocket. Core workflow: Users register → Purchase/redeem licenses → Admin manages → Real-time sync.

### Key Components

- **Authentication**: JWT-based with MongoDB sessions (`/src/lib/auth.js`)
- **WebSocket Hub**: Real-time bidirectional communication (`/src/lib/websocket.js`)
- **Points System**: 1 USD = 1 Point = 1 Day license extension/purchase
- **Dual License Sources**: `CodeRequest` (payment-based) + `CustomerAccount` (admin-generated)
- **Multi-language**: Thai/English with `useTranslation` hook

## Data Models

### User (`/src/lib/userModel.js`)
```js
{ username, email, password, points: Number, preferredLanguage: 'en'|'th' }
```

### CodeRequest (`/src/lib/codeRequestModel.js`)
```js
{ userId, code, status: 'pending_payment'|'paid'|'activated'|'expired', pointsUsed: Number }
```

### CustomerAccount (`/src/lib/customerAccountModel.js`)
```js
{ user: username, license, expireDate: "DD/MM/YYYY HH:mm", status: 'valid'|'expired' }
```

## Critical Patterns

### WebSocket Communication Flow
Always emit WebSocket events after database changes:
```js
// Example from extend-license route
await emitCodesUpdate(userId, { action: 'extended', license: code })
await emitCustomerAccountUpdate(userId, { type: 'extended', newExpiry })
```

### Unified License View (`/api/my-licenses`)
Merges `CodeRequest` + `CustomerAccount` data with extension history aggregation. Always prioritize `customerAccount.expireDate` over `codeRequest.expiresAt`.

### Thai Date Handling
Dates stored as "DD/MM/YYYY HH:mm" strings in Thai Buddhist calendar. Use `parseThaiDate()` function in landing page for conversion.

### Points System Integration
- Instant activation: Points → License (no payment waiting)
- Extension: Points deducted immediately, license extended
- Top-up: Admin approval required before points added

## Development Commands

```bash
npm run dev          # Development with Turbopack
npm run build        # Production build
npm run start        # Production server
```

## API Route Patterns

### Authentication Required
```js
const authData = verifyAuth(request)
if (!authData) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
```

### WebSocket Emissions Pattern
```js
try {
  await emitCodesUpdate(userId, data)
  await emitCustomerAccountUpdate(userId, data)
} catch (wsError) {
  console.warn('WebSocket emission failed (non-fatal):', wsError.message)
  // Don't fail main operation
}
```

### Response Format
```js
return new Response(JSON.stringify({ success: true, data }), { status: 200 })
```

## Frontend Patterns

### Landing Page Structure
- Points System Section (top priority per user request)
- Trading Licenses Table with real-time countdown
- History Section (purchases + extensions)
- WebSocket connection with room joining

### State Management
Redux for auth, local state for UI. WebSocket handlers update both via `dispatch(loginSuccess())` and local setters.

### Multi-language Support
Always use `t('key')` from `useTranslation`. Thai-specific logic for date formatting and currency display.

## File Structure Logic

- `/src/app/api/` - All API routes (auth, admin, license management)
- `/src/lib/` - Models, utilities, WebSocket handlers
- `/src/components/` - Reusable UI components
- `/src/hooks/` - Custom hooks (translation, WebSocket)
- `/src/store/` - Redux store and auth slice

## Common Gotchas

1. **License Expiry**: Always check both `customerAccount.expireDate` and `codeRequest.expiresAt`
2. **WebSocket Room Joining**: User rooms are `user-${userId}`, admin room is `admin`
3. **Points Validation**: Check sufficient points before allowing extensions/purchases
4. **Thai Dates**: Convert Buddhist year (subtract 543) to Gregorian for Date objects
5. **Status Synchronization**: CodeRequest and CustomerAccount statuses must stay in sync

## Testing Endpoints

- `/api/test/websocket-communication` - WebSocket functionality
- `/api/admin/test-websocket` - Admin WebSocket testing
- `/api/test/notifications` - Notification system testing

When modifying license logic, always test the real-time sync between admin dashboard and user landing page.