import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/userModel';

export async function POST(req) {
  try {
    const { email, token } = await req.json();
    
    if (!email || !token) {
      return new Response(JSON.stringify({ error: 'Email and verification token are required' }), { status: 400 });
    }
    
    await connectToDatabase();

    const user = await User.findOne({ 
      email,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired verification token' }), { status: 400 });
    }

    // Update user as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return new Response(JSON.stringify({ 
      message: 'Email verified successfully'
    }), { status: 200 });
    
  } catch (error) {
    console.error('Email verification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}