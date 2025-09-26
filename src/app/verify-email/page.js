'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Inline debug logger to avoid import issues
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

function VerifyEmailContent() {
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fromLogin, setFromLogin] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    debugLogger.log('Verify email page loaded', {
      currentUrl: window.location.href,
      searchParams: window.location.search,
      pathname: window.location.pathname,
      referrer: document.referrer
    })
    
    try {
      const emailParam = searchParams.get('email')
      const usernameParam = searchParams.get('username')
      
      debugLogger.log('Processing URL parameters', { 
        emailParam,
        usernameParam,
        allParams: Object.fromEntries(searchParams.entries())
      })
      
      // Check if user came from login (has both email and username parameters)
      if (emailParam && usernameParam) {
        setFromLogin(true)
        debugLogger.log('User came from login - email verification required')
      }
      
      if (emailParam) {
        const decodedEmail = decodeURIComponent(emailParam)
        debugLogger.log('Email successfully decoded', { 
          original: emailParam,
          decoded: decodedEmail 
        })
        setEmail(decodedEmail)
      } else {
        debugLogger.error('No email parameter found in URL', {
          searchParamsString: searchParams.toString(),
          windowSearch: window.location.search,
          allParams: Object.fromEntries(searchParams.entries())
        })
        setError('No email address provided. Please register again.')
      }
    } catch (error) {
      debugLogger.error('Error processing URL parameters', error)
      setError('Error loading verification page. Please try again.')
    }
  }, [searchParams])

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token: verificationCode
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (fromLogin) {
          setMessage('Email verified successfully! You can now log in.')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else {
          setMessage('Email verified successfully! Redirecting to login...')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        }
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Verification email sent! Please check your inbox.')
      } else {
        setError(data.error || 'Failed to resend verification')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900 to-black flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-amber-500/10"></div>
      
      {/* Verification Card */}
      <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-yellow-200">
        {/* Header */}
        <div className="text-center pt-8 pb-6 px-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          {fromLogin ? (
            <>
              <p className="text-gray-600">Email verification required to access your account</p>
              <p className="text-sm text-amber-600 font-medium mt-2">⚠️ You must verify your email before logging in</p>
            </>
          ) : (
            <>
              <p className="text-gray-600">Complete your Q-DRAGON account setup</p>
              <p className="text-sm text-yellow-600 font-medium mt-2">Check your email for the verification code</p>
            </>
          )}
        </div>

        {/* Verification Form */}
        <div className="px-8 pb-8">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition duration-200 pl-12 bg-gray-50"
                  placeholder="Your email address"
                  readOnly
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition duration-200 pl-12"
                  placeholder="Enter verification code"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-6a2 2 0 01-2-2V9a2 2 0 012-2h2z"></path>
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Check your email inbox and spam folder</p>
            </div>

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
                {message}
              </div>
            )}

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
                  Verifying...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Verify Email
                </>
              )}
            </button>
          </form>

          {/* Resend Button */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">Didn't receive the code?</p>
            <button
              onClick={handleResendVerification}
              disabled={isLoading}
              className="text-yellow-600 hover:text-yellow-700 font-medium py-2 transition duration-200 disabled:opacity-50"
            >
              Resend Verification Email
            </button>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-gray-600 hover:text-gray-700 font-medium py-2 transition duration-200"
            >
              ← Back to Login
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>Verification link expires in 24 hours</p>
            <p className="mt-1">© 2025 Q-Dragon Trading Platform</p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      <div className="absolute top-10 right-10 w-20 h-20 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    }>
      <VerifyEmailContent />
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
    </Suspense>
  )
}