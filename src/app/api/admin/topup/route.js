import { connectToDatabase } from '@/lib/mongodb'
import TopUp from '@/lib/topUpModel'
import User from '@/lib/userModel'

// Get all top-up requests (admin only)
export async function GET(req) {
  try {
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        { status: 401 }
      )
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

    return new Response(
      JSON.stringify({
        success: true,
        total: topUps.length,
        requests: topUps // Frontend expects 'requests' key
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Admin top-ups fetch error:', error)
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
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        { status: 401 }
      )
    }

    const { requestId, topUpId, action, rejectionReason } = await req.json()
    const actualId = requestId || topUpId // Support both parameter names

    if (!actualId || !action || !['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400 }
      )
    }

    if (action === 'reject' && !rejectionReason) {
      return new Response(
        JSON.stringify({ error: 'Rejection reason is required' }),
        { status: 400 }
      )
    }

    await connectToDatabase()

    const topUp = await TopUp.findById(actualId).populate(
      'userId',
      'username email'
    )
    if (!topUp) {
      return new Response(
        JSON.stringify({ error: 'Top-up request not found' }),
        { status: 404 }
      )
    }

    console.log(
      `Processing top-up: ${topUp._id} for user ${topUp.userId.username} (${topUp.userId._id}) - Amount: $${topUp.amount}, Points: ${topUp.points}, Status: ${topUp.status}`
    )

    if (topUp.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Top-up request already processed' }),
        { status: 400 }
      )
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
      })
    } catch (emitErr) {
      console.warn('WebSocket notification failed:', emitErr.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Top-up ${action}d successfully`,
        topUp: {
          id: topUp._id,
          username: topUp.username,
          amount: topUp.amount,
          points: topUp.points,
          status: updateData.status
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Admin top-up process error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
