import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { adminKey } = await request.json()
    
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json(
        { error: 'Invalid admin key' },
        { status: 401 }
      )
    }

    // Create admin session token
    const response = NextResponse.json({
      success: true,
      message: 'Admin authenticated successfully'
    })

    // Set admin cookie (simple admin session)
    response.cookies.set('admin-session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}