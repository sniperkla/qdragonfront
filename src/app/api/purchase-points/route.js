import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import CustomerAccount from '@/lib/customerAccountModel'
import PlanSetting from '@/lib/planSettingModel'
import { emitCodesUpdate, emitAdminNotification, emitCustomerAccountUpdate } from '@/lib/websocket'
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

    // Calculate expire date
    const now = new Date()
    const expireDate = planSetting.isLifetime
      ? new Date(now.getTime() + 50 * 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + planSetting.days * 24 * 60 * 60 * 1000)

    // Format expire date as "DD/MM/YYYY HH:mm" in Thai Buddhist calendar
    const day = expireDate.getDate().toString().padStart(2, '0')
    const month = (expireDate.getMonth() + 1).toString().padStart(2, '0')
    const year = expireDate.getFullYear() + 543 // Thai Buddhist year
    const hours = expireDate.getHours().toString().padStart(2, '0')
    const minutes = expireDate.getMinutes().toString().padStart(2, '0')
    const formattedExpireDate = `${day}/${month}/${year} ${hours}:${minutes}`

    // Create CustomerAccount directly (no CodeRequest)
    const customerAccount = new CustomerAccount({
      user: user.username,
      license: licenseCode,
      expireDate: formattedExpireDate,
      status: 'valid',
      platform: platform,
      accountNumber: accountNumber,
      plan: planSetting.isLifetime ? 999999 : planSetting.days,
      isDemo: false,
      createdBy: 'user',
      adminGenerated: false,
      activatedAt: now
    })
    await customerAccount.save()

    console.log('CustomerAccount created via points purchase:', {
      username: user.username,
      license: licenseCode,
      plan: planSetting.isLifetime ? 'Lifetime' : `${planSetting.days} days`,
      expireDate: formattedExpireDate,
      pointsUsed: requiredPoints,
      remainingPoints: user.points
    })

    // Emit websocket updates (non-fatal)
    try {
      await emitCustomerAccountUpdate(user._id.toString(), {
        type: 'created',
        license: licenseCode,
        expireDate: formattedExpireDate,
        plan: planSetting.days
      })
      await emitCodesUpdate(user._id.toString(), {
        action: 'points-purchase',
        license: licenseCode,
        status: 'activated'
      })
      await emitAdminNotification(`Points license activated: ${licenseCode} (${user.username})`, 'success')
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
          expireDate: formattedExpireDate,
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
          expireDate: formattedExpireDate,
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
