import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import CustomerAccount from '@/lib/customerAccountModel'
import ExtensionRequest from '@/lib/extensionRequestModel'
import TopUp from '@/lib/topUpModel'
import User from '@/lib/userModel'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


// Returns combined history of purchases (code requests), extension requests, and top-up requests for the authenticated user
export async function GET(req) {
  try {
    const auth = verifyAuth(req)
    if (!auth) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Authentication required' }, 401)
    }
    
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
    }

    await connectToDatabase()

    // Get user info for username lookup
    const user = await User.findById(auth.id)
    if (!user) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'User not found' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    // Fetch purchases (CustomerAccounts created by user)
    const purchases = await CustomerAccount.find({ 
      user: user.username,
      adminGenerated: false // Only user-created purchases
    })
      .sort({ activatedAt: -1 })
      .lean()

    // Fetch extension requests
    const extensions = await ExtensionRequest.find({ userId: auth.id })
      .sort({ requestedAt: -1 })
      .lean()

    // Fetch top-up requests
    const topups = await TopUp.find({ userId: auth.id })
      .sort({ createdAt: -1 })
      .lean()

    // Normalize purchase items (from CustomerAccount)
    const purchaseHistory = purchases.map((p) => ({
      type: 'purchase',
      id: p._id.toString(),
      licenseCode: p.license,
      accountNumber: p.accountNumber,
      platform: p.platform,
      planDays: p.plan,
      price: null, // CustomerAccount doesn't store price
      currency: 'THB',
      status: p.status === 'valid' ? 'activated' : p.status,
      createdAt: p.createdAt,
      activatedAt: p.activatedAt,
      expireDate: p.expireDate
    }))

    // Normalize extension items
    const extensionHistory = extensions.map((e) => ({
      type: 'extension',
      id: e._id.toString(),
      licenseCode: e.licenseCode,
      requestedPlan: e.requestedPlan,
      requestedDays: e.requestedDays,
      cumulativePlanDays: e.cumulativePlanDays ?? null,
      totalExtendedDays: e.totalExtendedDays ?? null,
      status: e.status,
      requestedAt: e.requestedAt,
      processedAt: e.processedAt,
      processedBy: e.processedBy || null,
      rejectionReason: e.rejectionReason || null
    }))

    // Normalize top-up items
    const topupHistory = topups.map((t) => ({
      type: 'topup',
      id: t._id.toString(),
      amount: t.amount,
      points: t.points,
      paymentMethod: t.paymentMethod,
      paymentProof: t.paymentProof,
      transactionRef: t.transactionRef,
      status: t.status,
      createdAt: t.createdAt,
      processedAt: t.processedAt,
      processedBy: t.processedBy || null,
      rejectionReason: t.rejectionReason || null
    }))

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        purchases: purchaseHistory,
        extensions: extensionHistory,
        topups: topupHistory,
        totalPurchases: purchaseHistory.length,
        totalExtensions: extensionHistory.length,
        totalTopups: topupHistory.length
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        purchases: purchaseHistory,
        extensions: extensionHistory,
        topups: topupHistory,
        totalPurchases: purchaseHistory.length,
        totalExtensions: extensionHistory.length,
        totalTopups: topupHistory.length
      }), { status: 200 })
  } catch (error) {
    console.error('History API error:', error)
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
