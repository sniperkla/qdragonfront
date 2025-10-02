import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import User from '@/lib/userModel'
import { emitNewCodeGenerated, emitAdminNotification } from '@/lib/websocket'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


// Code generation API
export async function POST(req) {
  try {
    // Verify user authentication
    const authData = verifyAuth(req)
    if (!authData) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Authentication required' }, 401)
    }
    
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
    }

    // Decrypt request body (automatically handles both encrypted and plain requests)


    const body = await decryptRequestBody(req)
    const { accountNumber, platform, plan } =body

    // Input validation
    if (!accountNumber || !platform || !plan) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error: 'Account number, platform, and plan are required'
        }, 400)
    }
    
    return new Response(JSON.stringify({
          error: 'Account number, platform, and plan are required'
        }), { status: 400 })
    }

    if (accountNumber.length < 4) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error: 'Account number must be at least 4 characters'
        }, 400)
    }
    
    return new Response(JSON.stringify({
          error: 'Account number must be at least 4 characters'
        }), { status: 400 })
    }

    // Plan pricing
    const planPricing = {
      30: { days: 30, price: 99 },
      60: { days: 60, price: 189 },
      90: { days: 90, price: 269 }
    }

    if (!planPricing[plan]) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Invalid plan selected' }, 400)
    }
    
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
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'User not found' }, 404)
    }
    
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

    // Emit WebSocket events so admin dashboard updates in real time
    try {
      await emitNewCodeGenerated({
        codeId: codeRequest._id.toString(),
        code: tradingCode,
        username: user.username,
        accountNumber,
        platform,
        plan: planInfo.days,
        status: 'pending_payment',
        createdAt: codeRequest.createdAt
      })
      await emitAdminNotification(
        `New trading code: ${tradingCode} (${planInfo.days}d)`,
        'info'
      )
    } catch (wsErr) {
      console.warn('WebSocket emission failed (generate-code):', wsErr.message)
    }

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        code: tradingCode,
        accountNumber,
        platform,
        plan: planInfo.days,
        price: planInfo.price,
        currency: 'THB',
        status: 'pending_payment',
        message:
          'Trading code generated successfully. Please proceed to payment.'
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        code: tradingCode,
        accountNumber,
        platform,
        plan: planInfo.days,
        price: planInfo.price,
        currency: 'THB',
        status: 'pending_payment',
        message:
          'Trading code generated successfully. Please proceed to payment.'
      }), { status: 200 })
  } catch (error) {
    console.error('Code generation error:', error)
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
