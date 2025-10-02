import { connectToDatabase } from '@/lib/mongodb'
import TopUp from '@/lib/topUpModel'
import User from '@/lib/userModel'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


// Get all top-up requests (admin only)
export async function GET(req) {
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

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'

    await connectToDatabase()

    let query = {}
    if (status !== 'all') {
      query.status = status
    }

    const topUps = await TopUp.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(100)

    console.log(`Admin fetching top-ups: found ${topUps.length} requests`)

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        total: topUps.length,
        requests: topUps // Frontend expects 'requests' key
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        total: topUps.length,
        requests: topUps // Frontend expects 'requests' key
      }), { status: 200 })
  } catch (error) {
    console.error('Admin top-ups fetch error:', error)
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Internal server error' }, 500)
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// Process top-up request (approve/reject)
export async function PUT(req) {
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
    const { requestId, topUpId, action, rejectionReason } =body
    const actualId = requestId || topUpId // Support both parameter names

    if (!actualId || !action || !['approve', 'reject'].includes(action)) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Invalid request parameters' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Invalid request parameters' }), { status: 400 })
    }

    if (action === 'reject' && !rejectionReason) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Rejection reason is required' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Rejection reason is required' }), { status: 400 })
    }

    await connectToDatabase()

    const topUp = await TopUp.findById(actualId).populate(
      'userId',
      'username email'
    )
    if (!topUp) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Top-up request not found' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'Top-up request not found' }), { status: 404 })
    }

    console.log(
      `Processing top-up: ${topUp._id} for user ${topUp.userId.username} (${topUp.userId._id}) - Amount: $${topUp.amount}, Points: ${topUp.points}, Status: ${topUp.status}`
    )

    if (topUp.status !== 'pending') {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Top-up request already processed' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Top-up request already processed' }), { status: 400 })
    }

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAt: new Date(),
      processedBy: 'admin' // Could be enhanced to track specific admin user
    }

    if (action === 'reject') {
      updateData.rejectionReason = rejectionReason
    }

    await TopUp.findByIdAndUpdate(actualId, updateData)

    // If approved, credit points to user
    if (action === 'approve') {
      console.log(
        `About to credit ${topUp.points} points to user ${topUp.username} (ID: ${topUp.userId._id})`
      )

      // First get current user points for comparison
      const currentUser = await User.findById(topUp.userId._id)
      console.log(
        `User ${topUp.username} current points: ${currentUser?.points} (type: ${typeof currentUser?.points})`
      )

      // If points field is undefined, initialize it first
      if (currentUser.points === undefined || currentUser.points === null) {
        console.log(`Initializing points field for user ${topUp.username}`)
        await User.findByIdAndUpdate(topUp.userId._id, { $set: { points: 0 } })
      }

      const updatedUser = await User.findByIdAndUpdate(
        topUp.userId._id,
        { $inc: { points: topUp.points } },
        { new: true } // Return the updated document
      )

      console.log(
        `Successfully credited ${topUp.points} points to user ${topUp.username}. Old balance: ${currentUser?.points || 0}, New balance: ${updatedUser.points}`
      )

      // Double-check by querying the user again
      const verifyUser = await User.findById(topUp.userId._id)
      console.log(
        `Verification check - User ${topUp.username} points in DB: ${verifyUser.points}`
      )

      // Emit points update to user
      try {
        const { emitClientNotification } = await import('@/lib/websocket')
        await emitClientNotification(
          topUp.userId._id.toString(),
          `Your top-up has been approved! +${topUp.points} points (New balance: ${updatedUser.points})`,
          'success'
        )

        // Also emit a specific points-updated event
        const io = global.__socketIO
        if (io) {
          io.to(`user-${topUp.userId._id}`).emit('points-updated', {
            newPoints: updatedUser.points,
            pointsAdded: topUp.points,
            reason: 'top-up-approved'
          })
        }
      } catch (emitErr) {
        console.warn(
          'Points update WebSocket notification failed:',
          emitErr.message
        )
      }

      // Send email notification to user in their preferred language
      try {
        // Fetch user's language preference
        const fullUser = await User.findById(topUp.userId._id)
        const userLanguage = fullUser?.languagePreference || 'en'

        const { sendTopUpApprovalEmail } = await import('@/lib/emailService')
        await sendTopUpApprovalEmail(topUp.userId.email, topUp.userId.username, {
          amount: topUp.amount,
          credits: topUp.points,
          newBalance: updatedUser.points,
          language: userLanguage
        })

        console.log(
          `Top-up approval email sent to ${topUp.userId.email} (${userLanguage})`
        )
      } catch (emailError) {
        console.warn(
          'Email notification failed (non-fatal):',
          emailError.message
        )
      }
    }

    // Emit WebSocket notifications
    try {
      const { emitNotificationToAdminAndClient, emitTopUpProcessed } =
        await import('@/lib/websocket')

      // Notify user about the decision
      const message =
        action === 'approve'
          ? `Your top-up of $${topUp.amount} (${topUp.points} points) has been approved!`
          : `Your top-up of $${topUp.amount} has been rejected: ${rejectionReason}`

      await emitNotificationToAdminAndClient(
        topUp.userId._id.toString(),
        message,
        action === 'approve' ? 'success' : 'error'
      )

      // Notify admin about processing completion
      await emitTopUpProcessed({
        requestId: topUp._id,
        amount: topUp.amount,
        username: topUp.username,
        status: updateData.status,
        processedBy: updateData.processedBy
      }, topUp.userId._id.toString()) // Pass userId as second parameter
      
      // Also emit topup-status-updated event that client is listening for
      const io = global.__socketIO
      if (io) {
        io.to(`user-${topUp.userId._id}`).emit('topup-status-updated', {
          requestId: topUp._id.toString(),
          status: updateData.status,
          points: action === 'approve' ? topUp.points : 0,
          reason: rejectionReason || undefined
        })
      }
    } catch (emitErr) {
      console.warn('WebSocket notification failed:', emitErr.message)
    }

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        message: `Top-up ${action}d successfully`,
        topUp: {
          id: topUp._id,
          username: topUp.username,
          amount: topUp.amount,
          points: topUp.points,
          status: updateData.status
        }
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        message: `Top-up ${action}d successfully`,
        topUp: {
          id: topUp._id,
          username: topUp.username,
          amount: topUp.amount,
          points: topUp.points,
          status: updateData.status
        }
      }), { status: 200 })
  } catch (error) {
    console.error('Admin top-up process error:', error)
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Internal server error' }, 500)
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
