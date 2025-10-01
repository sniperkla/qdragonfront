import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import { verifyAuth } from '@/lib/auth'

// Debug endpoint to check user points directly from database
export async function GET(req) {
  try {
    const authResult = verifyAuth(req)
    if (!authResult) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }

    await connectToDatabase()
    const user = await User.findById(authResult.id)

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404
      })
    }

    console.log(
      `DEBUG: User ${user.username} (${user._id}) points: ${user.points}`
    )
    console.log(
      `DEBUG: Full user object:`,
      JSON.stringify(user.toObject(), null, 2)
    )

    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          userId: user._id.toString(),
          username: user.username,
          points: user.points,
          pointsType: typeof user.points,
          hasPointsField: user.hasOwnProperty('points'),
          pointsInSchema: 'points' in user.toObject(),
          rawUser: user.toObject(),
          fixedPoints: user.points || 0
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Debug user points error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// Fix user points field if it's undefined
export async function POST(req) {
  try {
    const authResult = verifyAuth(req)
    if (!authResult) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }

    await connectToDatabase()

    // First check current state
    const currentUser = await User.findById(authResult.id)
    console.log(
      `BEFORE FIX: User ${currentUser.username} points: ${currentUser.points} (type: ${typeof currentUser.points})`
    )
    console.log(`BEFORE FIX: Full user object:`, currentUser.toObject())

    // Try multiple approaches to fix the points field
    console.log('Attempting to fix points field...')

    // Method 1: Direct MongoDB operation
    const mongoResult = await User.collection.updateOne(
      { _id: currentUser._id },
      { $set: { points: 0 } }
    )
    console.log('MongoDB direct update result:', mongoResult)

    // Method 2: Mongoose update
    const updatedUser = await User.findByIdAndUpdate(
      authResult.id,
      { points: 0 }, // Direct assignment instead of $set
      {
        new: true,
        runValidation: true,
        strict: false // Allow fields not in schema temporarily
      }
    )

    console.log(
      `AFTER FIX: User ${updatedUser.username} points: ${updatedUser.points} (type: ${typeof updatedUser.points})`
    )

    // Double check by querying again
    const verifyUser = await User.findById(authResult.id)
    console.log(
      `VERIFY: User ${verifyUser.username} points: ${verifyUser.points} (type: ${typeof verifyUser.points})`
    )
    console.log(`VERIFY: Full user object:`, verifyUser.toObject())

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Points field initialized',
        user: {
          username: updatedUser.username,
          points: updatedUser.points || 0, // Fallback to 0
          pointsType: typeof updatedUser.points
        },
        verification: {
          points: verifyUser.points || 0,
          type: typeof verifyUser.points
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Fix user points error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
