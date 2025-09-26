import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/userModel';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    
    // Input validation
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400 });
    }
    
    if (username.length < 3 || password.length < 6) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }
    
    await connectToDatabase();

    const user = await User.findOne({ username });
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return new Response(JSON.stringify({ 
        error: 'Email not verified',
        requiresVerification: true,
        email: user.email,
        username: user.username
      }), { status: 403 });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Create response with cookie
    const response = new Response(JSON.stringify({ 
      message: 'Login successful',
      user: { id: user._id, username: user.username }
    }), { status: 200 });

    // Set secure cookie
    response.headers.set('Set-Cookie', `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`);

    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}