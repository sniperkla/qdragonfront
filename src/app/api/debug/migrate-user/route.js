import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import { verifyAuth } from '@/lib/auth'

// Force migrate user to new schema with points field
export async function POST(req) {
  try {
    const authResult = verifyAuth(req)
    if (!authResult) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }

    await connectToDatabase()

    // Get current user data
    const currentUser = await User.findById(authResult.id)
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404
      })
    }

    console.log('MIGRATE: Current user data:', currentUser.toObject())

    // Create a new user object with all required fields
    const userData = {
      username: currentUser.username,
      email: currentUser.email,
      password: currentUser.password,
      preferredLanguage: currentUser.preferredLanguage || 'en',
      points: 0, // Explicitly set points
      isEmailVerified: currentUser.isEmailVerified || false,
      emailVerificationToken: currentUser.emailVerificationToken,
      emailVerificationExpires: currentUser.emailVerificationExpires,
      passwordResetToken: currentUser.passwordResetToken,
      passwordResetExpires: currentUser.passwordResetExpires,
      createdAt: currentUser.createdAt,
      updatedAt: new Date()
    }

    // Delete and recreate the user with proper schema
    await User.findByIdAndDelete(authResult.id)
    const newUser = new User({
      _id: currentUser._id, // Keep the same ID
      ...userData
    })

    await newUser.save()

    console.log('MIGRATE: New user created:', newUser.toObject())

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User migrated to new schema',
        user: {
          username: newUser.username,
          points: newUser.points,
          pointsType: typeof newUser.points
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Migrate user error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500 }
    )
  }
}
