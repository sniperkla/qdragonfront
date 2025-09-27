import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export function useWebSocket(userId = null, isAdmin = false) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    console.log('🔧 Setting up WebSocket connection...', { userId, isAdmin })

    // Initialize socket connection
    socketRef.current = io(
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_APP_URL
        : 'http://localhost:3000',
      {
        path: '/api/socketio',
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
        timeout: 20000,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        maxReconnectionAttempts: 5,
        reconnectionDelayMax: 5000
      }
    )

    const socket = socketRef.current

    // Connection handlers
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', socket.id)
      setIsConnected(true)

      // Small delay to ensure server is ready
      setTimeout(() => {
        // Join appropriate rooms
        if (isAdmin) {
          console.log('🔑 Admin joining admin room...')
          socket.emit('join-admin')
        }
        if (userId) {
          console.log('👤 User joining user room:', userId)
          socket.emit('join-user', userId)
        }
      }, 100)
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected, reason:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error)
      console.error('🔌 Error type:', error.type)
      console.error('🔌 Error description:', error.description)
      setIsConnected(false)
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 WebSocket reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
    })

    socket.on('reconnect_error', (error) => {
      console.error('🔌 WebSocket reconnection error:', error)
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected, reason:', reason)
      setIsConnected(false)

      // Handle specific disconnect reasons
      if (reason === 'io server disconnect') {
        // The disconnection was initiated by the server, reconnect manually
        console.log(
          '🔌 Server initiated disconnect, attempting manual reconnect...'
        )
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

    // Handle room join acknowledgments
    socket.on('room-joined', (data) => {
      if (data.success) {
        console.log('✅ Successfully joined room:', data.room)
      } else {
        console.error(
          '❌ Failed to join room:',
          data.room,
          'Error:',
          data.error
        )
      }
    })

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket connection')
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
    if (!subscribe) return

    const unsubscribe = subscribe('codes-updated', (data) => {
      console.log('Codes update received:', data)
      if (onUpdate) onUpdate(data)
    })

    return unsubscribe
  }, [subscribe, onUpdate])

  return { isConnected }
}

export function useCustomerAccountWebSocket(userId, onUpdate) {
  const { subscribe, isConnected } = useWebSocket(userId)

  useEffect(() => {
    if (!subscribe) {
      console.log('⚠️ Customer account WebSocket subscribe not available')
      return
    }

    console.log(
      '🎧 Setting up customer account WebSocket listener for user:',
      userId
    )

    const unsubscribe = subscribe('customer-account-updated', (data) => {
      console.log('📨 Customer account update received:', data)
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

export function useAdminWebSocket(onExtensionUpdate, onNotification) {
  const { subscribe, isConnected } = useWebSocket(null, true)

  useEffect(() => {
    if (!subscribe) {
      console.log('⚠️ Admin WebSocket subscribe not available')
      return
    }

    console.log('🎧 Setting up admin WebSocket listeners')

    const unsubExtension = subscribe('extension-request-updated', (data) => {
      console.log('📨 Extension request update received:', data)
      if (onExtensionUpdate) {
        console.log('🔄 Calling extension update handler')
        onExtensionUpdate(data)
      } else {
        console.log('⚠️ No extension update handler provided')
      }
    })

    const unsubNotification = subscribe('admin-notification', (data) => {
      console.log('📨 Admin notification received via WebSocket:', data)
      if (onNotification) {
        console.log('🔄 Calling admin notification handler with:', data)
        onNotification(data)
      } else {
        console.log('⚠️ No admin notification handler provided')
      }
    })

    return () => {
      console.log('🧹 Cleaning up admin WebSocket listeners')
      unsubExtension?.()
      unsubNotification?.()
    }
  }, [subscribe, onExtensionUpdate, onNotification])

  return { isConnected }
}

// New hook for client notifications
export function useClientNotifications(userId, onNotification) {
  const { subscribe, isConnected } = useWebSocket(userId)

  useEffect(() => {
    if (!subscribe || !userId) {
      console.log(
        '⚠️ Client notifications WebSocket subscribe not available or no userId'
      )
      return
    }

    console.log('🎧 Setting up client notification listeners for user:', userId)

    const unsubClientNotification = subscribe('client-notification', (data) => {
      console.log('📨 Client notification received via WebSocket:', data)
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
        console.log('📨 Broadcast notification received via WebSocket:', data)
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
      console.log('🧹 Cleaning up client notification listeners')
      unsubClientNotification?.()
      unsubBroadcastNotification?.()
    }
  }, [subscribe, onNotification, userId])

  return { isConnected }
}
