# System Settings Guide

## Overview

The Q-Dragon Trading License Management System uses configurable system settings to control feature availability, pricing, and limits. These settings can be modified by administrators through the admin dashboard or API.

## Settings Architecture

### Database Model
Settings are stored in the `SystemSetting` collection with the following schema:

```javascript
{
  key: String,           // Unique identifier (e.g., 'license_extension_cost_per_day')
  value: Mixed,          // Any data type (Number, Boolean, String, Object, Array)
  description: String,   // Human-readable description
  category: String,      // 'general' | 'pricing' | 'features' | 'limits'
  updatedBy: String,     // Username of admin who last updated
  createdAt: Date,       // Auto-generated timestamp
  updatedAt: Date        // Auto-generated timestamp
}
```

### Static Methods

**`getSetting(key, defaultValue)`** - Retrieve a setting value
```javascript
const costPerDay = await SystemSetting.getSetting('license_extension_cost_per_day', 1)
```

**`setSetting(key, value, description, category, updatedBy)`** - Update or create a setting
```javascript
await SystemSetting.setSetting(
  'license_extension_cost_per_day',
  2,
  'Cost in credits per day for license extension',
  'pricing',
  'admin@example.com'
)
```

**`seedDefaultSettings()`** - Initialize default settings
```javascript
await SystemSetting.seedDefaultSettings()
```

## Available Settings

### License Extension Settings

#### `license_extension_enabled`
- **Type**: Boolean
- **Default**: `true`
- **Category**: features
- **Description**: Enable or disable the license extension feature
- **Usage**: If `false`, users cannot extend their licenses
- **API Impact**: `/api/extend-license` returns 403 error when disabled

#### `license_extension_cost_per_day`
- **Type**: Number
- **Default**: `1`
- **Category**: pricing
- **Description**: Cost in credits per day of extension
- **Usage**: Extending 30 days costs `30 * costPerDay` credits
- **Example**: 
  - Cost per day = 1 → 30 days = 30 credits
  - Cost per day = 2 → 30 days = 60 credits
- **API**: Used in `/api/extend-license` to calculate required points

#### `license_extension_max_days`
- **Type**: Number
- **Default**: `365`
- **Category**: limits
- **Description**: Maximum days allowed per single extension request
- **Usage**: Prevents excessive extensions in one transaction
- **API Impact**: `/api/extend-license` returns 400 error if requested days exceed limit

### Account Number Change Settings

#### `account_number_change_enabled`
- **Type**: Boolean
- **Default**: `true`
- **Category**: features
- **Description**: Enable or disable account number change feature
- **Usage**: If `false`, users cannot change their trading account numbers
- **API Impact**: `/api/change-account-number` returns 403 error when disabled

#### `account_number_change_cost`
- **Type**: Number
- **Default**: `1000`
- **Category**: pricing
- **Description**: Cost in credits to change account number
- **Usage**: One-time fee regardless of new account number
- **Example**: User pays 1000 credits to change from account "12345" to "67890"
- **API**: Used in `/api/change-account-number` to validate and deduct credits

## API Endpoints

### Get Extension Settings
**`GET /api/extend-license`**

Retrieves current extension settings and user's available credits.

**Response:**
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

**Frontend Usage:**
```javascript
const response = await fetch('/api/extend-license', {
  method: 'GET',
  credentials: 'include'
})
const { data } = await response.json()
console.log(`Extension costs ${data.costPerDay} credits per day`)
console.log(`You have ${data.userCredits} credits`)
console.log(`Max extension: ${data.maxDays} days`)
```

### Get Account Change Settings
**`GET /api/change-account-number`**

Retrieves current account change settings and user's ability to afford it.

**Response:**
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

**Frontend Usage:**
```javascript
const response = await fetch('/api/change-account-number', {
  method: 'GET',
  credentials: 'include'
})
const { data } = await response.json()
if (data.enabled && data.canAfford) {
  console.log(`You can change your account for ${data.cost} credits`)
} else if (!data.enabled) {
  console.log('Account change feature is disabled')
} else {
  console.log(`Insufficient credits. Need ${data.cost}, have ${data.userCredits}`)
}
```

## Admin Management

### Viewing Settings
Administrators can view all settings through the admin dashboard:
- Navigate to Admin Dashboard → System Settings
- Settings are grouped by category (features, pricing, limits)
- Each setting shows: key, current value, description, last updated

### Modifying Settings
Administrators can update settings through the admin dashboard or API:

**Via Admin Dashboard:**
1. Navigate to System Settings
2. Find the setting to modify
3. Click "Edit" button
4. Enter new value
5. Click "Save"

**Via API (Admin only):**
```javascript
// Example: Update extension cost per day to 2 credits
await fetch('/api/admin/system-settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    key: 'license_extension_cost_per_day',
    value: 2,
    description: 'Updated cost for extension'
  })
})
```

## Business Logic Examples

### License Extension Cost Calculation

**Scenario**: User wants to extend license by 30 days

```javascript
// Get settings
const costPerDay = await SystemSetting.getSetting('license_extension_cost_per_day', 1)
const maxDays = await SystemSetting.getSetting('license_extension_max_days', 365)

// Validate request
if (requestedDays > maxDays) {
  throw new Error(`Maximum extension is ${maxDays} days`)
}

// Calculate required credits
const requiredCredits = requestedDays * costPerDay // 30 * 1 = 30 credits

// Check user balance
if (user.points < requiredCredits) {
  throw new Error(`Insufficient credits. Need ${requiredCredits}, have ${user.points}`)
}

// Deduct credits
user.points -= requiredCredits
await user.save()
```

### Account Number Change

**Scenario**: User wants to change trading account number

```javascript
// Get settings
const isEnabled = await SystemSetting.getSetting('account_number_change_enabled', true)
const cost = await SystemSetting.getSetting('account_number_change_cost', 1000)

// Validate feature is enabled
if (!isEnabled) {
  throw new Error('Account number change feature is currently disabled')
}

// Check user balance
if (user.points < cost) {
  throw new Error(`Insufficient credits. Need ${cost}, have ${user.points}`)
}

// Deduct credits
user.points -= cost
await user.save()

// Update account number in CustomerAccount
await CustomerAccount.findOneAndUpdate(
  { license: licenseCode, user: username },
  { accountNumber: newAccountNumber }
)
```

## Default Values Strategy

All settings have sensible defaults defined in code:
- **Features**: Enabled by default (`true`)
- **Pricing**: Reasonable starter prices (1 credit/day, 1000 credits/change)
- **Limits**: Generous but safe limits (365 days max extension)

**Why defaults matter:**
1. System works immediately after installation
2. Missing settings don't break functionality
3. Administrators can selectively override defaults
4. Database migrations don't require setting updates

## Best Practices

### For Administrators

1. **Test Before Production**: Change settings in development/staging first
2. **Document Changes**: Add clear descriptions when updating values
3. **Monitor Impact**: Track user behavior after pricing changes
4. **Communicate Changes**: Notify users of pricing or limit changes
5. **Keep Reasonable**: Don't set costs too high or limits too restrictive

### For Developers

1. **Always Use getSetting()**: Never hardcode values in business logic
2. **Provide Defaults**: Always specify default value in `getSetting()` calls
3. **Validate Settings**: Check setting types match expected values
4. **Cache Sparingly**: Settings can change; don't over-cache values
5. **Document Dependencies**: Note which features depend on which settings

## Adding New Settings

### Step 1: Update SystemSettingModel
Add new default setting in `seedDefaultSettings()`:

```javascript
{
  key: 'new_feature_enabled',
  value: true,
  description: 'Enable/disable new feature',
  category: 'features'
}
```

### Step 2: Use in Business Logic
```javascript
const isEnabled = await SystemSetting.getSetting('new_feature_enabled', true)
if (!isEnabled) {
  return { error: 'Feature disabled' }
}
```

### Step 3: Add to Admin Dashboard
Update admin settings UI to display and allow editing of new setting.

### Step 4: Document
Add to this guide and update migration documentation.

## Troubleshooting

### Setting Not Found
**Problem**: `getSetting()` returns default value, not database value

**Solutions:**
1. Run `await SystemSetting.seedDefaultSettings()` to initialize
2. Check setting key spelling (case-sensitive)
3. Verify database connection
4. Check admin has created the setting

### Wrong Data Type
**Problem**: Setting value is String when Number expected

**Solutions:**
1. Parse value: `parseInt(await SystemSetting.getSetting('key', 0))`
2. Update setting with correct type through admin dashboard
3. Add validation in `setSetting()` method

### Settings Not Applying
**Problem**: Changes to settings don't affect behavior

**Solutions:**
1. Verify business logic uses `getSetting()` (not hardcoded values)
2. Check for cached values that need clearing
3. Restart application server
4. Verify setting was actually saved (check database)

### Permission Denied
**Problem**: Cannot update settings through API

**Solutions:**
1. Verify user has admin role
2. Check authentication middleware
3. Review admin-only route protection
4. Check JWT token validity

## Future Settings (Roadmap)

Potential settings to add:

- `demo_license_duration_days` - Default days for demo licenses
- `points_purchase_minimum` - Minimum credits for top-up
- `points_purchase_maximum` - Maximum credits per top-up
- `license_renewal_reminder_days` - Days before expiry to send reminder
- `max_licenses_per_user` - Limit total active licenses per user
- `referral_bonus_points` - Credits earned per referral
- `bulk_extension_discount_percentage` - Discount for bulk extensions

---

**Last Updated**: October 3, 2025
**Status**: ✅ Active
**Maintainer**: Development Team
