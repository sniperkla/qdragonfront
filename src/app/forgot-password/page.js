'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Inline debug logger
const debugLogger = {
  log: (message, data = {}) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      message,
      data,
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    }
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
    const logEntry = {
      timestamp,
      level: 'ERROR',
      message,
      error: { message: error.message, stack: error.stack },
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    }
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [needsRegistration, setNeedsRegistration] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setNeedsRegistration(false)
    setIsLoading(true)

    debugLogger.log('Forgot password request started', { email })

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      debugLogger.log('Forgot password API response', {
        status: res.status,
        success: res.ok,
        requiresVerification: data.requiresVerification,
        requiresRegistration: data.requiresRegistration
      })

      if (res.ok) {
        setMessage(data.message)
        setIsSuccess(true)
        debugLogger.log('Password reset email request successful')
      } else if (res.status === 404 && data.requiresRegistration) {
        setError('No account found with this email address.')
        setNeedsRegistration(true)
        setIsSuccess(false)
        debugLogger.log('User attempted password reset for unregistered email')
      } else if (res.status === 403 && data.requiresVerification) {
        setError(
          'Please verify your email address first before requesting a password reset.'
        )
        debugLogger.log('Email verification required before password reset')
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
        }, 3000)
      } else {
        setError(data.error || 'Failed to send password reset email')
        debugLogger.error('Password reset request failed', {
          error: data.error
        })
      }
    } catch (error) {
      debugLogger.error('Password reset network error', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = () => {
    debugLogger.log('Create account button clicked from forgot password')
    router.push('/register')
  }

  const handleBackToLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900 to-black flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-amber-500/10"></div>

      {/* Forgot Password Card */}
      <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-yellow-200 mx-auto">
        {/* Header */}
        <div className="text-center pt-6 sm:pt-8 pb-4 sm:pb-6 px-6 sm:px-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full mb-3 sm:mb-4 shadow-lg">
            <span className="text-xl sm:text-2xl font-bold text-white">Q</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Q-DRAGON
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">Forgot Password</p>
          <p className="text-xs sm:text-sm text-yellow-600 font-medium mt-1 sm:mt-2">
            Reset Your Trading Account Password
          </p>
        </div>

        {/* Form Content */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition duration-200 pl-12 text-sm sm:text-base text-gray-900 placeholder-gray-500"
                    placeholder="Enter your email address"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      ></path>
                    </svg>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
                  Enter the email address associated with your Q-DRAGON account
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    {error}
                  </div>
                  {needsRegistration && (
                    <div className="mt-3">
                      <button
                        onClick={handleCreateAccount}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 sm:py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center text-sm sm:text-base"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                          ></path>
                        </svg>
                        Create New Account
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 sm:py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      ></path>
                    </svg>
                    Send Reset Link
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Success Message */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Check Your Email
              </h3>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700">
                  <strong>Next Steps:</strong>
                  <br />
                  1. Check your email inbox
                  <br />
                  2. Click the password reset link
                  <br />
                  3. Create a new password
                  <br />
                  4. Log in with your new password
                </p>
              </div>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Remember your password?
                </span>
              </div>
            </div>

            <button
              onClick={handleBackToLogin}
              className="w-full mt-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg border-2 border-gray-300 hover:border-yellow-400 transition duration-200 flex items-center justify-center text-sm sm:text-base"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                ></path>
              </svg>
              Back to Login
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 text-center text-xs text-gray-500">
            <p className="leading-relaxed">
              Secure Password Reset • Q-DRAGON Trading Platform
            </p>
            <p className="mt-1">© 2025 Q-Dragon Trading Platform</p>
          </div>
        </div>
      </div>

      {/* Debug Button */}
      {(process.env.NODE_ENV === 'development' ||
        (typeof window !== 'undefined' &&
          window.location.search.includes('debug=true'))) && (
        <button
          onClick={() => {
            const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]')
            console.log('📋 Debug Logs:', logs)
            alert(
              `Debug logs (${logs.length} entries) - Check browser console for details`
            )
          }}
          className="fixed bottom-4 right-4 z-50 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-mono hover:bg-red-600 transition-colors"
          title="Show Debug Logs"
        >
          🔍 DEBUG
        </button>
      )}

      {/* Decorative Elements */}
      <div className="absolute top-4 sm:top-10 left-4 sm:left-10 w-12 h-12 sm:w-20 sm:h-20 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      <div className="absolute top-4 sm:top-10 right-4 sm:right-10 w-12 h-12 sm:w-20 sm:h-20 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
      <div className="absolute bottom-4 sm:bottom-10 left-8 sm:left-20 w-12 h-12 sm:w-20 sm:h-20 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
    </div>
  )
}
