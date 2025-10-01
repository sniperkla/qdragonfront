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

    // Current cookie name used by login route is auth_token.
    // For backward compatibility also check legacy name auth-token.
    const token = cookies['auth_token'] || cookies['auth-token']
    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    // Normalize the user ID property for consistency
    const result = {
      ...decoded,
      id: decoded.id || decoded.userId
    }
    console.log('Auth token decoded:', {
      userId: result.id,
      username: result.username
    })
    return result
  } catch (error) {
    return null
  }
}
