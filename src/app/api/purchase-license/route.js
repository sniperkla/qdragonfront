import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import User from '@/lib/userModel'
import { emitNewCodeGenerated, emitAdminNotification, emitCodesUpdate } from '@/lib/websocket'
import { sendPurchaseConfirmationEmail } from '@/lib/emailService'

// Purchase license API (simplified from generate-code)
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

    // Generate unique license code
    const generateLicenseCode = () => {
      const prefix = 'QL' // Q-License prefix (changed from QD for clarity)
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 8).toUpperCase()
      return `${prefix}-${timestamp}-${random}`
    }

    const licenseCode = generateLicenseCode()
    const planInfo = planPricing[plan]

    await connectToDatabase()

    // Get user info
    const user = await User.findById(authData.id)
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404
      })
    }

    // Save the license purchase request to database
    const licenseRequest = new CodeRequest({
      userId: authData.id,
      username: user.username,
      accountNumber,
      platform,
      plan: planInfo.days,
      code: licenseCode,
      price: planInfo.price,
      status: 'pending_payment',
      expiresAt: new Date(Date.now() + planInfo.days * 24 * 60 * 60 * 1000)
    })
    await licenseRequest.save()

    console.log('License purchase initiated:', {
      userId: authData.id,
      username: user.username,
      accountNumber,
      platform,
      plan: `${planInfo.days} days`,
      license: licenseCode,
      price: planInfo.price,
      status: 'pending_payment'
    })

    // Emit WebSocket events so admin dashboard updates in real time
    try {
      await emitNewCodeGenerated({
        codeId: licenseRequest._id.toString(),
        code: licenseCode,
        username: user.username,
        accountNumber,
        platform,
        plan: planInfo.days,
        status: 'pending_payment',
        createdAt: licenseRequest.createdAt
      })
      await emitAdminNotification(`New license purchase: ${licenseCode} (${planInfo.days}d)`, 'info')
    } catch (wsErr) {
      console.warn('WebSocket emission failed (purchase-license):', wsErr.message)
    }

    // Emit user-specific codes update (so client fetches history real-time)
    try {
      await emitCodesUpdate(authData.id, {
        action: 'purchase-created',
        codeId: licenseRequest._id.toString(),
        license: licenseCode,
        status: 'pending_payment'
      })
    } catch (userEmitErr) {
      console.warn('Failed to emit user codes update (purchase):', userEmitErr.message)
    }

    // Send purchase confirmation email (non-blocking but awaited here for simplicity)
    try {
      if (user.email) {
        await sendPurchaseConfirmationEmail(user.email, user.username, {
          licenseCode,
          planDays: planInfo.days,
          price: planInfo.price,
          status: 'pending_payment',
          currency: 'USD',
          language: user.preferredLanguage || 'en'
        })
      }
    } catch (emailErr) {
      console.warn('Failed to send purchase confirmation email:', emailErr.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        license: licenseCode,
        accountNumber,
        platform,
        plan: planInfo.days,
        price: planInfo.price,
        currency: 'USD',
        status: 'pending_payment',
        message:
          'License purchase initiated successfully. Please proceed to payment.'
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('License purchase error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}