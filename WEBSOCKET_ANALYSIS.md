# WebSocket Communication Flow Analysis

## Overview

This document outlines all WebSocket communications between Admin and Client to ensure bidirectional real-time updates.

## WebSocket Events Structure

### Server-to-Client Events

#### Admin Room Events (`admin` room)

- `admin-notification` - General admin notifications
- `extension-request-updated` - Extension request updates

#### User Room Events (`user-{userId}` room)

- `codes-updated` - Trading code updates
- `customer-account-updated` - Customer account updates
- `client-notification` - Direct client notifications

#### Broadcast Events (all connected clients)

- `broadcast-notification` - System-wide notifications

## Complete Communication Matrix

### 1. **Client Generates Trading Code**

**Flow**: Client → Server → Admin

- **API**: `/api/generate-code`
- **Client Action**: User generates new trading code
- **Server Emissions**:
  - `emitCodesUpdate(userId, data)` → Client gets updated codes list
  - `emitAdminNotification(message, 'info')` → Admin sees new code notification
- **Result**: Client sees new code immediately, Admin gets notification

### 2. **Admin Updates Code Status**

**Flow**: Admin → Server → Client

- **API**: `/api/admin/codes` (PUT)
- **Admin Action**: Changes code status (activate/complete/cancel/expire)
- **Server Emissions**:
  - `emitCodesUpdate(userId, data)` → Client sees status change
  - `emitCustomerAccountUpdate(userId, data)` → Client gets account updates (if activated)
  - `emitNotificationToAdminAndClient(userId, message, type)` → Both get notifications
- **Result**: Client sees status change immediately, gets notification popup

### 3. **Client Requests Extension**

**Flow**: Client → Server → Admin

- **API**: `/api/extend-code`
- **Client Action**: Requests license extension
- **Server Emissions**:
  - `emitAdminNotification(message, 'info')` → Admin sees extension request
  - `emitExtensionRequestUpdate(data)` → Admin dashboard updates
- **Result**: Admin immediately sees new extension request

### 4. **Admin Processes Extension Request**

**Flow**: Admin → Server → Client

- **API**: `/api/admin/extension-requests` (PUT)
- **Admin Action**: Approves/rejects extension request
- **Server Emissions**:
  - `emitCustomerAccountUpdate(userId, data)` → Client gets account update
  - `emitNotificationToAdminAndClient(userId, message, type)` → Both get notifications
  - `emitExtensionRequestUpdate(data)` → Admin dashboard updates
- **Result**: Client sees extended license immediately, gets success notification

### 5. **Admin Manually Extends Customer**

**Flow**: Admin → Server → Client

- **API**: `/api/admin/extend-customer`
- **Admin Action**: Manually extends customer license
- **Server Emissions**:
  - `emitCustomerAccountUpdate(userId, data)` → Client gets account update
  - `emitNotificationToAdminAndClient(userId, message, type)` → Both get notifications
- **Result**: Client sees extension immediately

### 6. **Admin Creates Manual Account**

**Flow**: Admin → Server → Client

- **API**: `/api/admin/create-account`
- **Admin Action**: Creates customer account manually
- **Server Emissions**:
  - `emitCustomerAccountUpdate(userId, data)` → Client gets new account
  - `emitNotificationToAdminAndClient(userId, message, type)` → Both get notifications
- **Result**: Client sees new account immediately

## Verification Checklist

### ✅ WebSocket Server

- [x] Proper initialization in global scope
- [x] Room management (admin, user-specific)
- [x] Connection/disconnection handling
- [x] Error handling and recovery

### ✅ Client-Side Integration

- [x] Multiple WebSocket hooks for different data types
- [x] Proper event subscription and cleanup
- [x] User-specific room joining
- [x] Connection status indicators

### ✅ Admin-Side Integration

- [x] Admin room joining
- [x] Extension request handling
- [x] Notification display
- [x] Real-time dashboard updates

### ✅ API Route Integration

- [x] All major API routes emit WebSocket events
- [x] Proper error handling for WebSocket failures
- [x] Bidirectional notification support
- [x] User identification for targeted emissions

## Conclusion

The WebSocket system provides comprehensive bidirectional real-time communication between Admin and Client with complete coverage of all user/admin interactions.
