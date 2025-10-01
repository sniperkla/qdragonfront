// Simple test endpoint to verify API connectivity
export async function POST(req) {
  try {
    console.log('🔵 Test top-up API called')
    
    const body = await req.json()
    console.log('📊 Request body:', body)
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Test API is working',
      receivedData: body,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('❌ Test API error:', error)
    return new Response(JSON.stringify({ 
      error: 'Test API failed',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export async function GET(req) {
  return new Response(JSON.stringify({ 
    success: true,
    message: 'Test GET API is working',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}