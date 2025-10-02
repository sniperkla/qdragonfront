import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import CustomerAccount from '@/lib/customerAccountModel'
import ExtensionRequest from '@/lib/extensionRequestModel'
import User from '@/lib/userModel'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


// Get user's licenses (unified view of codes and customer accounts)
export async function GET(req) {
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

    // Get code requests
    const codeRequests = await CodeRequest.find({ userId: authData.id })
      .sort({ createdAt: -1 })
      .select('-__v')

    // Get customer accounts
    const customerAccounts = await CustomerAccount.find({
      user: user.username
    }).sort({ activatedAt: -1 })

    // Create unified license data
    const licenses = []

    // Preload all approved extension aggregates keyed by licenseCode
    let extensionSums = {}
    try {
      const extAgg = await ExtensionRequest.aggregate([
        { $match: { userId: user._id, status: 'approved' } },
        {
          $group: {
            _id: '$licenseCode',
            totalExtended: { $sum: '$requestedDays' },
            lastCumulative: { $max: '$cumulativePlanDays' }
          }
        }
      ])
      extAgg.forEach((r) => {
        extensionSums[r._id] = {
          totalExtended: r.totalExtended || 0,
          lastCumulative: r.lastCumulative || null
        }
      })
    } catch (aggErr) {
      console.error('Failed to aggregate extensions (non-fatal):', aggErr)
    }

    // Process code requests - these become licenses
    for (const codeRequest of codeRequests) {
      // Find matching customer account if exists
      const matchingAccount = customerAccounts.find(
        (acc) => acc.license === codeRequest.code
      )

      // Determine cumulative plan days (base plan + approved extensions)
      let cumulativePlanDays = codeRequest.plan
      const extData = extensionSums[codeRequest.code]
      if (extData) {
        cumulativePlanDays =
          extData.lastCumulative || codeRequest.plan + extData.totalExtended
      }

      const license = {
        _id: codeRequest._id,
        code: codeRequest.code,
        platform: codeRequest.platform,
        accountNumber: codeRequest.accountNumber,
        plan: codeRequest.plan,
        cumulativePlanDays,
        price: codeRequest.price,
        status: codeRequest.status,
        createdAt: codeRequest.createdAt,
        expiresAt: codeRequest.expiresAt,
        source: 'codeRequest', // Indicates this comes from CodeRequest model
        // Enhanced data from customer account if available
        customerAccount: matchingAccount
          ? {
              expireDate: matchingAccount.expireDate,
              status: matchingAccount.status,
              activatedAt: matchingAccount.activatedAt,
              platform: matchingAccount.platform,
              accountNumber: matchingAccount.accountNumber
            }
          : null
      }

      licenses.push(license)
    }

    // Add any customer accounts that don't have matching code requests
    // (this handles edge cases where accounts exist without code requests)
    for (const account of customerAccounts) {
      const hasMatchingCodeRequest = codeRequests.some(
        (code) => code.code === account.license
      )

      if (!hasMatchingCodeRequest) {
        // Determine cumulative plan for orphan customer account as well
        let cumulativePlanDays = account.plan
        const extData = extensionSums[account.license]
        if (extData) {
          cumulativePlanDays =
            extData.lastCumulative ||
            (account.plan || 0) + extData.totalExtended
        }

        const license = {
          _id: account._id,
          code: account.license,
          platform: account.platform,
          accountNumber: account.accountNumber,
          plan: account.plan || 'Unknown',
          cumulativePlanDays,
          price: null, // No price info from customer account
          status: 'activated', // Customer accounts are typically activated
          createdAt: account.activatedAt || account.createdAt,
          expiresAt: account.expireDate,
          source: 'customerAccount', // Indicates this comes from CustomerAccount model
          customerAccount: {
            expireDate: account.expireDate,
            status: account.status,
            activatedAt: account.activatedAt,
            platform: account.platform,
            accountNumber: account.accountNumber
          }
        }

        licenses.push(license)
      }
    }

    // Sort by creation date (newest first)
    licenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    console.log('Unified licenses fetched:', {
      userId: authData.id,
      username: user.username,
      licenseCount: licenses.length,
      codeRequestCount: codeRequests.length,
      customerAccountCount: customerAccounts.length
    })

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        licenses
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        licenses
      }), { status: 200 })
  } catch (error) {
    console.error('Error fetching licenses:', error)
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
