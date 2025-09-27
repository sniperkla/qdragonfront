import {
  emitAdminNotification,
  emitBroadcastNotification,
  emitNotificationToAdminAndClient
} from '@/lib/websocket'

// Admin authentication middleware
const verifyAdmin = async (request) => {
  try {
    const adminSession = request.cookies.get('admin-session')?.value
    if (!adminSession || adminSession !== 'authenticated') {
      return false
    }
    return true
  } catch (error) {
    console.error('Admin verification error:', error)
    return false
  }
}

export async function POST(request) {
  try {
    console.log('🧪 Test WebSocket API called')

    // Verify admin authentication
    if (!(await verifyAdmin(request))) {
      console.log('❌ Admin authentication failed')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }

    // Check if WebSocket server is initialized
    const socketIO = global.__socketIO
    if (!socketIO) {
      console.log('⚠️ WebSocket server not initialized, initializing now...')
      // Try to initialize by making a request to the socketio endpoint
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/socketio`
        )
      } catch (initError) {
        console.error('❌ Failed to initialize WebSocket server:', initError)
      }
    }

    console.log('🚀 Attempting to emit test notifications...')

    // Emit test admin notification
    const adminResult = await emitAdminNotification(
      '🧪 This is a test admin notification!',
      'info'
    )

    // Emit test broadcast notification to all clients
    const broadcastResult = await emitBroadcastNotification(
      '📢 This is a test broadcast notification to all clients!',
      'info'
    )

    if (adminResult && broadcastResult) {
      console.log('✅ Test notifications emitted successfully')
      return new Response(
        JSON.stringify({
          success: true,
          message:
            'Test WebSocket notifications sent successfully (admin + broadcast)',
          socketInitialized: !!global.__socketIO
        }),
        { status: 200 }
      )
    } else {
      console.log('❌ Test notifications failed to emit')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'WebSocket server not available or notifications failed',
          socketInitialized: !!global.__socketIO,
          adminResult: !!adminResult,
          broadcastResult: !!broadcastResult
        }),
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Error in test WebSocket API:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to send test notification',
        details: error.message,
        socketInitialized: !!global.__socketIO
      }),
      { status: 500 }
    )
  }
}
