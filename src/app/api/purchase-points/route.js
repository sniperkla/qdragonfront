import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import CodeRequest from '@/lib/codeRequestModel'
import PlanSetting from '@/lib/planSettingModel'
import { emitCodesUpdate, emitAdminNotification } from '@/lib/websocket'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


// Purchase & instantly activate a license using points
export async function POST(req) {
  try {
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
    const { accountNumber, platform, plan, pointsUsed } =body
    if (!accountNumber || !platform || !plan) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Missing required fields' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }
    if (accountNumber.length < 4) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Account number too short' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Account number too short' }), { status: 400 })
    }

    await connectToDatabase()

    const user = await User.findById(authData.id)
    if (!user) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'User not found' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    const planDays = plan === 'lifetime' ? 'lifetime' : parseInt(plan, 10)
    if (planDays !== 'lifetime' && (isNaN(planDays) || planDays <= 0)) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Invalid plan selected' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Invalid plan selected' }), { status: 400 })
    }

    // Find dynamic plan
    const planQuery = planDays === 'lifetime'
      ? { isLifetime: true, isActive: true }
      : { days: planDays, isActive: true }
    const planSetting = await PlanSetting.findOne(planQuery)
    if (!planSetting) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Plan not available' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Plan not available' }), { status: 400 })
    }

    const requiredPoints = planSetting.points
    if (user.points < requiredPoints) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Insufficient points', required: requiredPoints, current: user.points }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Insufficient points', required: requiredPoints, current: user.points }), { status: 400 })
    }

    // Deduct points
    user.points -= requiredPoints
    await user.save()

    // Generate license code
    const generateLicenseCode = () => {
      const prefix = 'QL'
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 8).toUpperCase()
      return `${prefix}-${timestamp}-${random}`
    }
    const licenseCode = generateLicenseCode()

    // Create activated code request (points-based instant activation)
    const expiresAt = planSetting.isLifetime
      ? new Date(Date.now() + 50 * 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + planSetting.days * 24 * 60 * 60 * 1000)

    const codeDoc = new CodeRequest({
      userId: user._id,
      username: user.username,
      accountNumber,
      platform,
      plan: planSetting.isLifetime ? 999999 : planSetting.days,
      code: licenseCode,
      price: 0, // Points purchase has no direct USD price recorded here
      status: 'activated',
      expiresAt,
      source: 'points'
    })
    await codeDoc.save()

    // Emit websocket updates (non-fatal)
    try {
      await emitCodesUpdate(user._id.toString(), {
        action: 'points-purchase',
        codeId: codeDoc._id.toString(),
        license: licenseCode,
        status: 'activated'
      })
      await emitAdminNotification(`Points license activated: ${licenseCode}`, 'success')
    } catch (wsErr) {
      console.warn('WebSocket emission failed (purchase-points):', wsErr.message)
    }

    // Format Thai-style date if needed on frontend; provide ISO here
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        license: {
          code: licenseCode,
          plan: planSetting.days,
          isLifetime: planSetting.isLifetime,
          remainingPoints: user.points,
          expireDate: expiresAt,
          source: 'points'
        }
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        license: {
          code: licenseCode,
          plan: planSetting.days,
          isLifetime: planSetting.isLifetime,
          remainingPoints: user.points,
          expireDate: expiresAt,
          source: 'points'
        }
      }), { status: 200 })
  } catch (error) {
    console.error('purchase-points error:', error)
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Internal server error' }, 500)
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
