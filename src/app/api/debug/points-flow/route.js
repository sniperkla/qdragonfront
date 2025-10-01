import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import TopUp from '@/lib/topUpModel'
import { verifyAuth } from '@/lib/auth'

// Show the complete points flow and storage locations
export async function GET(req) {
  try {
    const authResult = verifyAuth(req)
    if (!authResult) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }

    await connectToDatabase()

    // Get user data
    const user = await User.findById(authResult.id)
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404
      })
    }

    // Get user's top-up history
    const topUps = await TopUp.find({ userId: authResult.id })
      .sort({ createdAt: -1 })
      .limit(10)

    // Calculate expected points based on approved top-ups
    const approvedTopUps = topUps.filter((t) => t.status === 'approved')
    const expectedPoints = approvedTopUps.reduce(
      (sum, t) => sum + (t.points || 0),
      0
    )

    console.log(`POINTS FLOW ANALYSIS for ${user.username}:`)
    console.log(`- Current points in User table: ${user.points}`)
    console.log(`- Approved top-ups: ${approvedTopUps.length}`)
    console.log(`- Expected total points: ${expectedPoints}`)
    console.log(`- Points match: ${user.points === expectedPoints}`)

    return new Response(
      JSON.stringify({
        success: true,
        pointsFlow: {
          // WHERE POINTS ARE STORED
          storage: {
            collection: 'users',
            field: 'points',
            currentValue: user.points,
            dataType: typeof user.points
          },

          // POINTS CALCULATION
          calculation: {
            approvedTopUps: approvedTopUps.length,
            expectedPoints: expectedPoints,
            actualPoints: user.points,
            pointsMatch: user.points === expectedPoints
          },

          // TOP-UP HISTORY
          topUpHistory: topUps.map((t) => ({
            id: t._id,
            amount: t.amount,
            points: t.points,
            status: t.status,
            createdAt: t.createdAt,
            processedAt: t.processedAt
          })),

          // DATABASE OPERATIONS
          operations: {
            topUpSubmission:
              'Creates record in TopUp collection with status: pending',
            adminApproval: 'Updates User.points using $inc operator in MongoDB',
            pointsRetrieval: 'Read from User.points field via /api/auth/me'
          }
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Points flow analysis error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
