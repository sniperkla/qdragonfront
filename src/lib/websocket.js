// WebSocket utility functions for API routes
// This file provides safe WebSocket function calls with error handling

// Get global WebSocket instance
function getWebSocketInstance() {
  if (typeof global === 'undefined') {
    return null
  }

  const io = global.__socketIO
  if (!io) {
    return null
  }

  return io
}

// Safe WebSocket emission functions that handle cases where the WebSocket server isn't available
export async function emitCodesUpdate(userId, data) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      return null
    }

    const userRoomSize =
      io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
    const adminRoomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    io.to(`user-${userId}`).emit('codes-updated', data)
    // Always also notify admin room so Trading Codes tab refreshes immediately
    io.to('admin').emit('codes-updated', { ...data, _from: 'emitCodesUpdate' })
    // Fallback broadcast ONLY if neither user nor admin received it (both rooms empty)
    if (userRoomSize === 0 && adminRoomSize === 0) {
      const payload = { ...data, userId, _broadcast: true }
      io.emit('codes-updated-broadcast', payload)
    }
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
      return null
    }

    const roomSize = io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
    io.to(`user-${userId}`).emit('customer-account-updated', data)

    // ALSO notify all admins so their customer list refreshes immediately
    const adminRoomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    io.to('admin').emit('customer-account-updated', {
      ...data,
      _from: 'customer-account-update'
    })

    // Fallback: if neither user nor admin is connected, broadcast (rare but helpful during reconnects)
    if (roomSize === 0 && adminRoomSize === 0) {
      io.emit('customer-account-updated-broadcast', {
        ...data,
        _broadcast: true
      })
    }
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
      return null
    }

    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    const notificationData = {
      message,
      type,
      timestamp: new Date().toISOString()
    }
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
      return null
    }

    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    io.to('admin').emit('extension-request-updated', requestData)
    if (roomSize === 0) {
      // Fallback broadcast so any late-joining admin or mis-joined client can still react
      const broadcastPayload = { ...requestData, _broadcast: true }
      io.emit('extension-request-updated-broadcast', broadcastPayload)
    }
    return true
  } catch (error) {
    console.error('WebSocket emitExtensionRequestUpdate error:', error)
    return null
  }
}

// Send notification to both admin and specific client
export async function emitNotificationToAdminAndClient(
  userId,
  message,
  type = 'info'
) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      return null
    }

    const notificationData = {
      message,
      type,
      timestamp: new Date().toISOString()
    }

    // Send to admin room
    const adminRoomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    io.to('admin').emit('admin-notification', notificationData)

    // Send to specific client room
    if (userId) {
      const clientRoomSize =
        io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
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
      return null
    }

    const notificationData = {
      message,
      type,
      timestamp: new Date().toISOString()
    }

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
      return null
    }

    const notificationData = {
      message,
      type,
      timestamp: new Date().toISOString()
    }
    const clientRoomSize =
      io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0

    io.to(`user-${userId}`).emit('client-notification', notificationData)

    return true
  } catch (error) {
    console.error('WebSocket emitClientNotification error:', error)
    return null
  }
}

// Emit new code generated event to admin
export async function emitNewCodeGenerated(codeData) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      return null
    }

    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    io.to('admin').emit('new-code-generated', codeData)
    return true
  } catch (error) {
    console.error('WebSocket emitNewCodeGenerated error:', error)
    return null
  }
}

// Emit extension processed event to admin
export async function emitExtensionProcessed(extensionData) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      return null
    }

    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    io.to('admin').emit('extension-processed', extensionData)
    return true
  } catch (error) {
    console.error('WebSocket emitExtensionProcessed error:', error)
    return null
  }
}

// Emit top-up request update to admin
export async function emitTopUpRequestUpdate(requestData) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      return null
    }

    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    io.to('admin').emit('topup-request-updated', requestData)
    return true
  } catch (error) {
    console.error('WebSocket emitTopUpRequestUpdate error:', error)
    return null
  }
}

// Emit top-up processed event to admin
export async function emitTopUpProcessed(topUpData) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      return null
    }

    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    io.to('admin').emit('topup-processed', topUpData)
    return true
  } catch (error) {
    console.error('WebSocket emitTopUpProcessed error:', error)
    return null
  }
}

// Emit points update to specific user
export async function emitPointsUpdate(userId, newPoints) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      return null
    }

    const roomSize = io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
    const pointsData = { newPoints, timestamp: new Date().toISOString() }
    io.to(`user-${userId}`).emit('points-updated', pointsData)

    // Fallback broadcast if user not connected
    if (roomSize === 0) {
      const broadcastPayload = { ...pointsData, userId, _broadcast: true }
      io.emit('points-updated-broadcast', broadcastPayload)
    }
    return true
  } catch (error) {
    console.error('WebSocket emitPointsUpdate error:', error)
    return null
  }
}
