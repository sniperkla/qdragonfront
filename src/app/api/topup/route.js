import { connectToDatabase } from '@/lib/mongodb'
import TopUp from '@/lib/topUpModel'
import User from '@/lib/userModel'
import { verifyAuth } from '@/lib/auth'

// Submit top-up request
export async function POST(req) {
  console.log('🔵 Top-up API called')

  try {
    console.log('🔍 Verifying authentication...')
    const user = await verifyAuth(req)

    if (!user) {
      console.log('❌ Authentication failed')
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      )
    }

    console.log('✅ User authenticated:', {
      id: user.id,
      username: user.username
    })

    console.log('📋 Parsing request body...')
    const { amount, paymentMethod, paymentProof, transactionRef } =
      await req.json()

    console.log('📊 Request data:', {
      amount,
      paymentMethod,
      paymentProof,
      transactionRef
    })

    if (!amount || !paymentMethod || amount <= 0) {
      console.log('❌ Invalid request data')
      return new Response(
        JSON.stringify({ error: 'Amount and payment method are required' }),
        { status: 400 }
      )
    }

    console.log('🔌 Connecting to database...')
    await connectToDatabase()
    console.log('✅ Database connected')

    // Create top-up request (1 THB = 1 point)
    console.log('💰 Creating top-up record...')
    const topUp = new TopUp({
      userId: user.id,
      username: user.username,
      amount: parseFloat(amount),
      points: parseFloat(amount), // 1:1 ratio
      paymentMethod,
      paymentProof: paymentProof || '',
      transactionRef: transactionRef || '',
      status: 'pending'
    })

    console.log('💾 Saving top-up to database...')
    await topUp.save()
    console.log('✅ Top-up saved successfully')

    console.log(
      `Top-up request created: $${amount} by ${user.username}, ID: ${topUp._id}`
    )

    // Emit notifications (WebSocket) - non-blocking
    setImmediate(async () => {
      try {
        const { emitAdminNotification, emitTopUpRequestUpdate } = await import(
          '@/lib/websocket'
        )

        // Notify admin about new request
        await emitAdminNotification(
          `New top-up request: $${amount} from ${user.username}`,
          'info'
        )

        // Also emit specific top-up event for admin
        await emitTopUpRequestUpdate({
          action: 'created',
          requestId: topUp._id,
          amount: topUp.amount,
          username: user.username,
          status: 'pending'
        })

        console.log(
          `WebSocket notifications sent for top-up request ${topUp._id}`
        )
      } catch (emitErr) {
        console.warn(
          'WebSocket notification failed (non-blocking):',
          emitErr.message
        )
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Top-up request submitted successfully',
        topUp: {
          id: topUp._id,
          amount: topUp.amount,
          points: topUp.points,
          status: topUp.status,
          createdAt: topUp.createdAt
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Top-up request error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    })

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500
      }
    )
  }
}

// Get user's top-up history
export async function GET(req) {
  try {
    const user = await verifyAuth(req)
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      )
    }

    await connectToDatabase()

    const topUps = await TopUp.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .limit(50)

    return new Response(
      JSON.stringify({
        success: true,
        topUps: topUps.map((t) => ({
          id: t._id,
          amount: t.amount,
          points: t.points,
          paymentMethod: t.paymentMethod,
          status: t.status,
          processedAt: t.processedAt,
          rejectionReason: t.rejectionReason,
          createdAt: t.createdAt
        }))
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Top-up history error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
