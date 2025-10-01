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
    console.warn(
      '💡 Try calling /api/force-init/socketio to initialize the server'
    )
    return null
  }

  console.log(
    '✅ WebSocket instance found, clients:',
    io.engine?.clientsCount || 0
  )
  return io
}

// Safe WebSocket emission functions that handle cases where the WebSocket server isn't available
export async function emitCodesUpdate(userId, data) {
  try {
    const io = getWebSocketInstance()
    if (!io) {
      console.warn(
        'WebSocket server not initialized - cannot emit codes update'
      )
      return null
    }

    console.log(`🎯 Emitting codes update to user ${userId}`)
    const userRoomSize =
      io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
    const adminRoomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    console.log(
      `📡 Emitting 'codes-updated' to room 'user-${userId}' (${userRoomSize} clients):`,
      data
    )
    io.to(`user-${userId}`).emit('codes-updated', data)
    // Always also notify admin room so Trading Codes tab refreshes immediately
    console.log(
      `📡 Emitting 'codes-updated' to admin room (${adminRoomSize} clients):`,
      { ...data, _from: 'emitCodesUpdate' }
    )
    io.to('admin').emit('codes-updated', { ...data, _from: 'emitCodesUpdate' })
    // Fallback broadcast ONLY if neither user nor admin received it (both rooms empty)
    if (userRoomSize === 0 && adminRoomSize === 0) {
      const payload = { ...data, userId, _broadcast: true }
      console.log(
        '📢 No user/admin clients connected; broadcasting codes-updated-broadcast:',
        payload
      )
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
      console.warn(
        'WebSocket server not initialized - cannot emit customer account update'
      )
      return null
    }

    console.log(`🎯 Emitting customer account update to user ${userId}`)
    const roomSize = io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
    console.log(
      `📡 Emitting 'customer-account-updated' to room 'user-${userId}' (${roomSize} clients):`,
      data
    )
    io.to(`user-${userId}`).emit('customer-account-updated', data)

    // ALSO notify all admins so their customer list refreshes immediately
    const adminRoomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    console.log(
      `📡 Emitting 'customer-account-updated' to admin room ('admin') (${adminRoomSize} clients):`,
      data
    )
    io.to('admin').emit('customer-account-updated', {
      ...data,
      _from: 'customer-account-update'
    })

    // Fallback: if neither user nor admin is connected, broadcast (rare but helpful during reconnects)
    if (roomSize === 0 && adminRoomSize === 0) {
      console.log(
        '📢 No user/admin clients connected; broadcasting customer-account-updated-broadcast'
      )
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
      console.warn(
        'WebSocket server not initialized - cannot emit admin notification'
      )
      return null
    }

    console.log(`🎯 Emitting admin notification: ${message} (${type})`)
    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    const notificationData = {
      message,
      type,
      timestamp: new Date().toISOString()
    }
    console.log(
      `📡 Emitting 'admin-notification' to room 'admin' (${roomSize} clients):`,
      notificationData
    )
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
      console.warn(
        'WebSocket server not initialized - cannot emit extension request update'
      )
      return null
    }

    console.log(`🎯 Emitting extension request update to admin`)
    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    console.log(
      `📡 Emitting 'extension-request-updated' to room 'admin' (${roomSize} clients):`,
      requestData
    )
    io.to('admin').emit('extension-request-updated', requestData)
    if (roomSize === 0) {
      // Fallback broadcast so any late-joining admin or mis-joined client can still react
      const broadcastPayload = { ...requestData, _broadcast: true }
      console.log(
        '📢 No admin clients connected; broadcasting extension-request-updated-broadcast:',
        broadcastPayload
      )
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
      console.warn(
        'WebSocket server not initialized - cannot emit notification'
      )
      return null
    }

    const notificationData = {
      message,
      type,
      timestamp: new Date().toISOString()
    }

    // Send to admin room
    const adminRoomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    console.log(
      `📡 Emitting 'admin-notification' to room 'admin' (${adminRoomSize} clients):`,
      notificationData
    )
    io.to('admin').emit('admin-notification', notificationData)

    // Send to specific client room
    if (userId) {
      const clientRoomSize =
        io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
      console.log(
        `📡 Emitting 'client-notification' to room 'user-${userId}' (${clientRoomSize} clients):`,
        notificationData
      )
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
      console.warn(
        'WebSocket server not initialized - cannot emit broadcast notification'
      )
      return null
    }

    const notificationData = {
      message,
      type,
      timestamp: new Date().toISOString()
    }

    console.log(
      `📡 Broadcasting notification to all clients (${io.engine.clientsCount} total):`,
      notificationData
    )
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
      console.warn(
        'WebSocket server not initialized - cannot emit client notification'
      )
      return null
    }

    const notificationData = {
      message,
      type,
      timestamp: new Date().toISOString()
    }
    const clientRoomSize =
      io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0

    console.log(
      `📡 Emitting 'client-notification' to room 'user-${userId}' (${clientRoomSize} clients):`,
      notificationData
    )
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
      console.warn(
        'WebSocket server not initialized - cannot emit new code generated event'
      )
      return null
    }

    console.log(`🎯 Emitting new code generated to admin`)
    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    console.log(
      `📡 Emitting 'new-code-generated' to room 'admin' (${roomSize} clients):`,
      codeData
    )
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
      console.warn(
        'WebSocket server not initialized - cannot emit extension processed event'
      )
      return null
    }

    console.log(`🎯 Emitting extension processed to admin`)
    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    console.log(
      `📡 Emitting 'extension-processed' to room 'admin' (${roomSize} clients):`,
      extensionData
    )
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
      console.warn(
        'WebSocket server not initialized - cannot emit top-up request update'
      )
      return null
    }

    console.log(`🎯 Emitting top-up request update to admin`)
    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    console.log(
      `📡 Emitting 'topup-request-updated' to room 'admin' (${roomSize} clients):`,
      requestData
    )
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
      console.warn(
        'WebSocket server not initialized - cannot emit top-up processed event'
      )
      return null
    }

    console.log(`🎯 Emitting top-up processed to admin`)
    const roomSize = io.sockets.adapter.rooms.get('admin')?.size || 0
    console.log(
      `📡 Emitting 'topup-processed' to room 'admin' (${roomSize} clients):`,
      topUpData
    )
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
      console.warn(
        'WebSocket server not initialized - cannot emit points update'
      )
      return null
    }

    console.log(`🎯 Emitting points update to user ${userId}`)
    const roomSize = io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0
    const pointsData = { newPoints, timestamp: new Date().toISOString() }
    console.log(
      `📡 Emitting 'points-updated' to room 'user-${userId}' (${roomSize} clients):`,
      pointsData
    )
    io.to(`user-${userId}`).emit('points-updated', pointsData)

    // Fallback broadcast if user not connected
    if (roomSize === 0) {
      const broadcastPayload = { ...pointsData, userId, _broadcast: true }
      console.log(
        '📢 No user clients connected; broadcasting points-updated-broadcast:',
        broadcastPayload
      )
      io.emit('points-updated-broadcast', broadcastPayload)
    }
    return true
  } catch (error) {
    console.error('WebSocket emitPointsUpdate error:', error)
    return null
  }
}
