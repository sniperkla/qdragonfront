export async function POST(req) {
  try {
    // Create response
    const response = new Response(JSON.stringify({ 
      message: 'Logged out successfully'
    }), { status: 200 });

    // Clear the auth cookie
    response.headers.set('Set-Cookie', `auth-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`);

    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}