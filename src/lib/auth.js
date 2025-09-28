import jwt from 'jsonwebtoken'

export function verifyAuth(request) {
  try {
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return null
    }

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {})

    const token = cookies['auth-token']
    if (!token) {
      return null
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    )
    // Normalize the user ID property for consistency
    return {
      ...decoded,
      id: decoded.userId || decoded.id
    }
  } catch (error) {
    return null
  }
}
