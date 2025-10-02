import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'

export async function POST(req) {
  try {
    // Create response
    const response = new Response(JSON.stringify({ 
      message: 'Logged out successfully'
    }), { status: 200 });

    // Clear both possible auth cookies (current and legacy names)
    response.headers.set('Set-Cookie', [
      `auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`,
      `auth-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`
    ]);

    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Internal server error' }, 500)
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}