import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/userModel';
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


export async function POST(req) {
  try {
    // Decrypt request body (automatically handles both encrypted and plain requests)

    const body = await decryptRequestBody(req)
    const { email, token } =body;
    
    if (!email || !token) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Email and verification token are required' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Email and verification token are required' }), { status: 400 });
    }
    
    await connectToDatabase();

    const user = await User.findOne({ 
      email,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Invalid or expired verification token' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Invalid or expired verification token' }), { status: 400 });
    }

    // Update user as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ 
      message: 'Email verified successfully'
    }, 200)
    }
    
    return new Response(JSON.stringify({ 
      message: 'Email verified successfully'
    }), { status: 200 });
    
  } catch (error) {
    console.error('Email verification error:', error);
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Internal server error' }, 500)
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}