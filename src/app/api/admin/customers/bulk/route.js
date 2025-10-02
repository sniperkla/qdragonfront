import { connectToDatabase } from '@/lib/mongodb'
import CustomerAccount from '@/lib/customerAccountModel'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


// Bulk operations on customer accounts (admin only)
export async function POST(req) {
  try {
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Admin authentication required' }, 401)
    }
    
    return new Response(JSON.stringify({ error: 'Admin authentication required' }), { status: 401 })
    }

    // Decrypt request body (automatically handles both encrypted and plain requests)


    const body = await decryptRequestBody(req)
    const { action, ids } =body

    if (!action || !['suspend', 'delete'].includes(action)) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Invalid action. Use suspend or delete.' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action. Use suspend or delete.' }), { status: 400 })
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'ids array required' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'ids array required' }), {
        status: 400
      })
    }

    await connectToDatabase()

    const accounts = await CustomerAccount.find({ _id: { $in: ids } })

    if (!accounts || accounts.length === 0) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'No accounts found for provided ids' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'No accounts found for provided ids' }), { status: 404 })
    }

    const processed = []
    const skipped = []
    const errors = []

    // Lazy imports only if needed
    let CodeRequest = null
    let User = null
    let emitFns = null

    for (const acc of accounts) {
      try {
        if (action === 'suspend') {
          if (acc.status !== 'valid') {
            skipped.push({
              id: acc._id.toString(),
              reason: `status ${acc.status} not valid for suspend`
            })
            continue
          }
          acc.status = 'suspended'
          await acc.save()
          processed.push({ id: acc._id.toString(), license: acc.license })
        } else if (action === 'delete') {
          // Allow delete regardless of current status (auto-force)
          // Delete associated code request first (best-effort)
          try {
            if (!CodeRequest) {
              CodeRequest = (await import('@/lib/codeRequestModel')).default
            }
            await CodeRequest.deleteOne({ code: acc.license })
          } catch (crErr) {
            // Non-fatal
            console.warn(
              'Bulk delete associated code request failed:',
              crErr.message
            )
          }
          await CustomerAccount.findByIdAndDelete(acc._id)
          processed.push({ id: acc._id.toString(), license: acc.license })
        }

        // Emit websocket notifications per account (best-effort)
        try {
          if (!User) User = (await import('@/lib/userModel')).default
          if (!emitFns) {
            emitFns = await import('@/lib/websocket')
          }
          const userDoc = await User.findOne({ username: acc.user }, '_id')
          if (userDoc) {
            const userId = userDoc._id.toString()
            const {
              emitCodesUpdate,
              emitCustomerAccountUpdate,
              emitNotificationToAdminAndClient
            } = emitFns
            const eventPayload = {
              action:
                action === 'suspend' ? 'account-suspended' : 'account-deleted',
              license: acc.license
            }
            await emitCodesUpdate(userId, eventPayload)
            await emitCustomerAccountUpdate(userId, eventPayload)
            await emitNotificationToAdminAndClient(
              userId,
              action === 'suspend'
                ? `Your license ${acc.license} was suspended by admin`
                : `Your license account ${acc.license} was deleted by admin`,
              action === 'suspend' ? 'warning' : 'error'
            )
          }
        } catch (emitErr) {
          console.warn(
            'Bulk websocket emission failed (non-fatal):',
            emitErr.message
          )
        }
      } catch (innerErr) {
        console.error('Bulk action item error:', innerErr)
        errors.push({ id: acc._id.toString(), error: innerErr.message })
      }
    }

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        action,
        requested: ids.length,
        processedCount: processed.length,
        skippedCount: skipped.length,
        errorCount: errors.length,
        processed,
        skipped,
        errors
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        action,
        requested: ids.length,
        processedCount: processed.length,
        skippedCount: skipped.length,
        errorCount: errors.length,
        processed,
        skipped,
        errors
      }), { status: 200 })
  } catch (error) {
    console.error('Admin bulk customer action error:', error)
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
