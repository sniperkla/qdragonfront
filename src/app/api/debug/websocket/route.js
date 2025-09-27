import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('=== WebSocket Debug Info ===')
    
    // Check if global WebSocket exists
    const hasGlobalWebSocket = !!global.__socketIO
    console.log('1. Global WebSocket exists:', hasGlobalWebSocket)
    
    if (hasGlobalWebSocket) {
      const io = global.__socketIO
      console.log('2. WebSocket instance type:', typeof io)
      console.log('3. WebSocket instance keys:', Object.keys(io))
      
      // Check connected clients
      const sockets = await io.fetchSockets()
      console.log('4. Connected clients count:', sockets.length)
      
      // Check rooms
      const adminRoom = io.sockets.adapter.rooms.get('admin')
      console.log('5. Admin room size:', adminRoom ? adminRoom.size : 0)
      
      // Try to emit a test message
      console.log('6. Attempting to emit test message...')
      io.emit('debug-test', {
        message: 'Debug test from API',
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json({
        success: true,
        websocketExists: true,
        connectedClients: sockets.length,
        adminRoomSize: adminRoom ? adminRoom.size : 0,
        socketIds: sockets.map(s => s.id)
      })
    } else {
      console.log('2. WebSocket instance not found in global')
      
      // Try to initialize it
      console.log('3. Attempting to initialize WebSocket...')
      const initResponse = await fetch(
        process.env.NODE_ENV === 'production' 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/socketio`
          : 'http://localhost:3000/api/socketio'
      )
      console.log('4. Init response status:', initResponse.status)
      
      return NextResponse.json({
        success: false,
        websocketExists: false,
        message: 'WebSocket not initialized',
        initAttemptStatus: initResponse.status
      })
    }
  } catch (error) {
    console.error('WebSocket debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('=== Testing WebSocket Emission ===')
    
    if (!global.__socketIO) {
      return NextResponse.json({
        success: false,
        message: 'WebSocket not initialized'
      }, { status: 400 })
    }
    
    const io = global.__socketIO
    
    // Test different emission types
    console.log('1. Testing broadcast emission...')
    io.emit('test-broadcast', {
      message: 'Test broadcast message',
      timestamp: new Date().toISOString(),
      type: 'broadcast'
    })
    
    console.log('2. Testing admin room emission...')
    io.to('admin').emit('test-admin', {
      message: 'Test admin message',
      timestamp: new Date().toISOString(),
      type: 'admin'
    })
    
    console.log('3. Testing general notification...')
    io.emit('general-notification', {
      message: '🔔 Test WebSocket notification from debug endpoint',
      type: 'info',
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      message: 'Test emissions sent',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('WebSocket emission test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}