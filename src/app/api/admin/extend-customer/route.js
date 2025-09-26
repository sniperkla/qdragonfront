import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import CustomerAccount from '@/lib/customerAccountModel'

export async function POST(request) {
  try {
    await connectToDatabase()

    // Check admin authentication via cookie
    const adminSession = request.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    const { customerId, extendDays } = await request.json()

    if (!customerId || !extendDays || extendDays <= 0) {
      return NextResponse.json({ error: 'Customer ID and valid extend days are required' }, { status: 400 })
    }

    // Find the customer account
    const customerAccount = await CustomerAccount.findById(customerId)
    if (!customerAccount) {
      return NextResponse.json({ error: 'Customer account not found' }, { status: 404 })
    }

    console.log('Admin extending license:', {
      customerId,
      licenseCode: customerAccount.license,
      currentExpiry: customerAccount.expireDate,
      extendDays,
      currentStatus: customerAccount.status
    })

    // Parse current expiry date (Thai Buddhist Era format)
    let currentExpiryDate
    if (customerAccount.expireDate) {
      try {
        // Parse Thai format: "DD/MM/YYYY HH:mm"
        const [datePart, timePart] = customerAccount.expireDate.split(' ')
        const [day, month, thaiYear] = datePart.split('/')
        const [hours, minutes] = timePart ? timePart.split(':') : ['23', '59']
        
        // Convert Thai Buddhist year to Gregorian year
        const gregorianYear = parseInt(thaiYear) - 543
        currentExpiryDate = new Date(gregorianYear, parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes))
        
        console.log('Parsed current expiry date:', {
          originalThai: customerAccount.expireDate,
          parsedGregorian: currentExpiryDate.toISOString(),
          isValidDate: !isNaN(currentExpiryDate.getTime())
        })
      } catch (error) {
        console.error('Error parsing expiry date:', error)
        currentExpiryDate = new Date()
      }
    } else {
      // Fallback to today if no expiry date
      currentExpiryDate = new Date()
      console.log('No expiry date found, using current date:', currentExpiryDate.toISOString())
    }

    // If the current date is past expiry, extend from now
    const now = new Date()
    const baseDate = currentExpiryDate > now ? currentExpiryDate : now
    
    console.log('Extension calculation:', {
      currentExpiry: currentExpiryDate.toISOString(),
      now: now.toISOString(),
      isExpired: currentExpiryDate <= now,
      baseDate: baseDate.toISOString(),
      extendDays: parseInt(extendDays)
    })

    // Calculate new expiry date
    const newExpiryDate = new Date(baseDate)
    newExpiryDate.setDate(newExpiryDate.getDate() + parseInt(extendDays))

    // Format new expiry date in Thai Buddhist Era format
    const newExpiryThaiFormat = formatThaiDateTime(newExpiryDate)
    
    console.log('New expiry date:', {
      gregorianDate: newExpiryDate.toISOString(),
      thaiFormat: newExpiryThaiFormat
    })

    // Update customer account
    const updateResult = await CustomerAccount.findByIdAndUpdate(
      customerId, 
      {
        expireDate: newExpiryThaiFormat,
        status: 'valid', // Reactivate if was expired
        extendedBy: 'admin',
        lastExtendedAt: new Date()
      },
      { new: true } // Return the updated document
    )
    
    console.log('Update result:', {
      success: !!updateResult,
      newExpireDate: updateResult?.expireDate,
      newStatus: updateResult?.status
    })

    return NextResponse.json({
      success: true,
      message: `License ${customerAccount.license} successfully extended by ${extendDays} days`,
      licenseCode: customerAccount.license,
      oldExpiry: customerAccount.expireDate,
      newExpiry: newExpiryThaiFormat,
      extendedDays: parseInt(extendDays),
      status: 'valid',
      extendedBy: 'admin',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin extend customer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to format date to Thai Buddhist Era format
function formatThaiDateTime(date) {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const yearBE = date.getFullYear() + 543 // Convert to Buddhist Era
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  return `${day}/${month}/${yearBE} ${hours}:${minutes}`
}