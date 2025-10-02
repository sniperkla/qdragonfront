import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'

// POST /api/auth/login
export async function POST(req) {
  try {
    // Decrypt request body (automatically handles both encrypted and plain requests)
    const body = await decryptRequestBody(req)
    
    console.log('🔐 Login route - Decrypted body:', body)
    
    const { username, password } = body

    console.log('🔐 Login route - Username:', username, 'Password length:', password?.length)

    if (!username || !password) {
      console.log('❌ Missing username or password')
      return new Response(
        JSON.stringify({ error: 'Username and password required' }),
        { status: 400 }
      )
    }

    await connectToDatabase()
    console.log('🔍 Looking for user:', username)
    const user = await User.findOne({ username })
    console.log('🔍 User found:', !!user, user ? `(${user.username})` : '(none)')
    
    if (!user) {
      console.log('❌ User not found in database')
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401
      })
    }

    // Check email verification
    if (!user.isEmailVerified) {
      return new Response(
        JSON.stringify({
          error: 'Email not verified',
          requiresVerification: true,
          email: user.email,
          username: user.username
        }),
        { status: 403 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401
      })
    }

    let rawPoints =
      user.points ?? user.pointsBalance ?? user.point ?? user.balance ?? 0
    let normalizedPoints = Number(rawPoints)
    if (Number.isNaN(normalizedPoints) || normalizedPoints < 0) {
      normalizedPoints = 0
    }
    if (typeof user.points !== 'number' || user.points !== normalizedPoints) {
      await User.findByIdAndUpdate(user._id, {
        $set: { points: normalizedPoints }
      })
    }

    // Issue JWT (httpOnly cookie)
    const token = jwt.sign(
      { id: user._id.toString(), username: user.username },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    )

    const headers = new Headers()
    headers.append(
      'Set-Cookie',
      `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    )

    const responseData = {
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        points: normalizedPoints,
        preferredLanguage: user.preferredLanguage
      }
    }

    // Check if client wants encrypted response
    const wantsEncrypted = req.headers.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      const encryptedResponse = createEncryptedResponse(responseData, 200)
      // Copy cookie header to encrypted response
      encryptedResponse.headers.set('Set-Cookie', headers.get('Set-Cookie'))
      return encryptedResponse
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers }
    )
  } catch (err) {
    console.error('Login error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
