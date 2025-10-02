import { connectToDatabase } from '@/lib/mongodb'
import TopUp from '@/lib/topUpModel'
import User from '@/lib/userModel'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


export async function POST(req) {
  try {
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Admin authentication required' }, 401)
    }
    
    return new Response(JSON.stringify({ error: 'Admin authentication required' }), { status: 401 })
    }

    // Decrypt request body (automatically handles both encrypted and plain requests)


    const body = await decryptRequestBody(req)
    const { action, requestIds, rejectionReason } =body

    if (!action || !Array.isArray(requestIds) || requestIds.length === 0) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Action and request IDs are required' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Action and request IDs are required' }), { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Invalid action. Must be approve or reject' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action. Must be approve or reject' }), { status: 400 })
    }

    if (action === 'reject' && !rejectionReason?.trim()) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Rejection reason is required for bulk reject' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Rejection reason is required for bulk reject' }), { status: 400 })
    }

    await connectToDatabase()

    // Find all pending top-up requests with the given IDs
    const topUps = await TopUp.find({
      _id: { $in: requestIds },
      status: 'pending'
    }).populate('userId', 'username email')

    if (topUps.length === 0) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'No pending top-up requests found for the given IDs' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'No pending top-up requests found for the given IDs' }), { status: 404 })
    }

    const processedResults = []
    const errors = []

    console.log(`🔵 Processing bulk ${action} for ${topUps.length} top-up requests`)

    for (const topUp of topUps) {
      try {
        console.log(`Processing ${action} for top-up: ${topUp._id} - User: ${topUp.username} - Amount: $${topUp.amount}`)

        // Update the top-up request
        const updateData = {
          status: action === 'approve' ? 'approved' : 'rejected',
          processedAt: new Date(),
          processedBy: 'admin' // Could be enhanced to track specific admin user
        }

        if (action === 'reject') {
          updateData.rejectionReason = rejectionReason
        }

        await TopUp.findByIdAndUpdate(topUp._id, updateData)

        // If approved, credit points to user
        if (action === 'approve') {
          console.log(`Crediting ${topUp.points} points to user ${topUp.username} (ID: ${topUp.userId._id})`)

          // Get current user points
          const currentUser = await User.findById(topUp.userId._id)
          
          // Initialize points field if undefined
          if (currentUser.points === undefined || currentUser.points === null) {
            console.log(`Initializing points field for user ${topUp.username}`)
            await User.findByIdAndUpdate(topUp.userId._id, { $set: { points: 0 } })
          }

          // Credit the points
          const updatedUser = await User.findByIdAndUpdate(
            topUp.userId._id,
            { $inc: { points: topUp.points } },
            { new: true }
          )

          console.log(`Successfully credited ${topUp.points} points to ${topUp.username}. New balance: ${updatedUser.points}`)

          processedResults.push({
            requestId: topUp._id,
            username: topUp.username,
            amount: topUp.amount,
            points: topUp.points,
            newBalance: updatedUser.points,
            action: 'approved'
          })

          // Send WebSocket notification to user (non-blocking)
          setImmediate(async () => {
            try {
              const { emitClientNotification } = await import('@/lib/websocket')
              await emitClientNotification(
                topUp.userId._id.toString(),
                `Your top-up has been approved! +${topUp.points} points (New balance: ${updatedUser.points})`,
                'success'
              )

              // Also emit points-updated event
              const io = global.__socketIO
              if (io) {
                io.to(`user-${topUp.userId._id}`).emit('points-updated', {
                  newPoints: updatedUser.points,
                  pointsAdded: topUp.points,
                  reason: 'top-up-approved'
                })
              }
            } catch (emitErr) {
              console.warn('WebSocket notification failed:', emitErr.message)
            }
          })
        } else {
          processedResults.push({
            requestId: topUp._id,
            username: topUp.username,
            amount: topUp.amount,
            action: 'rejected',
            rejectionReason
          })

          // Send rejection notification (non-blocking)
          setImmediate(async () => {
            try {
              const { emitClientNotification } = await import('@/lib/websocket')
              await emitClientNotification(
                topUp.userId._id.toString(),
                `Your top-up of $${topUp.amount} has been rejected: ${rejectionReason}`,
                'error'
              )
            } catch (emitErr) {
              console.warn('WebSocket notification failed:', emitErr.message)
            }
          })
        }

      } catch (error) {
        console.error(`Error processing top-up ${topUp._id}:`, error)
        errors.push({
          requestId: topUp._id,
          username: topUp.username,
          error: error.message
        })
      }
    }

    // Send bulk update notification to admin (non-blocking)
    setImmediate(async () => {
      try {
        const { emitTopUpProcessed } = await import('@/lib/websocket')
        await emitTopUpProcessed({
          action: `bulk-${action}`,
          processedCount: processedResults.length,
          errorCount: errors.length,
          totalRequested: requestIds.length
        })
      } catch (emitErr) {
        console.warn('Admin WebSocket notification failed:', emitErr.message)
      }
    })

    const response = {
      success: true,
      message: `Bulk ${action} completed`,
      processedCount: processedResults.length,
      errorCount: errors.length,
      totalRequested: requestIds.length,
      results: processedResults
    }

    if (errors.length > 0) {
      response.errors = errors
    }

    console.log(`✅ Bulk ${action} completed: ${processedResults.length} processed, ${errors.length} errors`)

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse(response, 200)
    }
    
    return new Response(JSON.stringify(response), { status: 200 })

  } catch (error) {
    console.error('❌ Bulk top-up processing error:', error)
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ 
      error: 'Internal server error',
      details: error.message 
    }, 500)
    }
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500
    })
  }
}