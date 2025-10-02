import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import CustomerAccount from '../../../../lib/customerAccountModel'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'

// WebSocket imports removed

// Admin authentication middleware
const verifyAdmin = async (request) => {
  try {
    const adminSession = request.cookies.get('admin-session')?.value

    if (!adminSession || adminSession !== 'authenticated') {
      return false
    }

    return true
  } catch (error) {
    console.error('Admin verification error:', error)
    return false
  }
}

// Generate unique license key
const generateLicenseKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''

  // Format: XXXX-XXXX-XXXX-XXXX
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) {
      result += '-'
    }
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

// (legacy helper removed – inline logic used below)

// Format date to Thai Buddhist Era format with time
const formatThaiDateTime = (date) => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const yearBE = d.getFullYear() + 543 // Convert to Buddhist Era
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')

  return `${day}/${month}/${yearBE} ${hours}:${minutes}`
}

export async function POST(request) {
  try {
    console.log('Admin create account API called')

    // Verify admin authentication
    if (!(await verifyAdmin(request))) {
      console.log('Admin authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Decrypt request body (automatically handles both encrypted and plain requests)
    const body = await decryptRequestBody(request)
    
    const {
      username,
      platform,
      accountNumber,
      plan,
      extendDays,
      isDemo,
      demoDays
    } = body

    // Basic field validation (accountNumber optional if demo)
    if (!username || !platform || !plan || (!accountNumber && !isDemo)) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Initialize demo logic
    // Keep original username even for demo accounts; only force accountNumber
    let finalUsername = username
    let finalAccountNumber = accountNumber
    let demoMode = false
    let demoDuration = null
    if (isDemo) {
      demoMode = true
      finalAccountNumber = 'DEMO'
      if (!demoDays || isNaN(demoDays) || parseInt(demoDays) <= 0) {
        return NextResponse.json(
          { error: 'demoDays must be a positive number' },
          { status: 400 }
        )
      }
      if (parseInt(demoDays) > 60) {
        return NextResponse.json(
          { error: 'demoDays cannot exceed 60' },
          { status: 400 }
        )
      }
      demoDuration = parseInt(demoDays)
    }

    // Validate extendDays if provided (ignored for demo, but we let it pass if empty)
    if (extendDays && (isNaN(extendDays) || parseInt(extendDays) < 0)) {
      return NextResponse.json(
        { error: 'Extend days must be a valid positive number' },
        { status: 400 }
      )
    }

    // Connect to MongoDB
    if (!mongoose.connections[0].readyState) {
      await mongoose.connect(process.env.MONGODB_URI)
    }

    // Uniqueness check (skip for demo)
    if (!demoMode) {
      const existingAccount = await CustomerAccount.findOne({
        accountNumber: finalAccountNumber
      })
      if (existingAccount) {
        return NextResponse.json(
          { error: 'Account number already exists' },
          { status: 400 }
        )
      }
    }

    // Generate license key (prefix DEMO- for demo accounts)
    let licenseKey
    let licenseExists = true
    while (licenseExists) {
      const raw = generateLicenseKey()
      licenseKey = demoMode ? `DEMO-${raw}` : raw
      const existingLicense = await CustomerAccount.findOne({
        license: licenseKey
      })
      licenseExists = !!existingLicense
    }

    // Create expiry date object (demo uses demoDuration days regardless of selected plan UI state)
    const expiryDateTime = new Date()
    if (demoMode) {
      // Demo: exact demoDuration days
      expiryDateTime.setDate(expiryDateTime.getDate() + demoDuration)
    } else if (plan === 'lifetime') {
      // Lifetime: +100 years then convert to BE in formatter (+543) -> far future
      expiryDateTime.setFullYear(expiryDateTime.getFullYear() + 100)
    } else {
      const totalDays = parseInt(plan) + parseInt(extendDays || 0)
      expiryDateTime.setDate(expiryDateTime.getDate() + totalDays)
    }

    // Format expiry date in Thai Buddhist Era format for database storage
    const expireDateThai = formatThaiDateTime(expiryDateTime)

    // Calculate total plan days for database storage
    const totalPlanDays = demoMode
      ? demoDuration
      : plan === 'lifetime'
        ? 999999
        : parseInt(plan) + parseInt(extendDays || 0)

    // Create customer account
    const customerAccount = new CustomerAccount({
      user: username,
      license: licenseKey,
      platform,
      accountNumber: finalAccountNumber,
      plan: demoMode ? demoDuration : totalPlanDays,
      expireDate: expireDateThai, // Store Thai formatted date
      status: 'valid', // Manual accounts are immediately valid
      activatedAt: new Date(),
      createdBy: 'admin',
      adminGenerated: true,
      isDemo: demoMode,
      demoDays: demoMode ? demoDuration : undefined
    })

    await customerAccount.save()
    console.log('License generated successfully:', customerAccount._id)

    // Emit WebSocket updates
    try {
      // Find user ID to emit to correct user
      const User = (await import('@/lib/userModel')).default
      const user = await User.findOne({ username })

      // WebSocket emissions removed
    } catch (wsError) {
      console.error('WebSocket emission error:', wsError)
      // Don't fail the main request if WebSocket fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'License generated successfully',
      license: {
        id: customerAccount._id,
        user: customerAccount.user,
        license: customerAccount.license,
        platform: customerAccount.platform,
        accountNumber: customerAccount.accountNumber,
        plan: customerAccount.plan,
        expireDate: customerAccount.expireDate,
        expireDateThai: customerAccount.expireDate, // Already in Thai format
        status: customerAccount.status,
        activatedAt: customerAccount.activatedAt,
        isDemo: customerAccount.isDemo,
        demoDays: customerAccount.demoDays
      }
    })
  } catch (error) {
    console.error('Error generating license:', error)
    return NextResponse.json(
      { error: 'Failed to generate license: ' + error.message },
      { status: 500 }
    )
  }
}
