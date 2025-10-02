import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import { verifyAuth } from '@/lib/auth'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


export async function GET(req) {
  try {
    const authResult = verifyAuth(req)
    if (!authResult) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Unauthorized' }, 401)
    }
    
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }

    await connectToDatabase()
    const user = await User.findById(authResult.id).select('-password')

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

    let rawPoints = user.points
    if (rawPoints === undefined || rawPoints === null) {
      const legacyField = user.pointsBalance ?? user.point ?? user.balance ?? 0
      rawPoints = legacyField
    }

    let normalizedPoints = Number(rawPoints)
    if (Number.isNaN(normalizedPoints) || normalizedPoints < 0) {
      normalizedPoints = 0
    }

    console.log(
      `/api/auth/me - User ${user.username} points from DB: ${rawPoints} (type: ${typeof rawPoints}) -> normalized: ${normalizedPoints}`
    )

    // Ensure database stores numeric points value
    if (
      rawPoints === undefined ||
      rawPoints === null ||
      typeof rawPoints !== 'number' ||
      rawPoints !== normalizedPoints
    ) {
      await User.findByIdAndUpdate(user._id, {
        $set: { points: normalizedPoints }
      })
      user.points = normalizedPoints
    } else {
      user.points = normalizedPoints
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          points: normalizedPoints,
          preferredLanguage: user.preferredLanguage
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Get user data error:', error)
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
