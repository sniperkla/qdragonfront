import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('=== Testing Socket.IO Endpoint Health ===')

    // Check if Socket.IO is initialized
    const hasGlobalWebSocket = !!global.__socketIO
    console.log('Global WebSocket exists:', hasGlobalWebSocket)

    let socketInfo = {
      initialized: hasGlobalWebSocket,
      connectedClients: 0,
      rooms: {}
    }

    if (hasGlobalWebSocket && global.__socketIO) {
      try {
        const io = global.__socketIO
        socketInfo.connectedClients = io.engine?.clientsCount || 0

        // Get room information
        const rooms = io.sockets.adapter.rooms
        socketInfo.rooms = {
          adminRoom: rooms.get('admin')?.size || 0,
          totalRooms: rooms.size
        }

        console.log('Socket.IO info:', socketInfo)
      } catch (socketError) {
        console.error('Error getting socket info:', socketError)
      }
    }

    // Test the initialization endpoint instead
    const initEndpoint =
      process.env.NODE_ENV === 'production'
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/init/socketio`
        : 'http://localhost:3000/api/init/socketio'

    let initResponse = null
    let responseData = null

    try {
      initResponse = await fetch(initEndpoint)
      responseData = await initResponse.json()
      console.log('Init endpoint response:', responseData)
    } catch (fetchError) {
      console.error('Init endpoint error:', fetchError)
    }

    return NextResponse.json({
      success: true,
      socketInfo,
      initEndpoint,
      initStatus: initResponse?.status || null,
      initData: responseData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Socket.IO health check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
