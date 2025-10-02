import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/userModel';
import bcrypt from 'bcryptjs';
import { decryptRequestBody, createEncryptedResponse } from '@/lib/encryptionMiddleware'


export async function POST(req) {
  try {
    // Decrypt request body (automatically handles both encrypted and plain requests)

    const body = await decryptRequestBody(req)
    const { username, password } =body;
    
    // Input validation
    if (!username || !password) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Username and password are required' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400 });
    }
    
    if (username.length < 3) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Username must be at least 3 characters' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Username must be at least 3 characters' }), { status: 400 });
    }
    
    if (password.length < 6) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Password must be at least 6 characters' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400 });
    }
    
    await connectToDatabase();

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'User already exists' }, 400)
    }
    
    return new Response(JSON.stringify({ error: 'User already exists' }), { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds for better security
    const user = new User({ username, password: hashedPassword });
    await user.save();

    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ message: 'User registered successfully' }, 201)
    }
    
    return new Response(JSON.stringify({ message: 'User registered successfully' }), { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    // Check if client wants encrypted response
    const wantsEncrypted = req?.headers?.get('X-Encrypted') === 'true'
    
    if (wantsEncrypted) {
      return createEncryptedResponse({ error: 'Internal server error' }, 500)
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
