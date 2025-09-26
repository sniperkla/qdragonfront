import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import CustomerAccount from '../../../../lib/customerAccountModel'

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

// Calculate expiry date
const calculateExpiryDate = (planDays, extendDays = 0) => {
  const now = new Date()

  if (planDays === 'lifetime') {
    // Set to a very far future date for lifetime plans
    const lifetimeDate = new Date(now)
    lifetimeDate.setFullYear(now.getFullYear() + 100)
    return lifetimeDate.toISOString().split('T')[0]
  }

  const expiryDate = new Date(now)
  const totalDays = parseInt(planDays) + parseInt(extendDays || 0)
  expiryDate.setDate(now.getDate() + totalDays)
  return expiryDate.toISOString().split('T')[0]
}

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

    const body = await request.json()
    console.log('Request body received:', { ...body, password: '[REDACTED]' })

    const { username, platform, accountNumber, plan, extendDays } = body

    // Validate required fields
    if (!username || !platform || !accountNumber || !plan) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate extendDays if provided
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

    // Check if account number already exists
    const existingAccount = await CustomerAccount.findOne({ accountNumber })
    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account number already exists' },
        { status: 400 }
      )
    }

    // Generate license key
    let licenseKey
    let licenseExists = true

    // Ensure unique license key
    while (licenseExists) {
      licenseKey = generateLicenseKey()
      const existingLicense = await CustomerAccount.findOne({
        license: licenseKey
      })
      licenseExists = !!existingLicense
    }

    // Create expiry date object for Thai format
    const expiryDateTime = new Date()
    if (plan !== 'lifetime') {
      const totalDays = parseInt(plan) + parseInt(extendDays || 0)
      expiryDateTime.setDate(expiryDateTime.getDate() + totalDays)
    } else {
      expiryDateTime.setFullYear(expiryDateTime.getFullYear() + 100)
    }

    // Format expiry date in Thai Buddhist Era format for database storage
    const expireDateThai = formatThaiDateTime(expiryDateTime)

    // Calculate total plan days for database storage
    const totalPlanDays = plan === 'lifetime' 
      ? 999999 
      : parseInt(plan) + parseInt(extendDays || 0)

    // Create customer account
    const customerAccount = new CustomerAccount({
      user: username,
      license: licenseKey,
      platform,
      accountNumber,
      plan: totalPlanDays,
      expireDate: expireDateThai, // Store Thai formatted date
      status: 'valid', // Manual accounts are immediately valid
      activatedAt: new Date(),
      createdBy: 'admin',
      adminGenerated: true
    })

    await customerAccount.save()
    console.log('License generated successfully:', customerAccount._id)

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
        activatedAt: customerAccount.activatedAt
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
