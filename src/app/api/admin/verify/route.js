import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const adminSession = request.cookies.get('admin-session')?.value
    
    if (adminSession === 'authenticated') {
      return NextResponse.json({
        success: true,
        authenticated: true
      })
    }

    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )

  } catch (error) {
    console.error('Admin verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}