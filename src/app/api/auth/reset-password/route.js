import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import bcrypt from 'bcryptjs'

export async function POST(req) {
  try {
    const { token, password, confirmPassword } = await req.json()

    // Input validation
    if (!token || !password || !confirmPassword) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return new Response(JSON.stringify({ error: 'Passwords do not match' }), {
        status: 400
      })
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({
          error: 'Password must be at least 6 characters long'
        }),
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    })

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired password reset token'
        }),
        { status: 400 }
      )
    }

    console.log('Valid password reset token found for user:', user.username)

    // Hash new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Update user password and clear reset token
    user.password = hashedPassword
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    console.log('Password successfully reset for user:', user.username)

    return new Response(
      JSON.stringify({
        message:
          'Password has been reset successfully. You can now log in with your new password.'
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Reset password error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
