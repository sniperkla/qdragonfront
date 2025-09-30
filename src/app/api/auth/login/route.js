import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/userModel'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// POST /api/auth/login
export async function POST(req) {
	try {
		const { username, password } = await req.json()

		if (!username || !password) {
			return new Response(JSON.stringify({ error: 'Username and password required' }), { status: 400 })
		}

		await connectToDatabase()
		const user = await User.findOne({ username })
		if (!user) {
			return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
		}

		// Check email verification
		if (!user.isEmailVerified) {
			return new Response(
				JSON.stringify({
					error: 'Email not verified',
					requiresVerification: true,
					email: user.email,
					username: user.username
				}),
				{ status: 403 }
			)
		}

		const passwordMatch = await bcrypt.compare(password, user.password)
		if (!passwordMatch) {
			return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
		}

		// Issue JWT (httpOnly cookie)
		const token = jwt.sign(
			{ id: user._id.toString(), username: user.username },
			process.env.JWT_SECRET || 'dev_secret',
			{ expiresIn: '7d' }
		)

		const headers = new Headers()
		headers.append(
			'Set-Cookie',
			`auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
		)

		return new Response(
			JSON.stringify({
				success: true,
				user: { id: user._id.toString(), username: user.username, email: user.email, preferredLanguage: user.preferredLanguage }
			}),
			{ status: 200, headers }
		)
	} catch (err) {
		console.error('Login error:', err)
		return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
	}
}
