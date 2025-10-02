import { connectToDatabase } from '@/lib/mongodb'
import PlanSetting from '@/lib/planSettingModel'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


// Public endpoint to fetch active plans (no auth required for display)
export async function GET(req) {
	try {
		await connectToDatabase()

		// Ensure defaults exist (seed only if collection empty)
		try {
			await PlanSetting.seedDefaultPlans?.()
		} catch (seedErr) {
			// Non-fatal
		}

		const plans = await PlanSetting.find({ isActive: true })
			.sort({ sortOrder: 1, days: 1 })
			.lean()

		const serialized = plans.map((p) => ({
			id: p._id.toString(),
			name: p.name,
			days: p.isLifetime ? null : p.days,
			isLifetime: !!p.isLifetime,
			price: p.price,
			points: p.points,
			description: p.description || '',
			sortOrder: p.sortOrder,
			pricePerDay: p.isLifetime ? null : Number((p.price / p.days).toFixed(4))
		}))

		// Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ success: true, plans: serialized }, 200)
    }
    
    return new Response(JSON.stringify({ success: true, plans: serialized }), { status: 200 })
	} catch (error) {
		console.error('Failed to fetch plans:', error)
		// Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ success: false, error: 'Failed to fetch plans' }, 500)
    }
    
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch plans' }), { status: 500 })
	}
}

