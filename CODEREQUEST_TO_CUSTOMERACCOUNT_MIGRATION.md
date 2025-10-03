# CodeRequest to CustomerAccount Migration

## Overview
The system has been updated to create `CustomerAccount` records directly when customers purchase licenses, eliminating the use of `CodeRequest` for new purchases. This simplifies the license management flow and makes `CustomerAccount` the single source of truth for active licenses.

## What Changed

### 1. **Purchase Flow (Instant Activation)**

#### Before:
- Customer purchases license → Creates `CodeRequest` with status "pending_payment"
- Admin approves payment → Updates `CodeRequest` to "activated" → Creates `CustomerAccount`
- Two-step process with manual admin intervention

#### After:
- Customer purchases license → Creates `CustomerAccount` directly with status "valid"
- Instant activation, no pending state
- Single-step process, no admin approval needed

### 2. **Modified Routes**

#### `/api/purchase-license` (Regular Purchases)
- **Changed**: Now creates `CustomerAccount` directly instead of `CodeRequest`
- **Status**: Instant activation (status: 'valid')
- **Expiry**: Calculated immediately in Thai Buddhist calendar format
- **WebSocket**: Emits `emitCustomerAccountUpdate` instead of `emitNewCodeGenerated`

#### `/api/purchase-points` (Points-Based Purchases)
- **Changed**: Now creates `CustomerAccount` directly instead of `CodeRequest`
- **Status**: Instant activation (status: 'valid')
- **Points**: Deducted immediately
- **WebSocket**: Emits `emitCustomerAccountUpdate` for real-time sync

#### `/api/my-licenses` (User License List)
- **Changed**: Fetches only from `CustomerAccount` (removed `CodeRequest` dependency)
- **Benefit**: Simpler logic, single data source
- **Expiry**: Uses `CustomerAccount.expireDate` (Thai format: "DD/MM/YYYY HH:mm")

#### `/api/history` (Purchase History)
- **Changed**: Fetches purchase history from `CustomerAccount` instead of `CodeRequest`
- **Filter**: Only shows user-created purchases (adminGenerated: false)
- **Data**: Maps CustomerAccount status 'valid' to 'activated' for UI consistency

#### `/api/extend-license` (License Extension)
- **Changed**: Prioritizes `CustomerAccount` lookup, falls back to `CodeRequest` for legacy data
- **Source Priority**: customerAccount → codeRequest (legacy)
- **Expiry Calculation**: Based on `CustomerAccount.expireDate`

## Data Flow

### New Purchase Flow
```
User → /api/purchase-license
  ↓
1. Validate user & plan
2. Deduct points (if points purchase)
3. Generate license code
4. Calculate expiry date (Thai Buddhist format)
5. Create CustomerAccount (status: 'valid')
6. Emit WebSocket updates
7. Send confirmation email
8. Return success with license details
```

### License Extension Flow
```
User → /api/extend-license
  ↓
1. Look up CustomerAccount by ID
2. Verify ownership (user.username matches)
3. Check points balance
4. Parse current expiry date (Thai format)
5. Calculate new expiry date
6. Deduct points
7. Update CustomerAccount.expireDate
8. Create ExtensionRequest record
9. Emit WebSocket updates
10. Return success with new expiry
```

## Database Schema

### CustomerAccount (Primary Model)
```javascript
{
  user: String,              // username (required)
  license: String,           // license code (required, unique)
  expireDate: String,        // Thai format: "DD/MM/YYYY HH:mm" (required)
  status: String,            // 'valid' | 'expired' | 'suspended'
  platform: String,          // trading platform
  accountNumber: String,     // trading account number
  plan: Number,              // days (30, 60, 90, 999999 for lifetime)
  isDemo: Boolean,           // demo account flag
  demoDays: Number,          // original demo days
  activatedAt: Date,         // activation timestamp
  createdAt: Date,           // creation timestamp
  createdBy: String,         // 'user' | 'admin'
  adminGenerated: Boolean    // true if admin created
}
```

## Thai Date Format

All expiry dates are stored in Thai Buddhist calendar format:
- **Format**: `DD/MM/YYYY HH:mm`
- **Example**: `03/10/2568 14:30` (October 3, 2025 at 2:30 PM)
- **Conversion**: Thai year = Gregorian year + 543

### Parsing Thai Date to JavaScript Date
```javascript
const [day, month, thaiYear] = dateString.split(' ')[0].split('/')
const [hours, minutes] = dateString.split(' ')[1].split(':')
const gregorianYear = parseInt(thaiYear) - 543
const date = new Date(gregorianYear, parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes))
```

### Formatting JavaScript Date to Thai Format
```javascript
const formatThaiDateTime = (date) => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const yearBE = d.getFullYear() + 543
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month}/${yearBE} ${hours}:${minutes}`
}
```

## Legacy Support

### CodeRequest (Deprecated for New Purchases)
- **Still Used For**: Admin-managed codes, legacy licenses
- **Routes Still Using**:
  - `/api/admin/codes` - Admin code management
  - `/api/extend-license` - Fallback for legacy licenses
  - `/api/generate-code` - Admin code generation
  
### Backward Compatibility
The system maintains backward compatibility for existing CodeRequest records:
1. `/api/extend-license` checks CustomerAccount first, then falls back to CodeRequest
2. Legacy licenses can still be extended
3. Migration creates CustomerAccount for legacy licenses when extended

## WebSocket Events

### Before (CodeRequest-based)
```javascript
emitNewCodeGenerated({ codeId, code, status: 'pending_payment' })
emitCodesUpdate({ action: 'purchase-created', status: 'pending_payment' })
```

### After (CustomerAccount-based)
```javascript
emitCustomerAccountUpdate({ type: 'created', license, expireDate, plan })
emitCodesUpdate({ action: 'purchase-created', status: 'valid' })
```

## Testing Checklist

- [ ] Purchase license via points - instant activation
- [ ] Purchase license via payment - instant activation
- [ ] View licenses on landing page - shows all CustomerAccounts
- [ ] Extend license - calculates from CustomerAccount.expireDate
- [ ] Extend license - uses configurable cost per day setting
- [ ] Extend license - respects max days limit from settings
- [ ] Change account number - uses CustomerAccount as primary
- [ ] Change account number - uses configurable cost setting
- [ ] View purchase history - shows CustomerAccount-based purchases
- [ ] WebSocket real-time updates work
- [ ] Email notifications sent correctly
- [ ] Thai date format displays correctly
- [ ] Legacy licenses still functional
- [ ] Extension settings API returns correct values
- [ ] Account change settings API returns correct values
- [ ] Admin can modify extension/account change costs
- [ ] Admin can enable/disable extension/account change features

## Benefits

1. **Simplified Architecture**: Single source of truth (CustomerAccount)
2. **Instant Activation**: No pending state or manual approval
3. **Better Performance**: Fewer database queries (no dual lookup)
4. **Clearer Data Flow**: Purchase → CustomerAccount (direct)
5. **Consistent Expiry**: All expiry dates in CustomerAccount.expireDate
6. **Real-time Sync**: WebSocket events reflect immediate changes
7. **Configurable Costs**: System settings for extension and account change costs

## System Settings

The system now uses configurable settings for features that consume credits:

### Extension Settings
- **`license_extension_enabled`** (Boolean): Enable/disable license extension feature
  - Default: `true`
  - Category: features

- **`license_extension_cost_per_day`** (Number): Cost in credits per day of extension
  - Default: `1` (1 credit = 1 day)
  - Category: pricing
  - Example: Extending 30 days costs 30 credits

- **`license_extension_max_days`** (Number): Maximum days allowed per extension
  - Default: `365`
  - Category: limits

### Account Change Settings
- **`account_number_change_enabled`** (Boolean): Enable/disable account number change
  - Default: `true`
  - Category: features

- **`account_number_change_cost`** (Number): Cost in credits to change account number
  - Default: `1000`
  - Category: pricing

### API Endpoints for Settings

**GET `/api/extend-license`** - Get extension settings
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "costPerDay": 1,
    "maxDays": 365,
    "userCredits": 5000
  }
}
```

**GET `/api/change-account-number`** - Get account change settings
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "cost": 1000,
    "userCredits": 5000,
    "canAfford": true
  }
}
```

## Migration Notes

### For Existing Data
- Existing CodeRequest records remain in database
- Legacy licenses work via backward compatibility
- New purchases create only CustomerAccount records
- No data migration required for existing users

### For Developers
- Use `/api/my-licenses` to fetch all user licenses
- All expiry logic should reference `CustomerAccount.expireDate`
- Always emit `emitCustomerAccountUpdate` after creating/updating licenses
- Use Thai Buddhist calendar format for all expiry dates

## API Response Examples

### Purchase License Response
```json
{
  "success": true,
  "license": "QL-LKJ23X-45Y6Z7",
  "accountNumber": "12345678",
  "platform": "MT5",
  "plan": 30,
  "price": 990,
  "currency": "THB",
  "status": "valid",
  "expireDate": "02/11/2568 14:30",
  "message": "License purchased and activated successfully!"
}
```

### My Licenses Response
```json
{
  "success": true,
  "licenses": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "code": "QL-LKJ23X-45Y6Z7",
      "platform": "MT5",
      "accountNumber": "12345678",
      "plan": 30,
      "cumulativePlanDays": 30,
      "price": null,
      "status": "valid",
      "createdAt": "2025-10-03T07:30:00.000Z",
      "activatedAt": "2025-10-03T07:30:00.000Z",
      "expireDate": "02/11/2568 14:30",
      "source": "customerAccount",
      "isDemo": false,
      "adminGenerated": false
    }
  ]
}
```

## Rollback Plan

If issues arise, rollback involves:
1. Revert purchase routes to create CodeRequest
2. Restore admin approval flow
3. Re-enable dual-source logic in my-licenses route
4. Update WebSocket events back to CodeRequest pattern

**Note**: Not recommended as new system is simpler and more efficient.

---

**Last Updated**: October 3, 2025
**Status**: ✅ Active
**Breaking Changes**: None (backward compatible with legacy data)
