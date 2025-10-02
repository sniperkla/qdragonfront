import { connectToDatabase } from '@/lib/mongodb'
import CustomerAccount from '@/lib/customerAccountModel'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


// Get all customer accounts (admin only)
export async function GET(req) {
  try {
    // Check admin authentication via cookie
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Admin authentication required' }, 401)
    }
    
    return new Response(JSON.stringify({ error: 'Admin authentication required' }), { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'
    const user = searchParams.get('user')

    await connectToDatabase()

    let query = {}

    if (user) {
      query.user = { $regex: user, $options: 'i' }
    }

    if (status !== 'all') {
      query.status = status
    }

    const customerAccounts = await CustomerAccount.find(query)
      .sort({ createdAt: -1 })
      .limit(100)

    // Check for expired accounts and update status
    const now = new Date()
    const expiredAccounts = []

    for (const account of customerAccounts) {
      const expireDate = new Date(account.expireDate)
      if (expireDate < now && account.status === 'valid') {
        account.status = 'expired'
        await account.save()
        expiredAccounts.push(account.license)
      }
    }

    if (expiredAccounts.length > 0) {
      console.log(
        `Updated ${expiredAccounts.length} expired accounts:`,
        expiredAccounts
      )
    }

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        total: customerAccounts.length,
        accounts: customerAccounts
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        total: customerAccounts.length,
        accounts: customerAccounts
      }), { status: 200 })
  } catch (error) {
    console.error('Admin customer accounts fetch error:', error)
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Internal server error' }, 500)
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// Update customer account status (admin only)
export async function PUT(req) {
  try {
    // Check admin authentication via cookie
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Admin authentication required' }, 401)
    }
    
    return new Response(JSON.stringify({ error: 'Admin authentication required' }), { status: 401 })
    }

    // Decrypt request body (automatically handles both encrypted and plain requests)


    const body = await decryptRequestBody(req)
    const { accountId, status, expireDate } =body

    if (!accountId || !status) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Account ID and status are required' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Account ID and status are required' }), { status: 400 })
    }

    await connectToDatabase()

    const updateData = { status }

    if (expireDate) {
      updateData.expireDate = expireDate
    }

    const customerAccount = await CustomerAccount.findByIdAndUpdate(
      accountId,
      updateData,
      { new: true }
    )

    if (!customerAccount) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Customer account not found' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'Customer account not found' }), { status: 404 })
    }

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        message: 'Customer account status updated successfully',
        account: customerAccount
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        message: 'Customer account status updated successfully',
        account: customerAccount
      }), { status: 200 })
  } catch (error) {
    console.error('Admin customer account update error:', error)
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Internal server error' }, 500)
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}

// Delete customer account (admin only)
export async function DELETE(req) {
  try {
    // Check admin authentication via cookie
    const adminSession = req.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Admin authentication required' }, 401)
    }
    
    return new Response(JSON.stringify({ error: 'Admin authentication required' }), { status: 401 })
    }

    // Decrypt request body (automatically handles both encrypted and plain requests)


    const body = await decryptRequestBody(req)
    const { accountId } =body

    if (!accountId) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Account ID is required' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Account ID is required' }), {
        status: 400
      })
    }

    await connectToDatabase()

    const accountToDelete = await CustomerAccount.findById(accountId)
    const deletedAccount = await CustomerAccount.findByIdAndDelete(accountId)

    if (!deletedAccount) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Customer account not found' }, 404)
    }
    
    return new Response(JSON.stringify({ error: 'Customer account not found' }), { status: 404 })
    }

    // Also delete associated code request if exists
    try {
      const CodeRequest = (await import('@/lib/codeRequestModel')).default
      await CodeRequest.deleteOne({ code: deletedAccount.license })
    } catch (codeError) {
      console.error('Error deleting associated code request:', codeError)
      // Don't fail the main request if code request deletion fails
    }

    // WebSocket notify user if possible
    try {
      if (accountToDelete) {
        // Attempt to find userId by username (account.user stores username)
        let userId = null
        try {
          const User = (await import('@/lib/userModel')).default
          const u = await User.findOne(
            { username: accountToDelete.user },
            '_id'
          )
          if (u) userId = u._id.toString()
        } catch (uErr) {
          console.warn(
            'Lookup user for account delete emission failed:',
            uErr.message
          )
        }
        if (userId) {
          const {
            emitCodesUpdate,
            emitCustomerAccountUpdate,
            emitNotificationToAdminAndClient
          } = await import('@/lib/websocket')
          await emitCodesUpdate(userId, {
            action: 'account-deleted',
            license: accountToDelete.license
          })
          await emitCustomerAccountUpdate(userId, {
            action: 'account-deleted',
            license: accountToDelete.license
          })
          await emitNotificationToAdminAndClient(
            userId,
            `Your license account ${accountToDelete.license} was deleted by admin`,
            'warning'
          )
        }
      }
    } catch (emitErr) {
      console.warn(
        'WebSocket emission on customer delete failed (non-fatal):',
        emitErr.message
      )
    }

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({
        success: true,
        message: 'Customer account deleted successfully',
        account: deletedAccount
      }, 200)
    }
    
    return new Response(JSON.stringify({
        success: true,
        message: 'Customer account deleted successfully',
        account: deletedAccount
      }), { status: 200 })
  } catch (error) {
    console.error('Admin customer account delete error:', error)
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Internal server error' }, 500)
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
