import { connectToDatabase } from '@/lib/mongodb'
import CustomerAccount from '@/lib/customerAccountModel'
import User from '@/lib/userModel'
import jwt from 'jsonwebtoken'

export async function GET(request) {
  try {
    await connectToDatabase()

    // Get token from cookie
    const token = request.cookies.get('token')?.value
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })
    }

    // Verify token and get user
    let userId
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      userId = decoded.userId
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    }

    // Get user details
    const user = await User.findById(userId)
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    // Find customer accounts for this user
    const customerAccounts = await CustomerAccount.find({ 
      user: user.username 
    }).sort({ activatedAt: -1 })

    console.log('Found customer accounts for user:', {
      username: user.username,
      accountCount: customerAccounts.length,
      accounts: customerAccounts.map(acc => ({ 
        license: acc.license, 
        expireDate: acc.expireDate, 
        status: acc.status 
      }))
    })

    return new Response(JSON.stringify({
      success: true,
      accounts: customerAccounts
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error fetching customer accounts:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}