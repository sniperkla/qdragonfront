import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import bcrypt from 'bcryptjs'
import { sendVerificationEmail } from '@/lib/emailService'

export async function POST(req) {
  try {
  const { username, email, password, language } = await req.json()

    // Input validation
    if (!username || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Username, email, and password are required' }),
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Username must be at least 3 characters' }),
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid email address' }),
        { status: 400 }
      )
    }

    await connectToDatabase()

    // Check if username already exists
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Username already exists' }),
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user with email verification token
    const verificationToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)

    const user = new User({
      username,
      email,
      password: hashedPassword,
      preferredLanguage: (language === 'th' ? 'th' : 'en'),
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    })

    await user.save()

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email,
      username,
      verificationToken,
      language || 'en'
    )

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      // Don't fail registration if email fails, but log the error
    }

    return new Response(
      JSON.stringify({
        message:
          'Registration successful. Please check your email to verify your account.',
        requiresEmailVerification: true,
        emailSent: emailResult.success
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    })
  }
}
