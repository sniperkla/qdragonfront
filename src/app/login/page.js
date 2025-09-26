'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../../store/slices/authSlice'

// Inline debug logger
const debugLogger = {
  log: (message, data = {}) => {
    const timestamp = new Date().toISOString()
    const logEntry = { timestamp, message, data, url: typeof window !== 'undefined' ? window.location.href : 'server' }
    console.log('🔍 DEBUG:', logEntry)
    if (process.env.NODE_ENV === 'production') {
      try {
        const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]')
        logs.push(logEntry)
        if (logs.length > 50) logs.shift()
        localStorage.setItem('debug_logs', JSON.stringify(logs))
      } catch (error) {
        console.warn('Failed to store debug log:', error)
      }
    }
  },
  error: (message, error = {}) => {
    const timestamp = new Date().toISOString()
    const logEntry = { timestamp, level: 'ERROR', message, error: { message: error.message, stack: error.stack }, url: typeof window !== 'undefined' ? window.location.href : 'server' }
    console.error('❌ ERROR:', logEntry)
    if (process.env.NODE_ENV === 'production') {
      try {
        const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]')
        logs.push(logEntry)
        if (logs.length > 50) logs.shift()
        localStorage.setItem('debug_logs', JSON.stringify(logs))
      } catch (err) {
        console.warn('Failed to store error log:', err)
      }
    }
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const dispatch = useDispatch()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    debugLogger.log('Login attempt started', { username })
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password
        })
      })
      const data = await res.json()
      
      debugLogger.log('Login API response received', { 
        status: res.status, 
        ok: res.ok, 
        requiresVerification: data.requiresVerification,
        hasEmail: !!data.email
      })
      
      if (res.ok) {
        // Update Redux state with user data
        const userData = {
          id: Date.now(),
          name: username,
          email: username // Using username as email for now
        }
        dispatch(loginSuccess(userData))
        debugLogger.log('Login successful, redirecting to landing')
        router.push('/landing') // Redirect to landing page after successful login
      } else if (res.status === 403 && data.requiresVerification) {
        // User needs to verify email - redirect to verification page
        debugLogger.log('Email verification required, redirecting to verify-email', {
          email: data.email,
          username: data.username
        })
        const verifyUrl = `/verify-email?email=${encodeURIComponent(data.email)}&username=${encodeURIComponent(data.username)}`
        debugLogger.log('Verify URL created', { verifyUrl })
        router.push(verifyUrl)
      } else {
        debugLogger.error('Login failed', { status: res.status, error: data.error })
        setError(data.error || 'Username or password incorrect')
      }
    } catch (error) {
      debugLogger.error('Login network error', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = () => {
    router.push('/register')
  }

  const handleForgotPassword = () => {
    // TODO: Implement forgot password functionality
    alert('Forgot password feature will be implemented soon!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900 to-black flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-amber-500/10"></div>
      
      {/* Login Card */}
      <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-yellow-200">
        {/* Header */}
        <div className="text-center pt-8 pb-6 px-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">Q</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Q-DRAGON</h1>
          <p className="text-gray-600">Gold Trading Platform</p>
          <p className="text-sm text-yellow-600 font-medium">XAU/USD Professional Trading</p>
        </div>

        {/* Login Form */}
        <div className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition duration-200 pl-12"
                  placeholder="Enter your username"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition duration-200 pl-12"
                  placeholder="Enter your password"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                  </svg>
                  Sign In to Trade
                </>
              )}
            </button>
          </form>

          {/* Action Buttons */}
          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to Q-Dragon?</span>
              </div>
            </div>

            <button
              onClick={handleRegister}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg border-2 border-gray-300 hover:border-yellow-400 transition duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
              </svg>
              Create New Account
            </button>

            <button
              onClick={handleForgotPassword}
              className="w-full text-yellow-600 hover:text-yellow-700 font-medium py-2 transition duration-200 flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Forgot Password?
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>Secure • Professional • Reliable</p>
            <p className="mt-1">© 2025 Q-Dragon Trading Platform</p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      <div className="absolute top-10 right-10 w-20 h-20 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
      <div className="absolute bottom-10 left-20 w-20 h-20 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
      
      {/* Debug Button */}
      {(process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.search.includes('debug=true'))) && (
        <button
          onClick={() => {
            const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]')
            console.log('📋 Debug Logs:', logs)
            alert(`Debug logs (${logs.length} entries) - Check browser console for details`)
          }}
          className="fixed bottom-4 right-4 z-50 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-mono hover:bg-red-600 transition-colors"
          title="Show Debug Logs"
        >
          🔍 DEBUG
        </button>
      )}
    </div>
  )
}
