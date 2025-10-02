import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import { sendVerificationEmail } from '@/lib/emailService'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


export async function POST(req) {
  try {
    // Decrypt request body (automatically handles both encrypted and plain requests)

    const body = await decryptRequestBody(req)
    const { email, language } =body

    if (!email) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Email is required' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400
      })
    }

    await connectToDatabase()

    const user = await User.findOne({ email })

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

    if (user.isEmailVerified) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Email is already verified' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Email is already verified' }), { status: 400 })
    }

    // Generate new verification token
    const verificationToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)

    user.emailVerificationToken = verificationToken
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    await user.save()

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email,
      user.username,
      verificationToken,
      language || 'en'
    )

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error: 'Failed to send verification email. Please try again later.'
        }, 500)
    }
    
    return new Response(JSON.stringify({
          error: 'Failed to send verification email. Please try again later.'
        }), { status: 500 })
    }

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        message: 'Verification email sent successfully'
      }, 200)
    }
    
    return new Response(JSON.stringify({
        message: 'Verification email sent successfully'
      }), { status: 200 })
  } catch (error) {
    console.error('Resend verification error:', error)
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
