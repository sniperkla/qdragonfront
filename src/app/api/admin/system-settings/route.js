import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import SystemSetting from '@/lib/systemSettingModel'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


export async function GET(request) {
  try {
    // Verify admin authentication
    const adminSession = request.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    await connectToDatabase()

    // Get all settings or filter by category
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = {}
    if (category) {
      query.category = category
    }

    const settings = await SystemSetting.find(query).sort({ category: 1, key: 1 })

    return NextResponse.json({
      success: true,
      data: settings
    })
  } catch (error) {
    console.error('Error fetching system settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system settings', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    // Verify admin authentication
    const adminSession = request.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    // Decrypt request body (automatically handles both encrypted and plain requests)


    const body = await decryptRequestBody(request)
    const { key, value, description, category } =body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Update or create setting
    const setting = await SystemSetting.setSetting(
      key,
      value,
      description || '',
      category || 'general',
      'admin'
    )

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting
    })
  } catch (error) {
    console.error('Error updating system setting:', error)
    return NextResponse.json(
      { error: 'Failed to update system setting', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // Verify admin authentication
    const adminSession = request.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    await connectToDatabase()

    // Seed default settings
    await SystemSetting.seedDefaultSettings()

    return NextResponse.json({
      success: true,
      message: 'Default settings initialized successfully'
    })
  } catch (error) {
    console.error('Error initializing system settings:', error)
    return NextResponse.json(
      { error: 'Failed to initialize system settings', details: error.message },
      { status: 500 }
    )
  }
}
