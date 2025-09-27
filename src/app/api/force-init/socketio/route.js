import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('=== Force WebSocket Server Initialization ===')

    // Check if it's already initialized
    if (global.__socketIO) {
      console.log('✅ WebSocket server already exists in global scope')
      return NextResponse.json({
        success: true,
        message: 'WebSocket server already initialized',
        initialized: true,
        connectedClients: global.__socketIO.engine?.clientsCount || 0,
        timestamp: new Date().toISOString()
      })
    }

    // Force initialization by making a request to the socketio endpoint
    const socketEndpoint =
      process.env.NODE_ENV === 'production'
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/socketio`
        : 'http://localhost:3000/api/socketio'

    console.log('🔧 Force initializing via:', socketEndpoint)

    try {
      const response = await fetch(socketEndpoint, {
        method: 'GET'
      })
      console.log('Force init response status:', response.status)
    } catch (fetchError) {
      console.error('Force init fetch error:', fetchError)
    }

    // Wait a moment for initialization
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check again
    const nowInitialized = !!global.__socketIO
    console.log('After force init - WebSocket in global scope:', nowInitialized)

    if (nowInitialized) {
      const connectedClients = global.__socketIO.engine?.clientsCount || 0
      console.log('Force init successful - clients:', connectedClients)
    }

    return NextResponse.json({
      success: nowInitialized,
      message: nowInitialized
        ? 'WebSocket server force initialized'
        : 'Force initialization failed',
      initialized: nowInitialized,
      connectedClients: nowInitialized
        ? global.__socketIO.engine?.clientsCount || 0
        : 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Force WebSocket initialization error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
