export async function GET() {
  return new Response(JSON.stringify({ error: 'Endpoint disabled' }), {
    status: 404
  })
}
