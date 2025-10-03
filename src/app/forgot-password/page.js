'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '../../hooks/useTranslation'

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
  const { t, language } = useTranslation()

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
        body: JSON.stringify({ email, language })
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
        setError(t('no_account_found_with_email'))
        setNeedsRegistration(true)
        setIsSuccess(false)
        debugLogger.log('User attempted password reset for unregistered email')
      } else if (res.status === 403 && data.requiresVerification) {
        setError(t('email_verification_required'))
        debugLogger.log('Email verification required before password reset')
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
        }, 3000)
      } else {
        setError(data.error || t('failed_send_reset_email'))
        debugLogger.error('Password reset request failed', {
          error: data.error
        })
      }
    } catch (error) {
      debugLogger.error('Password reset network error', error)
      setError(t('network_error'))
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/qdragon1.jpg"
          alt="Q-Dragon Background"
          className="w-full h-full object-cover object-center"
          style={{
            minHeight: '100vh',
            minWidth: '100vw'
          }}
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-amber-500/10"></div>
      </div>

      {/* Forgot Password Card */}
      <div className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 ring-1 ring-white/20">
        <div className="absolute top-3 right-3 flex gap-2">
          {['en', 'th'].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() =>
                (typeof window !== 'undefined' &&
                  localStorage.setItem('admin_language', l)) ||
                location.reload()
              }
              className={`px-2 py-1 text-xs rounded-md font-semibold transition-colors ${language === l ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {/* Header */}
        <div className="text-center pt-6 sm:pt-8 pb-4 sm:pb-6 px-6 sm:px-8">
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
            {t('forgot_password_title1')}
          </p>
          <p className="text-xs sm:text-sm text-yellow-300 font-medium mt-1 sm:mt-2">
            {t('forgot_password_title')}
          </p>
        </div>

        {/* Form Content */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white/90 mb-2"
                >
                  {t('email_label')}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 sm:py-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition duration-200 pl-10 sm:pl-12 text-sm sm:text-base text-white placeholder-white/60 bg-white/10 backdrop-blur-sm"
                    placeholder={t('email_placeholder')}
                    style={{ fontSize: '16px' }}
                  />
                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"
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
                <p className="text-xs sm:text-sm text-white/50 mt-2 leading-relaxed text-white/80">
                  {t('enter_email_associated')}
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
                        {t('create_new_account')}
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
                    {t('sending_reset_link')}
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
                    {t('send_reset_link')}
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
                <text className="text-white/70">{t('check_your_email')}</text>
              </h3>
              <p className="text-white/70 mb-6">
                {message ===
                'If an account with that email exists, we have sent a password reset link.'
                  ? t('if_account_exists_reset_link_sent')
                  : message}
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700">
                  <strong>{t('reset_next_steps_title')}</strong>
                  <br />
                  {t('reset_step_1')}
                  <br />
                  {t('reset_step_2')}
                  <br />
                  {t('reset_step_3')}
                  <br />
                  {t('reset_step_4')}
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
              {/* <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-bold">
                  Remember your password?
                </span>
              </div> */}
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
              {t('back_to_login')}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 text-center text-xs text-white/70">
            <p className="leading-relaxed">
              {t('secure_password_reset_tagline')}
            </p>
            <p className="mt-1">{t('copyright')}</p>
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
