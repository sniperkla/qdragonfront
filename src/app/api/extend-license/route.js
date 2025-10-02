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
import ExtensionRequest from '@/lib/extensionRequestModel'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


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
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Authentication required' }, 401)
    }
    
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
    }

    // Decrypt request body (automatically handles both encrypted and plain requests)


    const body = await decryptRequestBody(request)
    const {
      codeId,
      extendDays,
      extendPlan,
      source,
      licenseCode: providedLicenseCode
    } =body
    console.log('Request data:', {
      codeId,
      extendDays,
      extendPlan,
      source,
      providedLicenseCode
    })

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
        // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Invalid extension plan selected' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Invalid extension plan selected' }), { status: 400 })
      }
    }

    // Validate input
    if (!codeId || !actualExtendDays || parseInt(actualExtendDays) <= 0) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error: 'Valid license ID and extend days/plan are required'
        }, 400)
    }
    
    return new Response(JSON.stringify({
          error: 'Valid license ID and extend days/plan are required'
        }), { status: 400 })
    }

    if (parseInt(actualExtendDays) > 365) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Maximum extension is 365 days' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Maximum extension is 365 days' }), { status: 400 })
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
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'User not found' }, 404)
    }
    
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
        // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'License not found or access denied' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'License not found or access denied' }), { status: 404 })
      }

      // Check if license is activated
      if (licenseRequest.status !== 'activated') {
        // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Only activated licenses can be extended' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Only activated licenses can be extended' }), { status: 400 })
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
        // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'License not found or access denied' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'License not found or access denied' }), { status: 404 })
      }

      // Verify this customer account belongs to the current user
      if (customerAccount.user !== user.username) {
        console.log('Customer account does not belong to user:', {
          accountUser: customerAccount.user,
          currentUser: user.username
        })
        // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'License not found or access denied' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'License not found or access denied' }), { status: 404 })
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
          // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
              error: 'Only activated licenses can be extended'
            }, 400)
    }
    
    return new Response(JSON.stringify({
              error: 'Only activated licenses can be extended'
            }), { status: 400 })
        }
        licenseCode = licenseRequest.code
        customerAccount = await CustomerAccount.findOne({
          license: licenseRequest.code
        })
      } else {
        customerAccount = await CustomerAccount.findById(codeId)
        if (customerAccount && customerAccount.user !== user.username) {
          // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'License not found or access denied' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'License not found or access denied' }), { status: 404 })
        }
        if (customerAccount) {
          licenseCode = customerAccount.license
        }
      }

      if (!licenseRequest && !customerAccount) {
        // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'License not found or access denied' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'License not found or access denied' }), { status: 404 })
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
        // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
            error: 'Cannot extend license: License must be activated first.'
          }, 400)
    }
    
    return new Response(JSON.stringify({
            error: 'Cannot extend license: License must be activated first.'
          }), { status: 400 })
      }

      // If we don't have a licenseRequest but reached here, it means we only have customer account
      // In this case, we should not create a missing customer account since it should already exist
      if (!licenseRequest) {
        // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
            error: 'License configuration error. Please contact support.'
          }, 500)
    }
    
    return new Response(JSON.stringify({
            error: 'License configuration error. Please contact support.'
          }), { status: 500 })
      }

      // Create missing customer account for activated license
      console.log('Creating missing customer account for activated license')
      try {
        const originalExpiryDate = new Date(
          licenseRequest.expiresAt || Date.now()
        )
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
        // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
            error: 'Failed to create customer account. Please contact support.'
          }, 500)
    }
    
    return new Response(JSON.stringify({
            error: 'Failed to create customer account. Please contact support.'
          }), { status: 500 })
      }
    }

    // Check if account is still valid (not expired or suspended)
    if (workingCustomerAccount.status !== 'valid') {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error: 'Cannot extend expired or suspended accounts'
        }, 400)
    }
    
    return new Response(JSON.stringify({
          error: 'Cannot extend expired or suspended accounts'
        }), { status: 400 })
    }

    // Parse current expiry date (assuming it's in Thai format DD/MM/YYYY HH:mm)
    let currentExpiryDate
    try {
      if (workingCustomerAccount.plan === 999999) {
        // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Lifetime accounts cannot be extended' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Lifetime accounts cannot be extended' }), { status: 400 })
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
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Invalid expiry date format' }, 500)
    }
    
    return new Response(JSON.stringify({ error: 'Invalid expiry date format' }), { status: 500 })
    }

    // Check if user has enough points (1 point = 1 day)
    const requiredPoints = parseInt(actualExtendDays)
    if (user.points < requiredPoints) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error: `Insufficient points. You need ${requiredPoints} points but have only ${user.points} points.`
        }, 400)
    }
    
    return new Response(JSON.stringify({
          error: `Insufficient points. You need ${requiredPoints} points but have only ${user.points} points.`
        }), { status: 400 })
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

    // Determine base plan days (original plan stored on customer account or code request)
    const basePlanDays =
      parseInt(workingCustomerAccount.plan || licenseRequest?.plan || 0) || 0

    // Calculate total extensions so far (sum of prior approved extensions for this license)
    let priorExtensionsTotal = 0
    try {
      priorExtensionsTotal = await ExtensionRequest.aggregate([
        { $match: { licenseCode: licenseCode, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$requestedDays' } } }
      ]).then((r) => r[0]?.total || 0)
    } catch (aggErr) {
      console.error('Failed to aggregate prior extensions (non-fatal):', aggErr)
    }

    const newTotalExtendedDays =
      priorExtensionsTotal + parseInt(actualExtendDays)
    const cumulativePlanDays = basePlanDays + newTotalExtendedDays

    // Update customer account with new expiry
    workingCustomerAccount.expireDate = newExpiryFormatted
    await workingCustomerAccount.save()

    // Update code request expiry as well (if exists)
    if (licenseRequest) {
      licenseRequest.expiresAt = newExpiryDate
      await licenseRequest.save()
    }

    console.log('Extension applied successfully:', {
      userId: authData.id,
      codeId,
      licenseCode: licenseCode,
      oldExpiry: formatThaiDateTime(currentExpiryDate),
      newExpiry: newExpiryFormatted,
      extendedDays: parseInt(actualExtendDays),
      pointsUsed: requiredPoints,
      remainingPoints: user.points,
      source: source
    })

    // Create extension history record (so /api/history reflects this immediate extension)
    let extensionHistoryRecord = null
    try {
      extensionHistoryRecord = await ExtensionRequest.create({
        userId: authData.id,
        codeId: licenseRequest ? licenseRequest._id : undefined,
        customerAccountId: workingCustomerAccount
          ? workingCustomerAccount._id
          : undefined,
        licenseSource:
          licenseRequest && workingCustomerAccount
            ? 'both'
            : licenseRequest
              ? 'codeRequest'
              : 'customerAccount',
        username: user.username,
        licenseCode: licenseCode,
        currentExpiry: formatThaiDateTime(currentExpiryDate), // store the previous expiry
        requestedPlan: extendPlan || String(actualExtendDays),
        requestedDays: parseInt(actualExtendDays),
        cumulativePlanDays: cumulativePlanDays,
        totalExtendedDays: newTotalExtendedDays,
        status: 'approved', // immediate approval since extension is auto-applied
        requestedAt: new Date(),
        processedAt: new Date(),
        processedBy: 'system'
      })
      console.log(
        'Extension history record created:',
        extensionHistoryRecord._id
      )
    } catch (historyErr) {
      console.error(
        'Failed to create extension history record (non-fatal):',
        historyErr
      )
    }

    // Emit real-time updates
    try {
      // Update points
      emitPointsUpdate(authData.id, user.points)

      // Update codes (if this is a code request based license)
      if (licenseRequest) {
        emitCodesUpdate(authData.id, {
          type: 'extended',
          codeId: licenseRequest._id,
          licenseCode: licenseCode,
          newExpiry: newExpiryFormatted,
          extendedDays: parseInt(actualExtendDays)
        })
      }

      // Update customer account
      emitCustomerAccountUpdate(authData.id, {
        type: 'extended',
        license: licenseCode,
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
        licenseCode: licenseCode,
        oldExpiry: formatThaiDateTime(currentExpiryDate),
        newExpiry: newExpiryFormatted,
        extendedDays: parseInt(actualExtendDays),
        pointsUsed: requiredPoints,
        remainingPoints: user.points,
        status: 'completed',
        extensionHistoryId: extensionHistoryRecord
          ? extensionHistoryRecord._id
          : null,
        cumulativePlanDays: extensionHistoryRecord
          ? extensionHistoryRecord.cumulativePlanDays
          : null,
        totalExtendedDays: extensionHistoryRecord
          ? extensionHistoryRecord.totalExtendedDays
          : null
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error extending license:', error)
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        error: 'Failed to extend license: ' + error.message
      }, 500)
    }
    
    return new Response(JSON.stringify({
        error: 'Failed to extend license: ' + error.message
      }), { status: 500 })
  }
}
