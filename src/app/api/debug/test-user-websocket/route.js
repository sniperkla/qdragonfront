import { 
  emitCustomerAccountUpdate, 
  emitClientNotification, 
  emitBroadcastNotification 
} from '@/lib/websocket'

export async function POST(request) {
  try {
    console.log('🧪 Test user WebSocket API called')

    const { userId } = await request.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'userId is required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Testing WebSocket for user:', userId)

    // Check if WebSocket server is initialized
    let socketIO = global.__socketIO
    if (!socketIO) {
      console.log('⚠️ WebSocket server not initialized, attempting to initialize...')
      try {
        // Try to initialize the WebSocket server
        const initResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/socketio`,
          { method: 'GET' }
        )
        console.log('🔄 WebSocket initialization response status:', initResponse.status)
        
        // Wait a moment for initialization
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        socketIO = global.__socketIO
        if (!socketIO) {
          console.log('❌ WebSocket server still not initialized after attempt')
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'WebSocket server initialization failed' 
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
        console.log('✅ WebSocket server initialized successfully')
      } catch (initError) {
        console.error('❌ Failed to initialize WebSocket server:', initError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'WebSocket server initialization failed',
            details: initError.message
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get room information
    const userRoom = `user-${userId}`
    const roomSize = socketIO.sockets.adapter.rooms.get(userRoom)?.size || 0
    const adminRoomSize = socketIO.sockets.adapter.rooms.get('admin')?.size || 0
    const totalClients = socketIO.engine.clientsCount

    // Get all rooms to see what exists
    const allRooms = Array.from(socketIO.sockets.adapter.rooms.keys())
    const userRooms = allRooms.filter(room => room.startsWith('user-'))

    console.log('📊 Room Information:')
    console.log(`  - Target user room '${userRoom}': ${roomSize} clients`)
    console.log(`  - Admin room: ${adminRoomSize} clients`)
    console.log(`  - Total clients: ${totalClients}`)
    console.log(`  - All user rooms:`, userRooms)
    console.log(`  - All rooms:`, allRooms)

    // Test different types of emissions
    const results = {}

    // 1. Test customer account update
    console.log('📡 Testing customer account update emission...')
    const customerAccountResult = await emitCustomerAccountUpdate(userId, {
      type: 'test',
      message: 'Test customer account update',
      timestamp: new Date().toISOString(),
      testData: { userId, test: true }
    })
    results.customerAccountUpdate = {
      success: !!customerAccountResult,
      roomSize,
      userId
    }

    // 2. Test client notification
    console.log('📡 Testing client notification emission...')
    const clientNotificationResult = await emitClientNotification(
      userId,
      'Test client notification from debug endpoint',
      'info'
    )
    results.clientNotification = {
      success: !!clientNotificationResult,
      roomSize,
      userId
    }

    // 3. Test broadcast notification
    console.log('📡 Testing broadcast notification emission...')
    const broadcastResult = await emitBroadcastNotification(
      'Test broadcast notification from debug endpoint',
      'info'
    )
    results.broadcastNotification = {
      success: !!broadcastResult,
      totalClients
    }

    console.log('✅ Test emissions completed')
    console.log('📊 Results:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test WebSocket emissions completed',
        socketInitialized: true,
        roomInfo: {
          userRoom,
          userRoomSize: roomSize,
          adminRoomSize,
          totalClients
        },
        results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Test user WebSocket error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}