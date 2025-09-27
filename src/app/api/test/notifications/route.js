import { NextResponse } from 'next/server'
import { emitNotificationToAdminAndClient, emitBroadcastNotification, emitClientNotification } from '@/lib/websocket'

export async function POST(req) {
  try {
    const { userId } = await req.json()
    
    console.log('=== Testing Real-Time Notification System ===')
    console.log('User ID for test:', userId)
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID required for test'
      }, { status: 400 })
    }
    
    // Test 1: Direct client notification
    console.log('1. Testing direct client notification...')
    await emitClientNotification(userId, '🔔 Test: Direct client notification', 'info')
    
    // Test 2: Admin + Client notification
    console.log('2. Testing admin + client notification...')
    await emitNotificationToAdminAndClient(userId, '🔔 Test: Admin + Client notification', 'success')
    
    // Test 3: Broadcast notification
    console.log('3. Testing broadcast notification...')
    await emitBroadcastNotification('🔔 Test: Broadcast notification to everyone', 'warning')
    
    // Test 4: Simulate code status change (like the real scenario)
    console.log('4. Testing simulated code activation...')
    await emitNotificationToAdminAndClient(
      userId,
      '🎉 Your trading code TEST123 has been activated!',
      'success'
    )
    
    console.log('=== All test emissions completed ===')
    
    return NextResponse.json({
      success: true,
      message: 'All test notifications sent',
      testsRun: 4,
      userId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test notification error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}