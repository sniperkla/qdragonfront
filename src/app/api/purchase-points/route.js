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
import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import User from '@/lib/userModel'
import CustomerAccount from '@/lib/customerAccountModel'
import { verifyAuth } from '@/lib/auth'
import {
  sendPurchaseConfirmationEmail,
  sendLicenseActivatedEmail
} from '@/lib/emailService'
import {
  emitCodesUpdate,
  emitAdminNotification,
  emitNotificationToAdminAndClient,
  emitCustomerAccountUpdate,
  emitBroadcastNotification
} from '@/lib/websocket'
import { generateLicenseKey } from '@/lib/generateLicenseKey'

// Format date to Thai Buddhist Era format with time
const formatThaiDateTime = (date) => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const yearBE = d.getFullYear() + 543 // Convert to Buddhist Era
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')

  return `${day}/${month}/${yearBE} ${hours}:${minutes}`
}

// Purchase license using points
export async function POST(req) {
  try {
    const user = await verifyAuth(req)
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      )
    }

    const { accountNumber, platform, plan, pointsUsed } = await req.json()

    if (!accountNumber || !platform || !plan) {
      return new Response(
        JSON.stringify({
          error: 'Account number, platform, and plan are required'
        }),
        { status: 400 }
      )
    }

    // Validate plan and calculate points required
    const validPlans = {
      30: 30, // 30 days = 30 points
      60: 60, // 60 days = 60 points
      90: 90, // 90 days = 90 points
      180: 180, // 180 days = 180 points
      365: 365 // 365 days = 365 points
    }

    if (!validPlans[plan]) {
      return new Response(
        JSON.stringify({
          error: 'Invalid plan. Available: 30, 60, 90, 180, 365 days'
        }),
        { status: 400 }
      )
    }

    const pointsRequired = validPlans[plan]

    await connectToDatabase()

    // Get user's current points
    const userDoc = await User.findById(user.id).select(
      'points username email preferredLanguage'
    )
    if (!userDoc) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404
      })
    }

    if (userDoc.points < pointsRequired) {
      return new Response(
        JSON.stringify({
          error: `Insufficient points. Required: ${pointsRequired}, Available: ${userDoc.points}`
        }),
        { status: 400 }
      )
    }

    // Generate license key
    const licenseKey = generateLicenseKey()

    // Calculate price (for display purposes, since points were already paid for)
    const priceUSD = pointsRequired // 1 point = 1 day = originally $1 equivalent

    // Calculate expiration date (plan days from now)
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + parseInt(plan))

    // Create code request (already "paid" since points were used)
    const codeRequest = new CodeRequest({
      userId: user.id,
      username: userDoc.username,
      accountNumber,
      platform,
      plan: parseInt(plan),
      price: priceUSD,
      code: licenseKey,
      status: 'paid', // Skip pending_payment since points were used
      paymentMethod: 'points',
      paidAt: new Date(),
      expiresAt: expirationDate,
      pointsUsed: pointsRequired
    })

    await codeRequest.save()

    // Deduct points from user
    await User.findByIdAndUpdate(user.id, {
      $inc: { points: -pointsRequired }
    })

    // Automatically create customer account (no admin approval needed for points purchases)
    const expireDateThai = formatThaiDateTime(expirationDate)

    // Check if customer account already exists for this license
    const existingCustomerAccount = await CustomerAccount.findOne({
      license: licenseKey
    })
    let customerAccountDoc = existingCustomerAccount
    if (!existingCustomerAccount) {
      const customerAccount = new CustomerAccount({
        user: userDoc.username,
        license: licenseKey,
        platform,
        accountNumber,
        plan: parseInt(plan),
        expireDate: expireDateThai,
        status: 'valid', // Immediately valid since paid with points
        activatedAt: new Date(),
        createdBy: 'user',
        adminGenerated: false
      })

      customerAccountDoc = await customerAccount.save()
      console.log(
        `✅ Customer account created automatically for ${userDoc.username} - License: ${licenseKey}`
      )
    }

    // Update CodeRequest status to activated since customer account is created
    await CodeRequest.findByIdAndUpdate(codeRequest._id, {
      status: 'activated',
      activatedAt: new Date(),
      isActive: true
    })

    console.log(
      `User ${userDoc.username} purchased ${plan}-day license using ${pointsRequired} points - Account activated immediately`
    )

    // Send activation email (since account is immediately activated)
    try {
      if (userDoc.email) {
        await sendLicenseActivatedEmail(userDoc.email, userDoc.username, {
          licenseCode: licenseKey,
          planDays: parseInt(plan),
          expireDateThai: expireDateThai,
          language: userDoc.preferredLanguage || 'en'
        })
      }
    } catch (emailErr) {
      console.warn('License activation email failed:', emailErr.message)
    }

    // Emit WebSocket events
    try {
      await emitCodesUpdate(user.id, {
        action: 'activated',
        codeId: codeRequest._id,
        status: 'activated',
        license: licenseKey
      })
      // Emit customer account update to user (and indirectly admin listener via admin room if needed)
      await emitCustomerAccountUpdate(user.id, {
        action: 'created',
        license: licenseKey,
        platform,
        accountNumber,
        plan: parseInt(plan),
        status: 'valid',
        expireDate: expireDateThai,
        activatedAt: new Date().toISOString(),
        remainingPoints: userDoc.points - pointsRequired
      })
      // Extra broadcast so any late listeners still refresh lists
      await emitBroadcastNotification(
        `License ${licenseKey} activated for ${userDoc.username}`,
        'info'
      )
      await emitAdminNotification(
        `Points purchase activated: ${plan} days by ${userDoc.username} (${pointsRequired} points) - Account ready!`,
        'success'
      )
      await emitNotificationToAdminAndClient(
        user.id,
        `License purchased and activated successfully using ${pointsRequired} points! Code: ${licenseKey} - Ready to use!`,
        'success'
      )
    } catch (emitErr) {
      console.warn('WebSocket emission failed:', emitErr.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'License purchased and activated successfully with points',
        license: {
          code: licenseKey,
          plan: parseInt(plan),
          pointsUsed: pointsRequired,
          remainingPoints: userDoc.points - pointsRequired,
          status: 'activated',
          accountNumber,
          platform,
          expiresAt: expirationDate.toISOString(),
          expireDateThai: expireDateThai,
          activatedAt: new Date().toISOString()
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Points purchase error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
