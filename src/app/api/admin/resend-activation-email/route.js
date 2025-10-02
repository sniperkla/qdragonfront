import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import User from '@/lib/userModel'
import { sendLicenseActivatedEmail } from '@/lib/emailService'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


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
    const { codeId } =body
    if (!codeId) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'codeId required' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'codeId required' }), {
        status: 400
      })
    }

    await connectToDatabase()

    const codeReq = await CodeRequest.findById(codeId)
    if (!codeReq) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Code not found' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'Code not found' }), {
        status: 404
      })
    }

    if (codeReq.status !== 'activated') {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'License not activated yet' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'License not activated yet' }), { status: 400 })
    }

    if (codeReq.activationEmailResentCount >= 3) {
      return new Response(
        JSON.stringify({ error: 'Resend limit reached (3)' }),
        { status: 429 }
      )
    }

    const userDoc = await User.findById(codeReq.userId).select(
      'email username preferredLanguage'
    )
    if (!userDoc?.email) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'User email unavailable' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'User email unavailable' }), {
        status: 400
      })
    }

    const result = await sendLicenseActivatedEmail(
      userDoc.email,
      userDoc.username,
      {
        licenseCode: codeReq.code,
        planDays: codeReq.plan,
        expireDateThai: 'See platform', // Could look up customer account if needed
        language: userDoc.preferredLanguage || 'en'
      }
    )

    if (!result.success) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: result.error || 'Failed to send' }, 500)
    }
    
    return new Response(JSON.stringify({ error: result.error || 'Failed to send' }), { status: 500 })
    }

    await CodeRequest.findByIdAndUpdate(codeReq._id, {
      activationEmailSent: true,
      activationEmailSentAt: new Date(),
      $inc: { activationEmailResentCount: 1 }
    })

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ success: true, message: 'Activation email resent' }, 200)
    }
    
    return new Response(JSON.stringify({ success: true, message: 'Activation email resent' }), { status: 200 })
  } catch (err) {
    console.error('Resend activation email error:', err)
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
