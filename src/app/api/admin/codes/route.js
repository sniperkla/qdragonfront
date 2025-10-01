import { connectToDatabase } from '@/lib/mongodb'
import CodeRequest from '@/lib/codeRequestModel'
import CustomerAccount from '@/lib/customerAccountModel'
import User from '@/lib/userModel'
// WebSocket emit helpers
import {
  emitCodesUpdate,
  emitCustomerAccountUpdate,
  emitAdminNotification,
  emitNotificationToAdminAndClient
} from '@/lib/websocket'
import { sendLicenseActivatedEmail } from '@/lib/emailService'

// Get all code requests (admin only)
export async function GET(req) {
  try {
    // Check admin authentication via cookie
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'
    const code = searchParams.get('code')

    await connectToDatabase()

    let query = {}

    if (code) {
      query.code = code
    } else if (status !== 'all') {
      query.status = status
    }

    const codeRequests = await CodeRequest.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(100)

    return new Response(
      JSON.stringify({
        success: true,
        total: codeRequests.length,
        codes: codeRequests
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Admin codes fetch error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// Update code status (admin only)
export async function PUT(req) {
  try {
    // Check admin authentication via cookie
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        { status: 401 }
      )
    }

    const { codeId, status, paymentMethod, paymentId } = await req.json()

    if (!codeId || !status) {
      return new Response(
        JSON.stringify({ error: 'Code ID and status are required' }),
        { status: 400 }
      )
    }

    await connectToDatabase()

    const updateData = {
      status,
      ...(paymentMethod && { paymentMethod }),
      ...(paymentId && { paymentId })
    }

    if (status === 'paid') {
      updateData.paidAt = new Date()
    }

    if (status === 'activated') {
      updateData.activatedAt = new Date()
      updateData.isActive = true
    }

    const codeRequest = await CodeRequest.findByIdAndUpdate(
      codeId,
      updateData,
      { new: true }
    ).populate('userId', 'username')

    if (!codeRequest) {
      return new Response(JSON.stringify({ error: 'Code not found' }), {
        status: 404
      })
    }

    // If status is being changed to 'activated', create customer account
    if (status === 'activated') {
      try {
        // Calculate expire date based on plan - add days to current date
        const now = new Date()
        const expireDate = new Date(now)
        expireDate.setDate(now.getDate() + codeRequest.plan)

        // Format expire date as "DD/MM/YYYY HH:mm" in Thai Buddhist calendar
        const day = expireDate.getDate().toString().padStart(2, '0')
        const month = (expireDate.getMonth() + 1).toString().padStart(2, '0')
        const thaiYear = expireDate.getFullYear() + 543 // Convert to Thai Buddhist year
        const hour = expireDate.getHours().toString().padStart(2, '0')
        const minute = expireDate.getMinutes().toString().padStart(2, '0')

        const formattedExpireDate = `${day}/${month}/${thaiYear} ${hour}:${minute}`

        // Create customer account
        const customerAccount = new CustomerAccount({
          user: codeRequest.userId?.username || codeRequest.username,
          license: codeRequest.code,
          expireDate: formattedExpireDate, // Store Thai formatted date
          status: 'valid',
          platform: codeRequest.platform,
          accountNumber: codeRequest.accountNumber,
          plan: codeRequest.plan,
          createdBy: 'user',
          adminGenerated: false
        })

        await customerAccount.save()

        console.log('Customer account created:', {
          user: customerAccount.user,
          license: customerAccount.license,
          expireDate: customerAccount.expireDate,
          status: customerAccount.status
        })

        // Send activation email (once)
        if (!codeRequest.activationEmailSent) {
          try {
            const userDoc = await User.findById(
              codeRequest.userId?._id || codeRequest.userId
            ).select('email username preferredLanguage')
            if (userDoc?.email) {
              const sendResult = await sendLicenseActivatedEmail(
                userDoc.email,
                userDoc.username || codeRequest.username,
                {
                  licenseCode: codeRequest.code,
                  planDays: codeRequest.plan,
                  expireDateThai: customerAccount.expireDate,
                  language: userDoc.preferredLanguage || 'en'
                }
              )
              if (sendResult.success) {
                await CodeRequest.findByIdAndUpdate(codeRequest._id, {
                  activationEmailSent: true,
                  activationEmailSentAt: new Date()
                })
              }
            }
          } catch (actEmailErr) {
            console.warn(
              'Failed to send activation email:',
              actEmailErr.message
            )
          }
        }
      } catch (customerError) {
        console.error('Error creating customer account:', customerError)
        // Don't fail the main request if customer account creation fails
      }
    }

    let customerAccountData = null
    if (status === 'activated') {
      // Find the customer account that was just created
      try {
        const CustomerAccount = (await import('@/lib/customerAccountModel'))
          .default
        customerAccountData = await CustomerAccount.findOne({
          license: codeRequest.code
        })
      } catch (error) {
        console.error('Error fetching created customer account:', error)
      }
    }

    // Emit WebSocket events for real-time updates
    try {
      const userId = codeRequest.userId?._id?.toString()
      // Notify admin list to refresh
      await emitAdminNotification(
        `Code ${codeRequest.code} updated to ${status}`,
        'info'
      )
      // Notify specific user of status change
      if (userId) {
        await emitCodesUpdate(userId, { codeId: codeRequest._id, status })
        await emitNotificationToAdminAndClient(
          userId,
          `Your license ${codeRequest.code} status: ${status}`,
          'success'
        )
      }
      if (status === 'activated' && userId) {
        await emitCustomerAccountUpdate(userId, { license: codeRequest.code })
      }
    } catch (emitErr) {
      console.warn('WebSocket emission failed (non-fatal):', emitErr.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Code status updated successfully',
        code: codeRequest,
        customerAccountCreated: status === 'activated' ? true : false,
        customerAccount: customerAccountData
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Admin code update error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// Delete code request (admin only)
export async function DELETE(req) {
  try {
    // Check admin authentication via cookie
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        { status: 401 }
      )
    }

    const { codeId } = await req.json()

    if (!codeId) {
      return new Response(JSON.stringify({ error: 'Code ID is required' }), {
        status: 400
      })
    }

    await connectToDatabase()

    // Fetch first (to retain user reference) then delete
    const codeToDelete = await CodeRequest.findById(codeId)
    if (!codeToDelete) {
      return new Response(JSON.stringify({ error: 'Code not found' }), {
        status: 404
      })
    }
    const deletedCode = await CodeRequest.findByIdAndDelete(codeId)

    if (!deletedCode) {
      return new Response(JSON.stringify({ error: 'Code not found' }), {
        status: 404
      })
    }

    // Also delete associated customer account if exists
    try {
      const CustomerAccount = (await import('@/lib/customerAccountModel'))
        .default
      await CustomerAccount.deleteOne({ license: deletedCode.code })
    } catch (customerError) {
      console.error(
        'Error deleting associated customer account:',
        customerError
      )
      // Don't fail the main request if customer account deletion fails
    }

    // Emit WebSocket events so landing page updates in real-time
    try {
      let userId = null
      if (deletedCode?.userId) {
        userId = deletedCode.userId.toString()
      } else if (deletedCode?.username) {
        try {
          const userDoc = await User.findOne(
            { username: deletedCode.username },
            '_id'
          )
          if (userDoc) userId = userDoc._id.toString()
        } catch (uErr) {
          console.warn(
            'Lookup user by username failed (delete emission):',
            uErr.message
          )
        }
      }

      if (userId) {
        await emitCodesUpdate(userId, {
          action: 'deleted',
          codeId: deletedCode._id,
          code: deletedCode.code
        })
        await emitNotificationToAdminAndClient(
          userId,
          `Your license ${deletedCode.code} was deleted by admin`,
          'warning'
        )
        await emitCustomerAccountUpdate(userId, {
          action: 'code-deleted',
          license: deletedCode.code
        })
      }
    } catch (emitErr) {
      console.warn(
        'WebSocket emission on delete failed (non-fatal):',
        emitErr.message
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Code deleted successfully',
        code: deletedCode
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Admin code delete error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
