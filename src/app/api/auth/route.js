import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/userModel';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    
    // Input validation
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400 });
    }
    
    if (username.length < 3) {
      return new Response(JSON.stringify({ error: 'Username must be at least 3 characters' }), { status: 400 });
    }
    
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400 });
    }
    
    await connectToDatabase();

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User already exists' }), { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds for better security
    const user = new User({ username, password: hashedPassword });
    await user.save();

    return new Response(JSON.stringify({ message: 'User registered successfully' }), { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
