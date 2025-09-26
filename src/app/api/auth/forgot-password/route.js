import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import { sendPasswordResetEmail } from '@/lib/emailService'
import crypto from 'crypto'

export async function POST(req) {
  try {
    const { email } = await req.json()

    // Input validation
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400
      })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400
      })
    }

    await connectToDatabase()

    const user = await User.findOne({ email })

    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log('Password reset requested for non-existent email:', email)
      return new Response(
        JSON.stringify({
          message:
            'If an account with that email exists, we have sent a password reset link.'
        }),
        { status: 200 }
      )
    }

    // Check if user's email is verified
    if (!user.isEmailVerified) {
      return new Response(
        JSON.stringify({
          error:
            'Please verify your email address before requesting a password reset.',
          requiresVerification: true,
          email: user.email
        }),
        { status: 403 }
      )
    }

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
      resetToken
    )

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      return new Response(
        JSON.stringify({
          error: 'Failed to send password reset email. Please try again later.'
        }),
        { status: 500 }
      )
    }

    console.log('Password reset email sent successfully to:', user.email)

    return new Response(
      JSON.stringify({
        message:
          'If an account with that email exists, we have sent a password reset link.'
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Forgot password error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
