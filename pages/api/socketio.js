import { Server } from 'socket.io'

let io
let isInitialized = false

// Initialize Socket.IO server programmatically
export function initializeSocketServer(httpServer) {
  if (isInitialized && io && global.__socketIO) {
    console.log('♻️ Socket.IO server already initialized')
    return io
  }

  console.log('🔧 Initializing Socket.IO server programmatically...')
  
  io = new Server(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  })

  // Connection handler
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id, 'Total clients:', io.engine.clientsCount)

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('🔌 Socket error:', error)
    })

    // Join user-specific room
    socket.on('join-user', (userId) => {
      try {
        console.log(`👤 User ${userId} joined room: user-${userId}`)
        socket.join(`user-${userId}`)
        socket.userId = userId
        console.log(`📊 Room user-${userId} now has ${io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0} members`)
        
        // Acknowledge successful room join
        socket.emit('room-joined', { room: `user-${userId}`, success: true })
      } catch (error) {
        console.error('❌ Error joining user room:', error)
        socket.emit('room-joined', { room: `user-${userId}`, success: false, error: error.message })
      }
    })

    // Join admin room
    socket.on('join-admin', () => {
      try {
        console.log('🔑 Admin joined admin room')
        socket.join('admin')
        socket.isAdmin = true
        console.log(`📊 Admin room now has ${io.sockets.adapter.rooms.get('admin')?.size || 0} members`)
        
        // Acknowledge successful room join
        socket.emit('room-joined', { room: 'admin', success: true })
      } catch (error) {
        console.error('❌ Error joining admin room:', error)
        socket.emit('room-joined', { room: 'admin', success: false, error: error.message })
      }
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason, 'Remaining clients:', io.engine.clientsCount)
    })
  })

  isInitialized = true
  global.__socketIO = io
  console.log('✅ Socket.IO server initialized and stored globally')
  return io
}

export default function handler(req, res) {
  try {
    // Always ensure global instance is available
    if (!res.socket.server.io) {
      console.log('🔧 Setting up Socket.IO server via handler...')
      io = initializeSocketServer(res.socket.server)
      res.socket.server.io = io
    } else {
      io = res.socket.server.io
      console.log('♻️ Using existing Socket.IO server instance')
    }
    
    // Always update global reference
    global.__socketIO = io
    console.log('✅ Socket.IO server available globally')
    
    // Don't interfere with Socket.IO's own handling
    // Just end the response without sending JSON
    res.end()
  } catch (error) {
    console.error('❌ Socket.IO server initialization error:', error)
    res.status(500).end()
  }
}

// Export the io instance for direct access
export function getSocketIOInstance() {
  return io || global.__socketIO || null
}