export async function GET(request) {
  try {
    console.log('🔍 Environment debug request')
    
    return new Response(
      JSON.stringify({
        nodeEnv: process.env.NODE_ENV,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        hasSocketIO: !!global.__socketIO,
        socketClients: global.__socketIO?.engine?.clientsCount || 0,
        windowLocation: typeof window !== 'undefined' ? window.location.href : 'server-side',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ Environment debug error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
}