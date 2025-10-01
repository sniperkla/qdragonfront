import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import User from '@/lib/userModel'
import { sendLicenseActivatedEmail } from '@/lib/emailService'

export async function POST(req) {
  try {
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        { status: 401 }
      )
    }

    const { codeId } = await req.json()
    if (!codeId) {
      return new Response(JSON.stringify({ error: 'codeId required' }), {
        status: 400
      })
    }

    await connectToDatabase()

    const codeReq = await CodeRequest.findById(codeId)
    if (!codeReq) {
      return new Response(JSON.stringify({ error: 'Code not found' }), {
        status: 404
      })
    }

    if (codeReq.status !== 'activated') {
      return new Response(
        JSON.stringify({ error: 'License not activated yet' }),
        { status: 400 }
      )
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
      return new Response(
        JSON.stringify({ error: result.error || 'Failed to send' }),
        { status: 500 }
      )
    }

    await CodeRequest.findByIdAndUpdate(codeReq._id, {
      activationEmailSent: true,
      activationEmailSentAt: new Date(),
      $inc: { activationEmailResentCount: 1 }
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Activation email resent' }),
      { status: 200 }
    )
  } catch (err) {
    console.error('Resend activation email error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
