import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import CustomerAccount from '@/lib/customerAccountModel'
import User from '@/lib/userModel'
import mongoose from 'mongoose'
import { emitExtensionRequestUpdate, emitAdminNotification } from '@/lib/websocket'

// Extension Request Schema
const ExtensionRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  codeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodeRequest',
    required: false // Made optional to handle customer-account-only licenses
  },
  customerAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerAccount',
    required: false // For customer-account-only licenses
  },
  licenseSource: {
    type: String,
    enum: ['codeRequest', 'customerAccount', 'both'],
    required: true // Indicates the source of the license
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
    console.log('Extend license API called')

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

    const { codeId, extendDays, extendPlan, source, licenseCode: providedLicenseCode } = await request.json()
    console.log('Request data:', { codeId, extendDays, extendPlan, source, providedLicenseCode })

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
          error: 'Valid license ID and extend days/plan are required'
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

    let licenseRequest = null
    let customerAccount = null
    let licenseCode = providedLicenseCode

    // Use source information to determine which model to query first
    if (source === 'codeRequest') {
      // This is a CodeRequest-based license
      licenseRequest = await CodeRequest.findOne({
        _id: codeId,
        userId: authData.id
      })
      console.log(
        'License request found:',
        licenseRequest
          ? {
              id: licenseRequest._id,
              userId: licenseRequest.userId,
              code: licenseRequest.code
            }
          : 'Not found'
      )

      if (!licenseRequest) {
        return new Response(
          JSON.stringify({ error: 'License not found or access denied' }),
          { status: 404 }
        )
      }

      // Check if license is activated
      if (licenseRequest.status !== 'activated') {
        return new Response(
          JSON.stringify({ error: 'Only activated licenses can be extended' }),
          { status: 400 }
        )
      }

      licenseCode = licenseRequest.code
      // Find the associated customer account
      customerAccount = await CustomerAccount.findOne({
        license: licenseRequest.code
      })
    } else if (source === 'customerAccount') {
      // This is a CustomerAccount-only license
      customerAccount = await CustomerAccount.findById(codeId)
      
      if (!customerAccount) {
        return new Response(
          JSON.stringify({ error: 'License not found or access denied' }),
          { status: 404 }
        )
      }

      // Verify this customer account belongs to the current user
      if (customerAccount.user !== user.username) {
        console.log('Customer account does not belong to user:', {
          accountUser: customerAccount.user,
          currentUser: user.username
        })
        return new Response(
          JSON.stringify({ error: 'License not found or access denied' }),
          { status: 404 }
        )
      }
      
      licenseCode = customerAccount.license
    } else {
      // Fallback: try both approaches (for backward compatibility)
      licenseRequest = await CodeRequest.findOne({
        _id: codeId,
        userId: authData.id
      })

      if (licenseRequest) {
        if (licenseRequest.status !== 'activated') {
          return new Response(
            JSON.stringify({ error: 'Only activated licenses can be extended' }),
            { status: 400 }
          )
        }
        licenseCode = licenseRequest.code
        customerAccount = await CustomerAccount.findOne({
          license: licenseRequest.code
        })
      } else {
        customerAccount = await CustomerAccount.findById(codeId)
        if (customerAccount && customerAccount.user !== user.username) {
          return new Response(
            JSON.stringify({ error: 'License not found or access denied' }),
            { status: 404 }
          )
        }
        if (customerAccount) {
          licenseCode = customerAccount.license
        }
      }

      if (!licenseRequest && !customerAccount) {
        return new Response(
          JSON.stringify({ error: 'License not found or access denied' }),
          { status: 404 }
        )
      }
    }
    console.log('Customer account lookup:', {
      searchedLicense: licenseCode,
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
      console.log('Customer account not found for license:', licenseCode)
      console.log('License status:', licenseRequest?.status || 'No CodeRequest')

      // Debug: Check existing accounts
      const totalAccounts = await CustomerAccount.countDocuments()
      console.log('Total customer accounts in database:', totalAccounts)

      if (totalAccounts > 0) {
        const sampleAccounts = await CustomerAccount.find({})
          .limit(3)
          .select('license user status')
        console.log('Sample customer accounts:', sampleAccounts)
      }

      // Only allow extension for activated licenses (if we have a licenseRequest)
      if (licenseRequest && licenseRequest.status !== 'activated') {
        return new Response(
          JSON.stringify({
            error: 'Cannot extend license: License must be activated first.'
          }),
          { status: 400 }
        )
      }

      // If we don't have a licenseRequest but reached here, it means we only have customer account
      // In this case, we should not create a missing customer account since it should already exist
      if (!licenseRequest) {
        return new Response(
          JSON.stringify({
            error: 'License configuration error. Please contact support.'
          }),
          { status: 500 }
        )
      }

      // Create missing customer account for activated license
      console.log('Creating missing customer account for activated license')
      try {
        const originalExpiryDate = new Date(licenseRequest.expiresAt || Date.now())
        const formattedExpireDate = formatThaiDateTime(originalExpiryDate)

        workingCustomerAccount = new CustomerAccount({
          user: licenseRequest.username,
          license: licenseRequest.code,
          expireDate: formattedExpireDate,
          status: 'valid',
          platform: licenseRequest.platform,
          accountNumber: licenseRequest.accountNumber,
          plan: licenseRequest.plan,
          createdBy: 'user',
          adminGenerated: false,
          activatedAt: licenseRequest.activatedAt || new Date()
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

    // Check if user already has a pending extension request for this license
    const existingRequest = await ExtensionRequest.findOne({
      userId: authData.id,
      licenseCode: licenseCode,
      status: 'pending'
    })

    if (existingRequest) {
      return new Response(
        JSON.stringify({
          error:
            'You already have a pending extension request for this license. Please wait for admin approval.'
        }),
        { status: 400 }
      )
    }

    // Create extension request for admin approval
    const extensionRequestData = {
      userId: authData.id,
      username: user.username,
      licenseCode: licenseCode,
      currentExpiry: workingCustomerAccount.expireDate,
      requestedPlan: extendPlan,
      requestedDays: parseInt(actualExtendDays),
      status: 'pending'
    }

    // Set appropriate IDs and source based on license type
    if (source === 'codeRequest' && licenseRequest) {
      extensionRequestData.codeId = licenseRequest._id
      extensionRequestData.customerAccountId = workingCustomerAccount ? workingCustomerAccount._id : null
      extensionRequestData.licenseSource = workingCustomerAccount ? 'both' : 'codeRequest'
    } else if (source === 'customerAccount' && customerAccount) {
      extensionRequestData.customerAccountId = customerAccount._id
      extensionRequestData.licenseSource = 'customerAccount'
    } else {
      // Fallback logic
      if (licenseRequest) {
        extensionRequestData.codeId = licenseRequest._id
        extensionRequestData.licenseSource = workingCustomerAccount ? 'both' : 'codeRequest'
      }
      if (workingCustomerAccount) {
        extensionRequestData.customerAccountId = workingCustomerAccount._id
        if (!licenseRequest) {
          extensionRequestData.licenseSource = 'customerAccount'
        }
      }
    }

    const extensionRequest = new ExtensionRequest(extensionRequestData)

    await extensionRequest.save()

    console.log('Extension request created:', {
      requestId: extensionRequest._id,
      userId: authData.id,
      codeId,
      requestedDays: parseInt(actualExtendDays),
      currentExpiry: workingCustomerAccount.expireDate
    })

    // Emit WebSocket notifications so admin dashboard updates in real-time
    try {
      await emitExtensionRequestUpdate({
        action: 'created',
        requestId: extensionRequest._id.toString(),
        licenseCode,
        requestedDays: parseInt(actualExtendDays),
        requestedPlan: extendPlan,
        userId: authData.id,
        username: user.username,
        status: 'pending'
      })
      await emitAdminNotification(`Extension request submitted for ${licenseCode} (+${actualExtendDays} days)`, 'info')
    } catch (wsErr) {
      console.warn('WebSocket emission failed (extend-license create):', wsErr.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          'Extension request submitted successfully. Please wait for admin approval.',
        requestId: extensionRequest._id,
        licenseCode: licenseCode,
        currentExpiry: workingCustomerAccount.expireDate,
        requestedDays: parseInt(actualExtendDays),
        requestedPlan: extendPlan,
        status: 'pending'
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error extending license:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to extend license: ' + error.message
      }),
      { status: 500 }
    )
  }
}