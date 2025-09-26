import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/userModel';
import { sendVerificationEmail } from '@/lib/emailService';

export async function POST(req) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
    }
    
    await connectToDatabase();

    const user = await User.findOne({ email });

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    if (user.isEmailVerified) {
      return new Response(JSON.stringify({ error: 'Email is already verified' }), { status: 400 });
    }

    // Generate new verification token
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    const emailResult = await sendVerificationEmail(email, user.username, verificationToken);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return new Response(JSON.stringify({ 
        error: 'Failed to send verification email. Please try again later.'
      }), { status: 500 });
    }

    return new Response(JSON.stringify({ 
      message: 'Verification email sent successfully'
    }), { status: 200 });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}