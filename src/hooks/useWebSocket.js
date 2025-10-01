import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export function useWebSocket(userId = null, isAdmin = false) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    // Initialize socket connection
    const wsUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_APP_URL
        : 'http://localhost:3000'

    socketRef.current = io(wsUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      timeout: 20000,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5,
      reconnectionDelayMax: 5000
    })

    const socket = socketRef.current

    // Connection handlers
    socket.on('connect', () => {
      setIsConnected(true)

      // Small delay to ensure server is ready
      setTimeout(() => {
        // Join appropriate rooms
        if (isAdmin) {
          socket.emit('join-admin')
        }
        if (userId) {
          socket.emit('join-user', userId)
        }
      }, 100)
    })

    socket.on('disconnect', (reason) => {
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      setIsConnected(false)
    })

    socket.on('reconnect', (attemptNumber) => {
      setIsConnected(true)
    })

    socket.on('reconnect_error', (error) => {
      // Silent error
    })

    socket.on('disconnect', (reason) => {
      setIsConnected(false)

      // Handle specific disconnect reasons
      if (reason === 'io server disconnect') {
        // The disconnection was initiated by the server, reconnect manually
        socket.connect()
      }
    })

    // Add debug event listeners
    socket.on('debug-test', (data) => {
      console.log('🔍 Received debug-test:', data)
    })

    socket.on('test-broadcast', (data) => {
      console.log('🔍 Received test-broadcast:', data)
    })

    socket.on('test-admin', (data) => {
      console.log('🔍 Received test-admin:', data)
    })

    socket.on('general-notification', (data) => {
      console.log('🔍 Received general-notification:', data)
    })

    // Listen for the specific events that should trigger table updates
    socket.on('codes-updated', (data) => {
      console.log('🔍 [DEBUG] Raw codes-updated event received:', data)
    })

    socket.on('customer-account-updated', (data) => {
      console.log(
        '🔍 [DEBUG] Raw customer-account-updated event received:',
        data
      )
    })

    socket.on('client-notification', (data) => {
      // Silent handler
    })

    socket.on('broadcast-notification', (data) => {
      // Silent handler
    })

    // Handle room join acknowledgments
    socket.on('room-joined', (data) => {
      // Silent handler
    })

    // Cleanup on unmount
    return () => {
      socket.disconnect()
    }
  }, [userId, isAdmin])

  // Subscribe to specific events
  const subscribe = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
      return () => socketRef.current.off(event, callback)
    }
  }

  // Emit events
  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data)
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    subscribe,
    emit,
    lastUpdate
  }
}

// Specific hooks for different data types
export function useCodesWebSocket(userId, onUpdate) {
  const { subscribe, isConnected } = useWebSocket(userId)

  useEffect(() => {
    if (!subscribe) {
      return
    }

    if (!userId) {
      return
    }

    const unsubscribe = subscribe('codes-updated', (data) => {
      if (onUpdate) {
        onUpdate(data)
      }
    })

    return unsubscribe
  }, [subscribe, onUpdate, userId])

  return { isConnected }
}

export function useCustomerAccountWebSocket(userId, onUpdate) {
  const { subscribe, isConnected } = useWebSocket(userId)

  useEffect(() => {
    if (!subscribe) {
      return
    }

    if (!userId) {
      return
    }

    console.log(
      '🎧 Setting up customer account WebSocket listener for user:',
      userId
    )

    const unsubscribe = subscribe('customer-account-updated', (data) => {
      console.log(
        '📨 Customer account update received for user',
        userId,
        ':',
        data
      )
      if (onUpdate) {
        console.log('🔄 Calling customer account update handler')
        onUpdate(data)
      } else {
        console.log('⚠️ No customer account update handler provided')
      }
    })

    return unsubscribe
  }, [subscribe, onUpdate, userId])

  return { isConnected }
}

export function useAdminWebSocket(
  onExtensionUpdate,
  onNotification,
  onDataUpdate
) {
  const { subscribe, isConnected } = useWebSocket(null, true)

  useEffect(() => {
    if (!subscribe) {
      return
    }

    const unsubExtension = subscribe('extension-request-updated', (data) => {
      console.log('📨 Admin received extension-request-updated:', data)
      if (onExtensionUpdate) {
        onExtensionUpdate(data)
      }
    })

    const unsubNotification = subscribe('admin-notification', (data) => {
      console.log('📨 Admin received admin-notification:', data)
      if (onNotification) {
        onNotification(data)
      }
    })

    // Subscribe to all data update events
    const unsubCodesUpdate = subscribe('codes-updated', (data) => {
      console.log('📨 Admin received codes-updated:', data)
      if (onDataUpdate) {
        onDataUpdate({ type: 'code_updated', ...data })
      }
    })

    const unsubCustomerUpdate = subscribe(
      'customer-account-updated',
      (data) => {
        console.log('📨 Admin received customer-account-updated:', data)
        if (onDataUpdate) {
          onDataUpdate({ type: 'customer_updated', ...data })
        }
      }
    )

    const unsubNewCode = subscribe('new-code-generated', (data) => {
      console.log('📨 Admin received new-code-generated:', data)
      if (onDataUpdate) {
        onDataUpdate({ type: 'new_code', ...data })
      }
    })

    const unsubExtensionProcessed = subscribe('extension-processed', (data) => {
      console.log('📨 Admin received extension-processed:', data)
      if (onDataUpdate) {
        onDataUpdate({ type: 'extension_processed', ...data })
      }
    })

    return () => {
      unsubExtension?.()
      unsubNotification?.()
      unsubCodesUpdate?.()
      unsubCustomerUpdate?.()
      unsubNewCode?.()
      unsubExtensionProcessed?.()
    }
  }, [subscribe, onExtensionUpdate, onNotification, onDataUpdate])

  return { isConnected }
}

// New hook for client notifications
export function useClientNotifications(userId, onNotification) {
  const { subscribe, isConnected } = useWebSocket(userId)

  useEffect(() => {
    if (!subscribe || !userId) {
      console.log(
        '⚠️ Client notifications WebSocket subscribe not available or no userId:',
        { subscribe: !!subscribe, userId }
      )
      return
    }

    console.log('🎧 Setting up client notification listeners for user:', userId)

    const unsubClientNotification = subscribe('client-notification', (data) => {
      console.log(
        '📨 Client notification received via WebSocket for user',
        userId,
        ':',
        data
      )
      if (onNotification) {
        console.log('🔄 Calling client notification handler with:', data)
        onNotification(data)
      } else {
        console.log('⚠️ No client notification handler provided')
      }
    })

    const unsubBroadcastNotification = subscribe(
      'broadcast-notification',
      (data) => {
        console.log(
          '📨 Broadcast notification received via WebSocket for user',
          userId,
          ':',
          data
        )
        if (onNotification) {
          console.log(
            '🔄 Calling client notification handler with broadcast:',
            data
          )
          onNotification(data)
        } else {
          console.log('⚠️ No client notification handler provided')
        }
      }
    )

    return () => {
      console.log(
        '🧹 Cleaning up client notification listeners for user:',
        userId
      )
      unsubClientNotification?.()
      unsubBroadcastNotification?.()
    }
  }, [subscribe, onNotification, userId])

  return { isConnected }
}
