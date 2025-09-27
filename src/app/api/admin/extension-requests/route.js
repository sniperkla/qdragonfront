import { connectToDatabase } from '@/lib/mongodb'
import mongoose from 'mongoose'
import {
  emitCustomerAccountUpdate,
  emitNotificationToAdminAndClient,
  emitExtensionRequestUpdate
} from '@/lib/websocket'

// Extension Request Schema (updated to handle both CodeRequest and CustomerAccount sources)
const ExtensionRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  codeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodeRequest',
    required: false // Made optional to handle customer-account-only licenses
  },
  customerAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerAccount',
    required: false // For customer-account-only licenses
  },
  licenseSource: {
    type: String,
    enum: ['codeRequest', 'customerAccount', 'both'],
    required: true // Indicates the source of the license
  },
  username: { type: String, required: true },
  licenseCode: { type: String, required: true },
  currentExpiry: { type: String, required: true },
  requestedPlan: { type: String, required: true },
  requestedDays: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  processedBy: { type: String },
  rejectionReason: { type: String }
})

const ExtensionRequest =
  mongoose.models.ExtensionRequest ||
  mongoose.model('ExtensionRequest', ExtensionRequestSchema)

// Import other models
import CodeRequest from '@/lib/codeRequestModel'
import CustomerAccount from '@/lib/customerAccountModel'

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

// GET - Fetch all extension requests
export async function GET(request) {
  try {
    console.log('Admin extension requests API called')

    // Verify admin authentication
    if (!(await verifyAdmin(request))) {
      console.log('Admin authentication failed')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    await connectToDatabase()

    let query = {}
    if (status !== 'all') {
      query.status = status
    }

    const extensionRequests = await ExtensionRequest.find(query)
      .populate('userId', 'username email')
      .populate('codeId', 'code platform accountNumber')
      .populate('customerAccountId', 'license platform accountNumber status expireDate')
      .sort({ requestedAt: -1 })
      .limit(100)

    return new Response(
      JSON.stringify({
        success: true,
        total: extensionRequests.length,
        requests: extensionRequests
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching extension requests:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// PUT - Approve or reject extension request
export async function PUT(request) {
  try {
    console.log('Admin extension request action API called')

    // Verify admin authentication
    if (!(await verifyAdmin(request))) {
      console.log('Admin authentication failed')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }

    const { requestId, action, rejectionReason } = await request.json()

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Valid request ID and action are required' }),
        { status: 400 }
      )
    }

    if (action === 'reject' && !rejectionReason) {
      return new Response(
        JSON.stringify({ error: 'Rejection reason is required' }),
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Find the extension request
    const extensionRequest = await ExtensionRequest.findById(requestId)
      .populate('codeId')
      .populate('customerAccountId')

    if (!extensionRequest) {
      return new Response(
        JSON.stringify({ error: 'Extension request not found' }),
        { status: 404 }
      )
    }

    if (extensionRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Extension request already processed' }),
        { status: 400 }
      )
    }

    if (action === 'approve') {
      // Process the extension
      try {
        // Find customer account
        const customerAccount = await CustomerAccount.findOne({
          license: extensionRequest.licenseCode
        })

        if (!customerAccount) {
          return new Response(
            JSON.stringify({ error: 'Customer account not found' }),
            { status: 404 }
          )
        }

        // Parse current expiry date
        const dateParts = customerAccount.expireDate.split(' ')
        const [day, month, thaiYear] = dateParts[0].split('/')
        const [hours, minutes] = dateParts[1]
          ? dateParts[1].split(':')
          : ['00', '00']
        const gregorianYear = parseInt(thaiYear) - 543
        const currentExpiryDate = new Date(
          gregorianYear,
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes)
        )

        // Calculate new expiry date
        const newExpiryDate = new Date(currentExpiryDate)
        newExpiryDate.setDate(
          currentExpiryDate.getDate() + extensionRequest.requestedDays
        )
        const newExpiryThai = formatThaiDateTime(newExpiryDate)

        // Update customer account
        await CustomerAccount.findByIdAndUpdate(customerAccount._id, {
          expireDate: newExpiryThai,
          plan: customerAccount.plan + extensionRequest.requestedDays
        })

        // Update code request based on license source
        if (extensionRequest.licenseSource === 'codeRequest' || extensionRequest.licenseSource === 'both') {
          if (extensionRequest.codeId) {
            await CodeRequest.findByIdAndUpdate(extensionRequest.codeId._id, {
              plan: extensionRequest.codeId.plan + extensionRequest.requestedDays,
              expiresAt: newExpiryDate
            })
            console.log('Updated CodeRequest for license:', extensionRequest.licenseCode)
          } else {
            console.log('Warning: licenseSource indicates CodeRequest but codeId is null')
          }
        } else if (extensionRequest.licenseSource === 'customerAccount') {
          console.log('Customer account only license - no CodeRequest to update')
        }

        // Update extension request
        await ExtensionRequest.findByIdAndUpdate(requestId, {
          status: 'approved',
          processedAt: new Date(),
          processedBy: 'admin'
        })

        console.log('Extension approved and processed:', {
          requestId,
          licenseCode: extensionRequest.licenseCode,
          extendedDays: extensionRequest.requestedDays,
          newExpiry: newExpiryThai
        })

        // Emit WebSocket updates
        try {
          await emitCustomerAccountUpdate(extensionRequest.userId.toString(), {
            accountId: customerAccount._id,
            license: extensionRequest.licenseCode,
            expireDate: newExpiryThai,
            status: 'valid',
            action: 'extended',
            extendedDays: extensionRequest.requestedDays,
            extendedBy: 'admin'
          })

          await emitExtensionRequestUpdate({
            requestId: extensionRequest._id,
            licenseCode: extensionRequest.licenseCode,
            action: 'approved',
            status: 'approved',
            extendedDays: extensionRequest.requestedDays
          })

          await emitNotificationToAdminAndClient(
            extensionRequest.userId.toString(),
            `🎉 Your extension request for ${extensionRequest.licenseCode} has been approved! Extended by ${extensionRequest.requestedDays} days.`,
            'success'
          )
        } catch (wsError) {
          console.error('WebSocket emission error:', wsError)
          // Don't fail the main request if WebSocket fails
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Extension request approved and processed successfully',
            licenseCode: extensionRequest.licenseCode,
            oldExpiry: customerAccount.expireDate,
            newExpiry: newExpiryThai,
            extendedDays: extensionRequest.requestedDays
          }),
          { status: 200 }
        )
      } catch (extensionError) {
        console.error('Error processing extension:', extensionError)
        return new Response(
          JSON.stringify({ error: 'Failed to process extension' }),
          { status: 500 }
        )
      }
    } else if (action === 'reject') {
      // Reject the extension request
      await ExtensionRequest.findByIdAndUpdate(requestId, {
        status: 'rejected',
        processedAt: new Date(),
        processedBy: 'admin',
        rejectionReason: rejectionReason
      })

      console.log('Extension rejected:', {
        requestId,
        licenseCode: extensionRequest.licenseCode,
        reason: rejectionReason
      })

      // Emit WebSocket notifications for rejection
      try {
        await emitExtensionRequestUpdate({
          requestId: extensionRequest._id,
          licenseCode: extensionRequest.licenseCode,
          action: 'rejected',
          status: 'rejected',
          rejectionReason: rejectionReason
        })

        await emitNotificationToAdminAndClient(
          extensionRequest.userId.toString(),
          `❌ Your extension request for ${extensionRequest.licenseCode} has been rejected. Reason: ${rejectionReason}`,
          'error'
        )
      } catch (wsError) {
        console.error('WebSocket emission error:', wsError)
        // Don't fail the main request if WebSocket fails
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Extension request rejected',
          licenseCode: extensionRequest.licenseCode,
          rejectionReason: rejectionReason
        }),
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Error processing extension request:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// DELETE - Delete extension request
export async function DELETE(request) {
  try {
    console.log('Admin delete extension request API called')

    // Verify admin authentication
    if (!(await verifyAdmin(request))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }

    const { requestId } = await request.json()

    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Request ID is required' }), {
        status: 400
      })
    }

    await connectToDatabase()

    const deletedRequest = await ExtensionRequest.findByIdAndDelete(requestId)

    if (!deletedRequest) {
      return new Response(
        JSON.stringify({ error: 'Extension request not found' }),
        { status: 404 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Extension request deleted successfully'
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting extension request:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
