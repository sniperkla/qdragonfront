import { verifyAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/userModel';

export async function GET(req) {
  try {
    const authData = verifyAuth(req);
    
    if (!authData) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(authData.id).select('-password');
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ 
      user: { 
        id: user._id, 
        username: user.username 
      } 
    }), { status: 200 });
    
  } catch (error) {
    console.error('User verification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}