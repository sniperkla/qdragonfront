import { decrypt, encrypt, isEncrypted } from './encryption'

/**
 * Middleware to handle encrypted request bodies
 * Use this in API routes to automatically decrypt incoming encrypted payloads
 * 
 * @param {Request} request - Next.js Request object
 * @returns {Promise<object>} - Decrypted request body
 */
export async function decryptRequestBody(request) {
  try {
    // Check if request has encrypted flag
    const isEncryptedRequest = request.headers.get('X-Encrypted') === 'true'
    
    if (!isEncryptedRequest) {
      // Not encrypted, return body as-is
      const body = await request.json()
      return body
    }
    
    // Parse the request body
    const body = await request.json()
    
    // Check if body has encrypted field
    if (!body.encrypted) {
      throw new Error('Encrypted header set but no encrypted data found')
    }
    
    // Decrypt the data
    const decryptedData = decrypt(body.encrypted)
    
    return decryptedData
  } catch (error) {
    console.error('Error decrypting request body:', error)
    throw new Error('Failed to decrypt request body: ' + error.message)
  }
}

/**
 * Create an encrypted response
 * 
 * @param {object} data - Data to encrypt and send
 * @param {number} status - HTTP status code
 * @returns {Response} - Next.js Response object with encrypted data
 */
export function createEncryptedResponse(data, status = 200) {
  try {
    // Encrypt the data
    const encryptedData = encrypt(data)
    
    return new Response(
      JSON.stringify({ encrypted: encryptedData }),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          'X-Encrypted': 'true'
        }
      }
    )
  } catch (error) {
    console.error('Error creating encrypted response:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to encrypt response' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Wrapper for API route handlers with automatic encryption/decryption
 * 
 * @param {Function} handler - Async function(decryptedBody, request) that returns data
 * @returns {Function} - API route handler
 * 
 * @example
 * export const POST = withEncryption(async (body, request) => {
 *   // body is automatically decrypted
 *   const { username, password } = body
 *   // ... your logic here
 *   return { success: true, data: result }
 * })
 */
export function withEncryption(handler) {
  return async (request) => {
    try {
      // Decrypt request body
      const decryptedBody = await decryptRequestBody(request)
      
      // Call the handler with decrypted data
      const result = await handler(decryptedBody, request)
      
      // Check if request wants encrypted response
      const wantsEncryptedResponse = request.headers.get('X-Encrypted') === 'true'
      
      if (wantsEncryptedResponse && result && !result.error) {
        // Return encrypted response
        return createEncryptedResponse(result)
      } else {
        // Return normal response
        return new Response(
          JSON.stringify(result),
          {
            status: result.error ? (result.status || 400) : 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (error) {
      console.error('Encryption middleware error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Request processing failed',
          details: error.message 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * Simplified version for routes that need manual control
 */
export { decrypt, encrypt, isEncrypted }
