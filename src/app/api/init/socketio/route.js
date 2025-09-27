import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('=== Initializing Socket.IO Server ===')
    
    // Check if already initialized
    let hasGlobalWebSocket = !!global.__socketIO
    console.log('Global WebSocket exists before init:', hasGlobalWebSocket)
    
    if (!hasGlobalWebSocket) {
      // Force initialization by calling the force-init endpoint
      const forceInitEndpoint = process.env.NODE_ENV === 'production'
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/force-init/socketio`
        : 'http://localhost:3000/api/force-init/socketio'
      
      console.log('Force initializing via:', forceInitEndpoint)
      
      try {
        const forceResponse = await fetch(forceInitEndpoint, {
          method: 'POST'
        })
        const forceData = await forceResponse.json()
        console.log('Force init response:', forceData)
        
        hasGlobalWebSocket = forceData.initialized
      } catch (forceError) {
        console.error('Force initialization failed:', forceError)
      }
    }
    
    let connectedClients = 0
    if (hasGlobalWebSocket && global.__socketIO) {
      try {
        connectedClients = global.__socketIO.engine?.clientsCount || 0
        console.log('Connected clients:', connectedClients)
      } catch (clientError) {
        console.warn('Could not get client count:', clientError.message)
      }
    }
    
    return NextResponse.json({
      success: true,
      initialized: hasGlobalWebSocket,
      connectedClients,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Socket.IO initialization error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}