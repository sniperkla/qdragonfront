'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../../store/slices/authSlice'
import { encryptedFetch } from '@/lib/clientEncryption'

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

export default function LoginPage() {
  const { t, language, changeLanguage } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authSlow, setAuthSlow] = useState(false)
  const authAbortRef = useRef(null)
  const router = useRouter()
  const dispatch = useDispatch()

  const normalizePoints = (value) => {
    const numeric = Number(value ?? 0)
    if (Number.isNaN(numeric) || numeric < 0) return 0
    return numeric
  }

  // Check if user is already authenticated
  useEffect(() => {
    const controller = new AbortController()
    authAbortRef.current = controller
    const timeoutId = setTimeout(() => setAuthSlow(true), 4000)

    const checkAuth = async () => {
      try {
        debugLogger.log('Checking existing authentication')
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal
        })
        if (response.ok) {
          const data = await response.json()
          debugLogger.log(
            'User already authenticated, redirecting to landing',
            { username: data.user.username }
          )
          dispatch(
            loginSuccess({
              id: data.user.id,
              name: data.user.username,
              email: data.user.username,
              points: normalizePoints(data.user.points)
            })
          )
          router.push('/landing')
          return
        } else {
          debugLogger.log(
            'No existing authentication found, showing login form'
          )
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          debugLogger.log('Auth check aborted by user')
        } else {
          debugLogger.error('Auth check error', error)
        }
      } finally {
        setCheckingAuth(false)
        clearTimeout(timeoutId)
      }
    }
    checkAuth()

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [router, dispatch])

  const retryAuthCheck = () => {
    setCheckingAuth(true)
    setAuthSlow(false)
    // trigger effect by changing a dummy state? Simpler: replicate logic here.
    const controller = new AbortController()
    authAbortRef.current = controller
    const timeoutId = setTimeout(() => setAuthSlow(true), 4000)
    ;(async () => {
      try {
        debugLogger.log('Retrying authentication check')
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal
        })
        if (response.ok) {
          const data = await response.json()
          debugLogger.log(
            'User already authenticated (retry), redirecting to landing',
            { username: data.user.username }
          )
          dispatch(
            loginSuccess({
              id: data.user.id,
              name: data.user.username,
              email: data.user.username,
              points: normalizePoints(data.user.points)
            })
          )
          router.push('/landing')
          return
        } else {
          debugLogger.log('Retry auth: still unauthenticated')
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          debugLogger.log('Retry auth check aborted')
        } else {
          debugLogger.error('Retry auth check error', error)
        }
      } finally {
        setCheckingAuth(false)
        clearTimeout(timeoutId)
      }
    })()
  }

  const skipAuthCheck = () => {
    if (authAbortRef.current) authAbortRef.current.abort()
    setCheckingAuth(false)
    setAuthSlow(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    debugLogger.log('Login attempt started', { username })

    try {
      const response = await encryptedFetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          username,
          password
        }
      })

      // Parse response data once
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      debugLogger.log('Login API response received (encrypted)', {
        requiresVerification: data.requiresVerification,
        hasEmail: !!data.email
      })

      if (data.requiresVerification) {
        // User needs to verify email - redirect to verification page
        debugLogger.log(
          'Email verification required, redirecting to verify-email',
          {
            email: data.email,
            username: data.username
          }
        )
        const verifyUrl = `/verify-email?email=${encodeURIComponent(
          data.email
        )}&username=${encodeURIComponent(data.username)}&lang=${language}`
        debugLogger.log('Verify URL created', { verifyUrl })
        router.push(verifyUrl)
      } else {
        // Login successful
        const userData = data?.user
        if (!userData) {
          debugLogger.error('Login succeeded but user payload missing', {
            data
          })
          setError('Login response invalid. Please try again.')
          return
        }

        dispatch(
          loginSuccess({
            id: userData.id,
            name: userData.username,
            email: userData.email || userData.username,
            points: normalizePoints(userData.points),
            preferredLanguage: userData.preferredLanguage
          })
        )
        debugLogger.log('Login successful, redirecting to landing')
        router.push('/landing') // Redirect to landing page after successful login
      }
    } catch (error) {
      debugLogger.error('Login error', error)
      setError(error.message || 'Username or password incorrect')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = () => {
    router.push('/register')
  }

  const handleForgotPassword = () => {
    debugLogger.log('Forgot password link clicked')
    router.push('/forgot-password')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4 overflow-y-auto relative">
      {/* Background Image */}
      <div className="fixed inset-0 w-full h-full">
        <img
          src="/qdragon1.jpg"
          alt="Q-Dragon Background"
          className="w-full h-full object-cover object-center"
          style={{
            minHeight: '100vh',
            minWidth: '100vw',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: -1
          }}
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-amber-500/10"></div>
      </div>

      {/* Login Card (blur and dim if checking auth) */}
      <div
        className={`relative z-10 max-w-md w-full bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 ring-1 ring-white/20 transition-all ${checkingAuth ? 'opacity-40 pointer-events-none scale-[0.98]' : 'opacity-100'} `}
      >
        {/* Header */}
        <div className="text-center pt-6 sm:pt-8 pb-4 sm:pb-6 px-6 sm:px-8">
          <div className="absolute top-3 right-3 flex gap-2">
            {['en', 'th'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => changeLanguage(l)}
                className={`px-2 py-1 text-xs rounded-md font-semibold transition-colors ${language === l ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white hover:bg-white/30'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32  rounded-full mb-3 sm:mb-4 shadow-lg overflow-hidden">
            {/* Logo Image */}
            <img
              src="/logo.png"
              alt="Q-DRAGON Logo"
              onError={(e) => {
                // Fallback to dragon emoji if image fails to load
                e.target.style.display = 'none'
                e.target.nextElementSibling.style.display = 'block'
              }}
            />
            {/* Fallback Dragon Icon */}
            <span className="text-3xl sm:text-4xl hidden">🐉</span>
          </div>
          <p className="text-white/90 text-sm sm:text-base">
            {t('platform_tagline')}
          </p>
          <p className="text-xs sm:text-sm text-yellow-300 font-medium">
            {t('sub_tagline')}
          </p>
        </div>

        {/* Login Form */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-xs sm:text-sm font-medium text-white/90 mb-2"
              >
                {t('username_label')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition duration-200 pl-12 text-sm sm:text-base text-white placeholder-white/60 bg-white/10 backdrop-blur-sm"
                  placeholder={t('username_placeholder')}
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-medium text-white/90 mb-2"
              >
                {t('password_label')}
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition duration-200 pl-12 text-sm sm:text-base text-white placeholder-white/60 bg-white/10 backdrop-blur-sm"
                  placeholder={t('password_placeholder')}
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
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
                {error || t('login_failed')}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
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
                  {t('signing_in')}
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
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    ></path>
                  </svg>
                  <span className="text-white/150">{t('sign_in_cta')}</span>
                </>
              )}
            </button>
          </form>

          {/* Action Buttons */}
          <div className="mt-4 sm:mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-2 bg-white text-black">
                  {t('new_to_platform')}
                </span>
              </div>
            </div>

            <button
              onClick={handleRegister}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg border-2 border-gray-300 hover:border-yellow-400 transition duration-200 flex items-center justify-center text-sm sm:text-base"
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
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                ></path>
              </svg>
              {t('create_new_account')}
            </button>

            <button
              onClick={handleForgotPassword}
              className="w-full text-yellow-300 hover:text-yellow-700 font-medium py-2 transition duration-200 flex items-center justify-center text-sm sm:text-base"
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
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              {t('forgot_password')}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 text-center text-xs text-white/70">
            <p>{t('secure_reliable')}</p>
            <p className="mt-1">{t('copyright')}</p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-12 h-12 sm:w-20 sm:h-20 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      <div className="absolute top-10 right-10 w-12 h-12 sm:w-20 sm:h-20 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
      <div className="absolute bottom-10 left-20 w-12 h-12 sm:w-20 sm:h-20 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>

      {/* Auth Checking Modal Overlay */}
      {checkingAuth && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative z-50 w-full max-w-sm mx-auto bg-white rounded-xl shadow-2xl p-8 text-center border border-gray-200 animate-scale-in">
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2 tracking-tight">
              {authSlow ? t('auth_check_slow_title') : t('auth_check_title')}
            </h2>
            <p className="text-gray-600 text-sm mb-5 leading-relaxed">
              {authSlow
                ? t('auth_check_slow_message')
                : t('auth_check_description')}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span className="inline-flex h-2 w-2 bg-amber-500 rounded-full animate-ping" />
              <span className="font-medium tracking-wide">
                {t('checking_auth')}
              </span>
            </div>
            {authSlow && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={retryAuthCheck}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-colors"
                >
                  {t('auth_check_retry')}
                </button>
                <button
                  type="button"
                  onClick={skipAuthCheck}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-sm transition-colors"
                >
                  {t('auth_check_skip')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  )
}
