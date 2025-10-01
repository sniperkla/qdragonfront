import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import CodeRequest from '@/lib/codeRequestModel'
import PlanSetting from '@/lib/planSettingModel'
import { emitCodesUpdate, emitAdminNotification } from '@/lib/websocket'

// Purchase & instantly activate a license using points
export async function POST(req) {
  try {
    const authData = verifyAuth(req)
    if (!authData) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
    }

    const { accountNumber, platform, plan, pointsUsed } = await req.json()
    if (!accountNumber || !platform || !plan) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }
    if (accountNumber.length < 4) {
      return new Response(JSON.stringify({ error: 'Account number too short' }), { status: 400 })
    }

    await connectToDatabase()

    const user = await User.findById(authData.id)
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    const planDays = plan === 'lifetime' ? 'lifetime' : parseInt(plan, 10)
    if (planDays !== 'lifetime' && (isNaN(planDays) || planDays <= 0)) {
      return new Response(JSON.stringify({ error: 'Invalid plan selected' }), { status: 400 })
    }

    // Find dynamic plan
    const planQuery = planDays === 'lifetime'
      ? { isLifetime: true, isActive: true }
      : { days: planDays, isActive: true }
    const planSetting = await PlanSetting.findOne(planQuery)
    if (!planSetting) {
      return new Response(JSON.stringify({ error: 'Plan not available' }), { status: 400 })
    }

    const requiredPoints = planSetting.points
    if (user.points < requiredPoints) {
      return new Response(
        JSON.stringify({ error: 'Insufficient points', required: requiredPoints, current: user.points }),
        { status: 400 }
      )
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
    return new Response(
      JSON.stringify({
        success: true,
        license: {
          code: licenseCode,
          plan: planSetting.days,
          isLifetime: planSetting.isLifetime,
          remainingPoints: user.points,
          expireDate: expiresAt,
          source: 'points'
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('purchase-points error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
