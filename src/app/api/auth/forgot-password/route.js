import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import { sendPasswordResetEmail } from '@/lib/emailService'
import crypto from 'crypto'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


export async function POST(req) {
  try {
    // Decrypt request body (automatically handles both encrypted and plain requests)

    const body = await decryptRequestBody(req)
    const { email, language } =body

    // Input validation
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Invalid email format' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400
      })
    }

    await connectToDatabase()

    const user = await User.findOne({ email })

    // Check if user exists - be explicit about this requirement
    if (!user) {
      console.log('Password reset requested for non-existent email:', email)
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error:
            'No account found with this email address. Please register first.',
          requiresRegistration: true
        }, 404)
    }
    
    return new Response(JSON.stringify({
          error:
            'No account found with this email address. Please register first.',
          requiresRegistration: true
        }), { status: 404 })
    }

    console.log('Password reset request for existing user:', user.username)

    // Check if user's email is verified
    if (!user.isEmailVerified) {
      console.log(
        'Password reset blocked - email not verified for user:',
        user.username
      )
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error:
            'Your email address is not verified. Please verify your email before requesting a password reset.',
          requiresVerification: true,
          email: user.email,
          username: user.username
        }, 403)
    }
    
    return new Response(JSON.stringify({
          error:
            'Your email address is not verified. Please verify your email before requesting a password reset.',
          requiresVerification: true,
          email: user.email,
          username: user.username
        }), { status: 403 })
    }

    console.log(
      'User email verified, proceeding with password reset for:',
      user.username
    )

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Save reset token to user
    user.passwordResetToken = resetToken
    user.passwordResetExpires = resetTokenExpiry
    await user.save()

    console.log('Password reset token generated for user:', user.username)

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.username,
      resetToken,
      language || 'en'
    )

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error: 'Failed to send password reset email. Please try again later.'
        }, 500)
    }
    
    return new Response(JSON.stringify({
          error: 'Failed to send password reset email. Please try again later.'
        }), { status: 500 })
    }

    console.log('Password reset email sent successfully to:', user.email)

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        message:
          'If an account with that email exists, we have sent a password reset link.'
      }, 200)
    }
    
    return new Response(JSON.stringify({
        message:
          'If an account with that email exists, we have sent a password reset link.'
      }), { status: 200 })
  } catch (error) {
    console.error('Forgot password error:', error)
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
