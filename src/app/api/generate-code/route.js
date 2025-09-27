import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import User from '@/lib/userModel'
import { emitCodesUpdate, emitAdminNotification } from '@/lib/websocket'

// Code generation API
export async function POST(req) {
  try {
    // Verify user authentication
    const authData = verifyAuth(req)
    if (!authData) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      )
    }

    const { accountNumber, platform, plan } = await req.json()

    // Input validation
    if (!accountNumber || !platform || !plan) {
      return new Response(
        JSON.stringify({
          error: 'Account number, platform, and plan are required'
        }),
        { status: 400 }
      )
    }

    if (accountNumber.length < 4) {
      return new Response(
        JSON.stringify({
          error: 'Account number must be at least 4 characters'
        }),
        { status: 400 }
      )
    }

    // Plan pricing
    const planPricing = {
      30: { days: 30, price: 99 },
      60: { days: 60, price: 189 },
      90: { days: 90, price: 269 }
    }

    if (!planPricing[plan]) {
      return new Response(JSON.stringify({ error: 'Invalid plan selected' }), {
        status: 400
      })
    }

    // Generate unique trading code
    const generateTradingCode = () => {
      const prefix = 'QD' // Q-Dragon prefix
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 8).toUpperCase()
      return `${prefix}-${timestamp}-${random}`
    }

    const tradingCode = generateTradingCode()
    const planInfo = planPricing[plan]

    await connectToDatabase()

    // Get user info
    const user = await User.findById(authData.id)
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404
      })
    }

    // Save the code generation request to database
    const codeRequest = new CodeRequest({
      userId: authData.id,
      username: user.username,
      accountNumber,
      platform,
      plan: planInfo.days,
      code: tradingCode,
      price: planInfo.price,
      status: 'pending_payment',
      expiresAt: new Date(Date.now() + planInfo.days * 24 * 60 * 60 * 1000)
    })
    await codeRequest.save()

    console.log('Trading code generated and saved:', {
      userId: authData.id,
      username: user.username,
      accountNumber,
      platform,
      plan: `${planInfo.days} days`,
      code: tradingCode,
      price: planInfo.price,
      status: 'pending_payment'
    })

    // Emit WebSocket updates
    try {
      await emitCodesUpdate(authData.id, {
        codeId: codeRequest._id,
        code: tradingCode,
        accountNumber,
        platform,
        plan: planInfo.days,
        price: planInfo.price,
        status: 'pending_payment',
        action: 'created'
      })

      await emitAdminNotification(
        `New trading code generated: ${tradingCode} by ${user.username}`,
        'info'
      )
    } catch (wsError) {
      console.error('WebSocket emission error:', wsError)
      // Don't fail the main request if WebSocket fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        code: tradingCode,
        accountNumber,
        platform,
        plan: planInfo.days,
        price: planInfo.price,
        currency: 'USD',
        status: 'pending_payment',
        message:
          'Trading code generated successfully. Please proceed to payment.'
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Code generation error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
