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
      origin: (origin, callback) => {
        // Allow localhost in dev, and reflect any origin in production if not explicitly set
        const allowedDev = ['http://localhost:3000', 'http://127.0.0.1:3000']
        console.log('kuy  process.env.NODE_ENV', process.env.NODE_ENV)
        const configuredProd =
          process.env.NODE_ENV === 'production'
            ? process.env.NEXT_PUBLIC_APP_URL
            : 'http://localhost:3000'

        console.log('chketc', configuredProd)
        if (!origin) return callback(null, true) // Same-origin / server-side
        if (allowedDev.includes(origin)) return callback(null, true)
        if (configuredProd && origin === configuredProd)
          return callback(null, true)
        // Fallback: allow temporarily (can tighten later)
        console.warn('⚠️ Allowing dynamic origin (temporary):', origin)
        return callback(null, true)
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  })

  // Connection handler
  io.on('connection', (socket) => {
    console.log(
      '🔌 Client connected:',
      socket.id,
      'Total clients:',
      io.engine.clientsCount
    )

    // Debug: list current rooms right after connect
    try {
      console.log(
        '🧪 Initial rooms for socket',
        socket.id,
        Array.from(socket.rooms || [])
      )
    } catch (_) {}

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('🔌 Socket error:', error)
    })

    // Join user-specific room
    socket.on('join-user', (userId) => {
      try {
        console.log(
          `👤 join-user received for userId=${userId} (socket ${socket.id})`
        )
        socket.join(`user-${userId}`)
        socket.userId = userId
        console.log(
          `📊 Room user-${userId} now has ${io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0} members`
        )
        // Debug: show all rooms after join
        try {
          console.log(
            '🧪 Rooms after join for socket',
            socket.id,
            Array.from(socket.rooms || [])
          )
        } catch (_) {}

        // Acknowledge successful room join
        socket.emit('room-joined', { room: `user-${userId}`, success: true })
      } catch (error) {
        console.error('❌ Error joining user room:', error)
        socket.emit('room-joined', {
          room: `user-${userId}`,
          success: false,
          error: error.message
        })
      }
    })

    // Join admin room
    socket.on('join-admin', () => {
      try {
        console.log('🔑 Admin joined admin room')
        socket.join('admin')
        socket.isAdmin = true
        console.log(
          `📊 Admin room now has ${io.sockets.adapter.rooms.get('admin')?.size || 0} members`
        )

        // Acknowledge successful room join
        socket.emit('room-joined', { room: 'admin', success: true })
      } catch (error) {
        console.error('❌ Error joining admin room:', error)
        socket.emit('room-joined', {
          room: 'admin',
          success: false,
          error: error.message
        })
      }
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(
        '🔌 Client disconnected:',
        socket.id,
        'Reason:',
        reason,
        'Remaining clients:',
        io.engine.clientsCount
      )
      try {
        console.log(
          '🧪 Rooms at disconnect for socket',
          socket.id,
          Array.from(socket.rooms || [])
        )
      } catch (_) {}
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
