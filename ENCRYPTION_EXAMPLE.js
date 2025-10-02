/**
 * EXAMPLE: How to use encryption in API routes
 * 
 * This file demonstrates how to update the add-credits API route to support encrypted requests.
 * You can apply the same pattern to other API routes.
 */

import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import PointTransaction from '@/lib/pointTransactionModel'
import { emitPointsUpdate } from '@/lib/websocket'
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'

export async function POST(request) {
  try {
    // Verify admin authentication via cookie
    const adminSession = request.cookies.get('admin-session')?.value
    if (adminSession !== 'authenticated') {
      return new Response(
        JSON.stringify({ error: 'Admin authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Decrypt request body (automatically handles both encrypted and plain requests)
    const body = await decryptRequestBody(request)
    const { username, credits, reason } = body

    // ... rest of your validation and logic ...
    
    // At the end, check if client wants encrypted response
    const wantsEncryptedResponse = request.headers.get('X-Encrypted') === 'true'
    
    const responseData = {
      success: true,
      data: {
        username: user.username,
        oldBalance,
        newBalance,
        creditsChanged: creditsAmount,
        transaction: {
          id: transaction._id,
          type: transaction.type,
          createdAt: transaction.createdAt
        }
      }
    }
    
    // Return encrypted or plain response based on request header
    if (wantsEncryptedResponse) {
      return createEncryptedResponse(responseData)
    } else {
      return new Response(
        JSON.stringify(responseData),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error) {
    console.error('Error adding credits:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to add credits',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * ALTERNATIVE: Using withEncryption wrapper (simpler approach)
 */

// import { withEncryption } from '@/lib/encryptionMiddleware'
// 
// export const POST = withEncryption(async (body, request) => {
//   // Verify admin authentication
//   const adminSession = request.cookies.get('admin-session')?.value
//   if (adminSession !== 'authenticated') {
//     return { error: 'Admin authentication required', status: 401 }
//   }
//   
//   const { username, credits, reason } = body
//   
//   // ... your logic here ...
//   
//   return {
//     success: true,
//     data: { ... }
//   }
// })
