import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import bcrypt from 'bcryptjs'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


export async function POST(req) {
  try {
    // Decrypt request body (automatically handles both encrypted and plain requests)

    const body = await decryptRequestBody(req)
    const { token, password, confirmPassword } =body

    // Input validation
    if (!token || !password || !confirmPassword) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'All fields are required' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'All fields are required' }), { status: 400 })
    }

    if (password !== confirmPassword) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Passwords do not match' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Passwords do not match' }), {
        status: 400
      })
    }

    if (password.length < 6) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error: 'Password must be at least 6 characters long'
        }, 400)
    }
    
    return new Response(JSON.stringify({
          error: 'Password must be at least 6 characters long'
        }), { status: 400 })
    }

    await connectToDatabase()

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    })

    if (!user) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
          error: 'Invalid or expired password reset token'
        }, 400)
    }
    
    return new Response(JSON.stringify({
          error: 'Invalid or expired password reset token'
        }), { status: 400 })
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

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        message:
          'Password has been reset successfully. You can now log in with your new password.'
      }, 200)
    }
    
    return new Response(JSON.stringify({
        message:
          'Password has been reset successfully. You can now log in with your new password.'
      }), { status: 200 })
  } catch (error) {
    console.error('Reset password error:', error)
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
