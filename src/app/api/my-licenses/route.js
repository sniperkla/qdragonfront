import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
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

    // Get customer accounts (primary source of truth)
    const customerAccounts = await CustomerAccount.find({
      user: user.username
    }).sort({ activatedAt: -1 })

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

    // Process customer accounts into licenses
    const licenses = customerAccounts.map((account) => {
      // Determine cumulative plan days (base plan + approved extensions)
      let cumulativePlanDays = account.plan
      const extData = extensionSums[account.license]
      if (extData) {
        cumulativePlanDays =
          extData.lastCumulative ||
          (account.plan || 0) + extData.totalExtended
      }

      return {
        _id: account._id,
        code: account.license,
        platform: account.platform,
        accountNumber: account.accountNumber,
        plan: account.plan,
        cumulativePlanDays,
        price: null, // CustomerAccount doesn't store price
        status: account.status === 'valid' ? 'activated' : account.status, // Map 'valid' to 'activated' for frontend compatibility
        createdAt: account.createdAt,
        activatedAt: account.activatedAt,
        expireDate: account.expireDate, // Thai format: "DD/MM/YYYY HH:mm"
        source: 'customerAccount',
        isDemo: account.isDemo || false,
        adminGenerated: account.adminGenerated || false
      }
    })

    // Sort by creation date (newest first)
    licenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    console.log('Licenses fetched from CustomerAccount:', {
      userId: authData.id,
      username: user.username,
      licenseCount: licenses.length,
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
