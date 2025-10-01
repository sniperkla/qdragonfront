import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import PointTransaction from '@/lib/pointTransactionModel'
import { emitPointsUpdate } from '@/lib/websocket'

export async function POST(request) {
  try {
    // Verify admin authentication via cookie
    const adminSession = request.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const body = await request.json()
    const { username, credits, reason } = body

    // Validate required fields
    if (!username || !credits || !reason) {
      return new Response(
        JSON.stringify({
          error: 'Username or email, credits, and reason are required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate credits is a number
    const creditsAmount = parseFloat(credits)
    if (isNaN(creditsAmount) || creditsAmount === 0) {
      return new Response(
        JSON.stringify({
          error: 'Credits must be a valid non-zero number'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Connect to database
    await connectToDatabase()

    // Find user by username or email
    const identifier = username.trim()
    const user = await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    })
    
    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'User not found with provided username or email'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate new balance
    const oldBalance = user.points || 0
    const newBalance = oldBalance + creditsAmount

    // Check if new balance would be negative
    if (newBalance < 0) {
      return new Response(
        JSON.stringify({
          error: `Cannot set negative balance. User has ${oldBalance} credits. Minimum deduction: ${-oldBalance}`
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Update user points
    user.points = newBalance
    await user.save()

    // Create transaction record
    const transaction = new PointTransaction({
      userId: user._id,
      type: creditsAmount > 0 ? 'credit' : 'deduction',
      amount: Math.abs(creditsAmount),
      balance: newBalance,
      description: `${creditsAmount > 0 ? 'Credits added' : 'Credits deducted'} by admin: ${reason}`,
      reference: `admin_adjustment_${Date.now()}`,
      status: 'completed',
      metadata: {
        adminAction: 'manual_credit_adjustment',
        reason: reason
      }
    })
    await transaction.save()

    // Emit WebSocket update to user
    try {
      await emitPointsUpdate(user._id.toString(), newBalance)
    } catch (wsError) {
      console.warn('WebSocket emission failed (non-fatal):', wsError.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          username: user.username,
          oldBalance,
          newBalance,
          creditsChanged: creditsAmount,
          transaction: {
            id: transaction._id,
            type: transaction.type,
            createdAt: transaction.createdAt
          }
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error adding credits:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to add credits',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
