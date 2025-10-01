import { verifyAuth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import ExtensionRequest from '@/lib/extensionRequestModel'
import TopUp from '@/lib/topUpModel'

// Returns combined history of purchases (code requests), extension requests, and top-up requests for the authenticated user
export async function GET(req) {
  try {
    const auth = verifyAuth(req)
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      )
    }

    await connectToDatabase()

    // Fetch purchases (CodeRequests)
    const purchases = await CodeRequest.find({ userId: auth.id })
      .sort({ createdAt: -1 })
      .lean()

    // Fetch extension requests
    const extensions = await ExtensionRequest.find({ userId: auth.id })
      .sort({ requestedAt: -1 })
      .lean()

    // Fetch top-up requests
    const topups = await TopUp.find({ userId: auth.id })
      .sort({ createdAt: -1 })
      .lean()

    // Normalize purchase items
    const purchaseHistory = purchases.map((p) => ({
      type: 'purchase',
      id: p._id.toString(),
      licenseCode: p.code,
      accountNumber: p.accountNumber,
      platform: p.platform,
      planDays: p.plan,
      price: p.price,
      currency: p.currency || 'THB',
      status: p.status,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      activatedAt: p.activatedAt,
      expiresAt: p.expiresAt
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

    return new Response(
      JSON.stringify({
        success: true,
        purchases: purchaseHistory,
        extensions: extensionHistory,
        topups: topupHistory,
        totalPurchases: purchaseHistory.length,
        totalExtensions: extensionHistory.length,
        totalTopups: topupHistory.length
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('History API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
