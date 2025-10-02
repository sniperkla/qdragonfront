import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import User from '@/lib/userModel'
import PlanSetting from '@/lib/planSettingModel'
import {
  emitNewCodeGenerated,
  emitAdminNotification,
  emitCodesUpdate
} from '@/lib/websocket'
import { sendPurchaseConfirmationEmail } from '@/lib/emailService'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


// Purchase license API (simplified from generate-code)
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

    await connectToDatabase()

    // Fetch dynamic plan from PlanSetting collection (active only)
    const planDays = parseInt(plan, 10)
    if (isNaN(planDays)) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Invalid plan format' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Invalid plan format' }), {
        status: 400
      })
    }

    const planSetting = await PlanSetting.findOne({
      days: planDays,
      isActive: true
    })
    if (!planSetting) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Selected plan not available' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Selected plan not available' }), {
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

    // Save the license purchase request to database
    const licenseRequest = new CodeRequest({
      userId: authData.id,
      username: user.username,
      accountNumber,
      platform,
      plan: planSetting.days,
      code: licenseCode,
      price: planSetting.price,
      status: 'pending_payment',
      // Handle lifetime: set expiry far in future (e.g., +50 years) if isLifetime
      expiresAt: planSetting.isLifetime
        ? new Date(Date.now() + 50 * 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + planSetting.days * 24 * 60 * 60 * 1000)
    })
    await licenseRequest.save()

    console.log('License purchase initiated:', {
      userId: authData.id,
      username: user.username,
      accountNumber,
      platform,
      plan: `${planSetting.isLifetime ? 'Lifetime' : planSetting.days + ' days'}`,
      license: licenseCode,
      price: planSetting.price,
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
        plan: planSetting.days,
        status: 'pending_payment',
        createdAt: licenseRequest.createdAt
      })
      await emitAdminNotification(
        `New license purchase: ${licenseCode} (${planSetting.isLifetime ? 'Lifetime' : planSetting.days + 'd'})`,
        'info'
      )
    } catch (wsErr) {
      console.warn(
        'WebSocket emission failed (purchase-license):',
        wsErr.message
      )
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
      console.warn(
        'Failed to emit user codes update (purchase):',
        userEmitErr.message
      )
    }

    // Send purchase confirmation email (non-blocking but awaited here for simplicity)
    try {
      if (user.email) {
        await sendPurchaseConfirmationEmail(user.email, user.username, {
          licenseCode,
          planDays: planSetting.days,
          price: planSetting.price,
          status: 'pending_payment',
          currency: 'THB',
          language: user.preferredLanguage || 'en'
        })
      }
    } catch (emailErr) {
      console.warn(
        'Failed to send purchase confirmation email:',
        emailErr.message
      )
    }

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        license: licenseCode,
        accountNumber,
        platform,
        plan: planSetting.days,
        price: planSetting.price,
        currency: 'THB',
        status: 'pending_payment',
        message:
          'License purchase initiated successfully. Please proceed to payment.'
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        license: licenseCode,
        accountNumber,
        platform,
        plan: planSetting.days,
        price: planSetting.price,
        currency: 'THB',
        status: 'pending_payment',
        message:
          'License purchase initiated successfully. Please proceed to payment.'
      }), { status: 200 })
  } catch (error) {
    console.error('License purchase error:', error)
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
