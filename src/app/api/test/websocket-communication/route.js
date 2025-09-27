import { NextResponse } from 'next/server'
import {
  emitCodesUpdate,
  emitCustomerAccountUpdate,
  emitAdminNotification,
  emitNotificationToAdminAndClient,
  emitBroadcastNotification,
  emitClientNotification,
  emitExtensionRequestUpdate
} from '@/lib/websocket'

export async function POST(req) {
  try {
    const { testType, userId } = await req.json()
    
    console.log('=== WebSocket Communication Test ===')
    console.log('Test Type:', testType)
    console.log('User ID:', userId)
    
    const results = {
      testType,
      userId,
      tests: [],
      summary: {
        total: 0,
        successful: 0,
        failed: 0
      }
    }

    // Helper function to run a test
    const runTest = async (name, testFunction) => {
      const test = { name, success: false, error: null }
      results.tests.push(test)
      results.summary.total++
      
      try {
        console.log(`🧪 Running test: ${name}`)
        const result = await testFunction()
        test.success = !!result
        if (result) {
          results.summary.successful++
          console.log(`✅ Test passed: ${name}`)
        } else {
          results.summary.failed++
          console.log(`❌ Test failed: ${name} - Function returned falsy`)
        }
      } catch (error) {
        test.success = false
        test.error = error.message
        results.summary.failed++
        console.log(`❌ Test failed: ${name} - Error: ${error.message}`)
      }
    }

    if (testType === 'all' || testType === 'admin-to-client') {
      // Test Admin → Client communications
      await runTest('Admin notification to specific client', () =>
        emitClientNotification(userId, '🔔 Admin-to-Client: Direct notification test', 'info')
      )
      
      await runTest('Admin notification to client + admin room', () =>
        emitNotificationToAdminAndClient(userId, '🔔 Admin-to-Both: Notification test', 'success')
      )
      
      await runTest('Codes update to specific client', () =>
        emitCodesUpdate(userId, {
          action: 'status-updated',
          code: 'TEST123',
          status: 'activated',
          timestamp: new Date().toISOString()
        })
      )
      
      await runTest('Customer account update to specific client', () =>
        emitCustomerAccountUpdate(userId, {
          action: 'extended',
          license: 'TEST123',
          extendedDays: 30,
          timestamp: new Date().toISOString()
        })
      )
    }

    if (testType === 'all' || testType === 'client-to-admin') {
      // Test Client → Admin communications
      await runTest('Client action notification to admin', () =>
        emitAdminNotification('🔔 Client-to-Admin: New code generation request from test user', 'info')
      )
      
      await runTest('Extension request update to admin', () =>
        emitExtensionRequestUpdate({
          action: 'created',
          licenseCode: 'TEST123',
          userId: userId,
          requestedDays: 30,
          timestamp: new Date().toISOString()
        })
      )
    }

    if (testType === 'all' || testType === 'broadcast') {
      // Test Broadcast communications
      await runTest('Broadcast notification to everyone', () =>
        emitBroadcastNotification('🔔 Broadcast: System maintenance notification', 'warning')
      )
    }

    if (testType === 'all' || testType === 'bidirectional') {
      // Test bidirectional communication scenarios
      await runTest('Admin extends client license (bidirectional)', async () => {
        // Simulate admin extending client license
        const clientNotification = await emitNotificationToAdminAndClient(
          userId,
          '🎉 Your license has been extended by 30 days!',
          'success'
        )
        
        const adminNotification = await emitAdminNotification(
          `License extended for user ${userId} by 30 days`,
          'info'
        )
        
        return clientNotification && adminNotification
      })
      
      await runTest('Client requests extension (bidirectional)', async () => {
        // Simulate client requesting extension
        const adminAlert = await emitAdminNotification(
          `Extension request: User ${userId} requests 30 days extension`,
          'info'
        )
        
        const clientConfirmation = await emitClientNotification(
          userId,
          '📤 Your extension request has been submitted',
          'info'
        )
        
        return adminAlert && clientConfirmation
      })
    }

    console.log('=== Test Results Summary ===')
    console.log(`Total tests: ${results.summary.total}`)
    console.log(`Successful: ${results.summary.successful}`)
    console.log(`Failed: ${results.summary.failed}`)
    console.log(`Success rate: ${(results.summary.successful / results.summary.total * 100).toFixed(1)}%`)

    return NextResponse.json({
      success: true,
      message: 'WebSocket communication tests completed',
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('WebSocket communication test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'WebSocket Communication Test Endpoint',
    availableTests: [
      'all - Run all communication tests',
      'admin-to-client - Test admin → client communications',
      'client-to-admin - Test client → admin communications',
      'broadcast - Test broadcast communications',
      'bidirectional - Test bidirectional scenarios'
    ],
    usage: 'POST with { testType: "all", userId: "user_id" }',
    timestamp: new Date().toISOString()
  })
}