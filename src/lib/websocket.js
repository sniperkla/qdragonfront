// WebSocket utility functions for API routes
// This file provides safe WebSocket function calls with error handling

// Get global WebSocket instance
function getWebSocketInstance() {
  if (typeof global === 'undefined') {
    console.warn('🚫 Global object not available')
    return null
  }
  
  const io = global.__socketIO
  if (!io) {
    console.warn('🚫 WebSocket server not initialized in global scope')
    console.warn('💡 Try calling /api/force-init/socketio to initialize the server')
    return null
  }
  
  console.log('✅ WebSocket instance found, clients:', io.engine?.clientsCount || 0)
  return io
}

// Safe WebSocket emission functions that handle cases where the WebSocket server isn't available
export async function emitCodesUpdate(userId, data) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      console.warn('WebSocket server not initialized - cannot emit codes update')
      return null
    }
    
    console.log(`🎯 Emitting codes update to user ${userId}`)
    const roomSize = io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
    console.log(`📡 Emitting 'codes-updated' to room 'user-${userId}' (${roomSize} clients):`, data)
    io.to(`user-${userId}`).emit('codes-updated', data)
    return true
  } catch (error) {
    console.error('WebSocket emitCodesUpdate error:', error)
    return null
  }
}

export async function emitCustomerAccountUpdate(userId, data) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      console.warn('WebSocket server not initialized - cannot emit customer account update')
      return null
    }
    
    console.log(`🎯 Emitting customer account update to user ${userId}`)
    const roomSize = io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
    console.log(`📡 Emitting 'customer-account-updated' to room 'user-${userId}' (${roomSize} clients):`, data)
    io.to(`user-${userId}`).emit('customer-account-updated', data)
    return true
  } catch (error) {
    console.error('WebSocket emitCustomerAccountUpdate error:', error)
    return null
  }
}

export async function emitAdminNotification(message, type = 'info') {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      console.warn('WebSocket server not initialized - cannot emit admin notification')
      return null
    }
    
    console.log(`🎯 Emitting admin notification: ${message} (${type})`)
    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    const notificationData = { message, type, timestamp: new Date().toISOString() }
    console.log(`📡 Emitting 'admin-notification' to room 'admin' (${roomSize} clients):`, notificationData)
    io.to('admin').emit('admin-notification', notificationData)
    return true
  } catch (error) {
    console.error('WebSocket emitAdminNotification error:', error)
    return null
  }
}

export async function emitExtensionRequestUpdate(requestData) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      console.warn('WebSocket server not initialized - cannot emit extension request update')
      return null
    }
    
    console.log(`🎯 Emitting extension request update to admin`)
    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    console.log(`📡 Emitting 'extension-request-updated' to room 'admin' (${roomSize} clients):`, requestData)
    io.to('admin').emit('extension-request-updated', requestData)
    return true
  } catch (error) {
    console.error('WebSocket emitExtensionRequestUpdate error:', error)
    return null
  }
}

// Send notification to both admin and specific client
export async function emitNotificationToAdminAndClient(userId, message, type = 'info') {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      console.warn('WebSocket server not initialized - cannot emit notification')
      return null
    }
    
    const notificationData = { message, type, timestamp: new Date().toISOString() }
    
    // Send to admin room
    const adminRoomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    console.log(`📡 Emitting 'admin-notification' to room 'admin' (${adminRoomSize} clients):`, notificationData)
    io.to('admin').emit('admin-notification', notificationData)
    
    // Send to specific client room
    if (userId) {
      const clientRoomSize = io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
      console.log(`📡 Emitting 'client-notification' to room 'user-${userId}' (${clientRoomSize} clients):`, notificationData)
      io.to(`user-${userId}`).emit('client-notification', notificationData)
    }
    
    return true
  } catch (error) {
    console.error('WebSocket emitNotificationToAdminAndClient error:', error)
    return null
  }
}

// Send notification to all clients (broadcast)
export async function emitBroadcastNotification(message, type = 'info') {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      console.warn('WebSocket server not initialized - cannot emit broadcast notification')
      return null
    }
    
    const notificationData = { message, type, timestamp: new Date().toISOString() }
    
    console.log(`📡 Broadcasting notification to all clients (${io.engine.clientsCount} total):`, notificationData)
    io.emit('broadcast-notification', notificationData)
    
    return true
  } catch (error) {
    console.error('WebSocket emitBroadcastNotification error:', error)
    return null
  }
}

// Send notification to specific client only
export async function emitClientNotification(userId, message, type = 'info') {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      console.warn('WebSocket server not initialized - cannot emit client notification')
      return null
    }
    
    const notificationData = { message, type, timestamp: new Date().toISOString() }
    const clientRoomSize = io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
    
    console.log(`📡 Emitting 'client-notification' to room 'user-${userId}' (${clientRoomSize} clients):`, notificationData)
    io.to(`user-${userId}`).emit('client-notification', notificationData)
    
    return true
  } catch (error) {
    console.error('WebSocket emitClientNotification error:', error)
    return null
  }
}