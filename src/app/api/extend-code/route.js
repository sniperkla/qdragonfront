import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import CustomerAccount from '@/lib/customerAccountModel'
import User from '@/lib/userModel'
import mongoose from 'mongoose'
import {
  emitCodesUpdate,
  emitCustomerAccountUpdate,
  emitPointsUpdate
} from '@/lib/websocket'

// Extension Request Schema
const ExtensionRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  codeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodeRequest',
    required: true
  },
  username: { type: String, required: true },
  licenseCode: { type: String, required: true },
  currentExpiry: { type: String, required: true },
  requestedPlan: { type: String, required: true }, // '7', '30', '90', etc.
  requestedDays: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  processedBy: { type: String }, // admin username
  rejectionReason: { type: String }
})

const ExtensionRequest =
  mongoose.models.ExtensionRequest ||
  mongoose.model('ExtensionRequest', ExtensionRequestSchema)

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

export async function POST(request) {
  try {
    console.log('Extend code API called')

    // Verify user authentication
    const authData = verifyAuth(request)
    console.log(
      'Auth data:',
      authData ? { id: authData.id, userId: authData.userId } : 'No auth data'
    )

    if (!authData) {
      console.log('Authentication failed')
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      )
    }

    const { codeId, extendDays, extendPlan } = await request.json()
    console.log('Request data:', { codeId, extendDays, extendPlan })

    // Calculate extend days from plan if provided, otherwise use extendDays
    let actualExtendDays = extendDays
    if (extendPlan) {
      const planToDays = {
        7: 7,
        30: 30,
        90: 90,
        180: 180,
        365: 365
      }
      actualExtendDays = planToDays[extendPlan]
      if (!actualExtendDays) {
        return new Response(
          JSON.stringify({ error: 'Invalid extension plan selected' }),
          { status: 400 }
        )
      }
    }

    // Validate input
    if (!codeId || !actualExtendDays || parseInt(actualExtendDays) <= 0) {
      return new Response(
        JSON.stringify({
          error: 'Valid code ID and extend days/plan are required'
        }),
        { status: 400 }
      )
    }

    if (parseInt(actualExtendDays) > 365) {
      return new Response(
        JSON.stringify({ error: 'Maximum extension is 365 days' }),
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Verify user exists
    const user = await User.findById(authData.id)
    console.log(
      'User lookup:',
      user ? { id: user._id, username: user.username } : 'User not found'
    )

    if (!user) {
      console.log('User not found in database:', authData.id)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404
      })
    }

    // Find the code request belonging to the user
    const codeRequest = await CodeRequest.findOne({
      _id: codeId,
      userId: authData.id
    })
    console.log(
      'Code request found:',
      codeRequest
        ? {
            id: codeRequest._id,
            userId: codeRequest.userId,
            code: codeRequest.code
          }
        : 'Not found'
    )

    if (!codeRequest) {
      console.log('Code not found for user:', authData.id)
      return new Response(
        JSON.stringify({ error: 'Code not found or access denied' }),
        { status: 404 }
      )
    }

    // Check if code is activated
    if (codeRequest.status !== 'activated') {
      return new Response(
        JSON.stringify({ error: 'Only activated codes can be extended' }),
        { status: 400 }
      )
    }

    // Find the associated customer account
    const customerAccount = await CustomerAccount.findOne({
      license: codeRequest.code
    })
    console.log('Customer account lookup:', {
      searchedLicense: codeRequest.code,
      found: customerAccount
        ? {
            id: customerAccount._id,
            license: customerAccount.license,
            status: customerAccount.status
          }
        : 'Not found'
    })

    // Handle missing customer account
    let workingCustomerAccount = customerAccount

    if (!workingCustomerAccount) {
      console.log('Customer account not found for license:', codeRequest.code)
      console.log('Code status:', codeRequest.status)

      // Debug: Check existing accounts
      const totalAccounts = await CustomerAccount.countDocuments()
      console.log('Total customer accounts in database:', totalAccounts)

      if (totalAccounts > 0) {
        const sampleAccounts = await CustomerAccount.find({})
          .limit(3)
          .select('license user status')
        console.log('Sample customer accounts:', sampleAccounts)
      }

      // Only allow extension for activated codes
      if (codeRequest.status !== 'activated') {
        return new Response(
          JSON.stringify({
            error: 'Cannot extend code: Code must be activated first.'
          }),
          { status: 400 }
        )
      }

      // Create missing customer account for activated code
      console.log('Creating missing customer account for activated code')
      try {
        const originalExpiryDate = new Date(codeRequest.expiresAt || Date.now())
        const formattedExpireDate = formatThaiDateTime(originalExpiryDate)

        workingCustomerAccount = new CustomerAccount({
          user: codeRequest.username,
          license: codeRequest.code,
          expireDate: formattedExpireDate,
          status: 'valid',
          platform: codeRequest.platform,
          accountNumber: codeRequest.accountNumber,
          plan: codeRequest.plan,
          createdBy: 'user',
          adminGenerated: false,
          activatedAt: codeRequest.activatedAt || new Date()
        })

        await workingCustomerAccount.save()
        console.log(
          'Created missing customer account:',
          workingCustomerAccount._id
        )
      } catch (createError) {
        console.error('Failed to create missing customer account:', createError)
        return new Response(
          JSON.stringify({
            error: 'Failed to create customer account. Please contact support.'
          }),
          { status: 500 }
        )
      }
    }

    // Check if account is still valid (not expired or suspended)
    if (workingCustomerAccount.status !== 'valid') {
      return new Response(
        JSON.stringify({
          error: 'Cannot extend expired or suspended accounts'
        }),
        { status: 400 }
      )
    }

    // Parse current expiry date (assuming it's in Thai format DD/MM/YYYY HH:mm)
    let currentExpiryDate
    try {
      if (workingCustomerAccount.plan === 999999) {
        return new Response(
          JSON.stringify({ error: 'Lifetime accounts cannot be extended' }),
          { status: 400 }
        )
      }

      // Parse Thai date format DD/MM/YYYY HH:mm
      const dateParts = workingCustomerAccount.expireDate.split(' ')
      const [day, month, thaiYear] = dateParts[0].split('/')
      const [hours, minutes] = dateParts[1]
        ? dateParts[1].split(':')
        : ['00', '00']

      // Convert Thai Buddhist year to Gregorian year
      const gregorianYear = parseInt(thaiYear) - 543

      currentExpiryDate = new Date(
        gregorianYear,
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      )
    } catch (error) {
      console.error('Error parsing current expiry date:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid expiry date format' }),
        { status: 500 }
      )
    }

    // Check if user has enough points (1 point = 1 day)
    const requiredPoints = parseInt(actualExtendDays)
    if (user.points < requiredPoints) {
      return new Response(
        JSON.stringify({
          error: `Insufficient points. You need ${requiredPoints} points but have only ${user.points} points.`
        }),
        { status: 400 }
      )
    }

    // Deduct points from user
    user.points -= requiredPoints
    await user.save()

    console.log('Points deducted:', {
      userId: authData.id,
      pointsDeducted: requiredPoints,
      remainingPoints: user.points
    })

    // Calculate new expiry date by adding the requested days
    const newExpiryDate = new Date(currentExpiryDate)
    newExpiryDate.setDate(newExpiryDate.getDate() + parseInt(actualExtendDays))

    // Format new expiry date to Thai format
    const newExpiryFormatted = formatThaiDateTime(newExpiryDate)

    // Update customer account with new expiry
    workingCustomerAccount.expireDate = newExpiryFormatted
    await workingCustomerAccount.save()

    // Update code request expiry as well
    codeRequest.expiresAt = newExpiryDate
    await codeRequest.save()

    console.log('Extension applied successfully:', {
      userId: authData.id,
      codeId,
      licenseCode: codeRequest.code,
      oldExpiry: formatThaiDateTime(currentExpiryDate),
      newExpiry: newExpiryFormatted,
      extendedDays: parseInt(actualExtendDays),
      pointsUsed: requiredPoints,
      remainingPoints: user.points
    })

    // Emit real-time updates
    try {
      // Update points
      emitPointsUpdate(authData.id, user.points)

      // Update codes
      emitCodesUpdate(authData.id, {
        type: 'extended',
        codeId: codeRequest._id,
        licenseCode: codeRequest.code,
        newExpiry: newExpiryFormatted,
        extendedDays: parseInt(actualExtendDays)
      })

      // Update customer account
      emitCustomerAccountUpdate(authData.id, {
        type: 'extended',
        license: codeRequest.code,
        newExpiry: newExpiryFormatted,
        extendedDays: parseInt(actualExtendDays)
      })
    } catch (wsError) {
      console.error('WebSocket emission error:', wsError)
      // Don't fail the extension if websocket fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `License extended successfully! ${parseInt(actualExtendDays)} days added.`,
        licenseCode: codeRequest.code,
        oldExpiry: formatThaiDateTime(currentExpiryDate),
        newExpiry: newExpiryFormatted,
        extendedDays: parseInt(actualExtendDays),
        pointsUsed: requiredPoints,
        remainingPoints: user.points,
        status: 'completed'
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error extending code:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to extend code: ' + error.message
      }),
      { status: 500 }
    )
  }
}
