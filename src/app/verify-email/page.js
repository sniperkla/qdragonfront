'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '../../hooks/useTranslation'

// Inline debug logger to avoid import issues
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

function VerifyEmailContent() {
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fromLogin, setFromLogin] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, language, changeLanguage } = useTranslation()

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
        setError(t('no_email_provided'))
      }
    } catch (error) {
      debugLogger.error('Error processing URL parameters', error)
      setError(t('verification_failed'))
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          token: verificationCode
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (fromLogin) {
          setMessage(t('verification_success_login'))
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else {
          setMessage(t('verification_success_redirect'))
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        }
      } else {
        setError(data.error || t('verification_failed'))
      }
    } catch (error) {
      setError(t('network_error'))
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, language })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(t('resend_verification_success'))
      } else {
        setError(data.error || t('resend_verification_failed'))
      }
    } catch (error) {
      setError(t('network_error'))
    } finally {
      setIsLoading(false)
    }
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

      {/* Verification Card */}
      <div className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 ring-1 ring-white/20">
        {/* Header */}
        <div className="text-center pt-6 sm:pt-8 pb-4 sm:pb-6 px-6 sm:px-8 relative">
          <div className="absolute top-3 right-3 flex gap-2">
            {['en','th'].map(l => (
              <button
                key={l}
                type="button"
                onClick={() => changeLanguage(l)}
                className={`px-2 py-1 text-xs rounded-md font-semibold transition-colors ${language===l ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white hover:bg-white/30'}`}
              >{l.toUpperCase()}</button>
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
          <p className="text-white/90 text-sm sm:text-base mb-2">
            {t('verify_your_email')}
          </p>
          {fromLogin ? (
            <>
              <p className="text-white/80 text-xs sm:text-sm">
                {t('email_verification_required_notice')}
              </p>
              <p className="text-xs sm:text-sm text-yellow-300 font-medium mt-1 sm:mt-2">
                {t('must_verify_before_login')}
              </p>
            </>
          ) : (
            <>
              <p className="text-white/80 text-xs sm:text-sm">
                {t('complete_account_setup')}
              </p>
              <p className="text-xs sm:text-sm text-yellow-300 font-medium mt-1 sm:mt-2">
                {t('check_email_for_code')}
              </p>
            </>
          )}
        </div>

        {/* Verification Form */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          <form onSubmit={handleVerify} className="space-y-4 sm:space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                {t('email_address')}
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition duration-200 pl-12 text-white placeholder-white/60"
                  placeholder="Your email address"
                  readOnly
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-white/60"
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
            </div>

            <div>
              <label
                htmlFor="verificationCode"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                {t('verification_code')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition duration-200 pl-12 text-white placeholder-white/60"
                  placeholder={t('enter_verification_code')}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-white/60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 7a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-6a2 2 0 01-2-2V9a2 2 0 012-2h2z"
                    ></path>
                  </svg>
                </div>
              </div>
              <p className="text-xs text-white/70 mt-1">
                {t('check_inbox_and_spam')}
              </p>
            </div>

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                {message}
              </div>
            )}

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
                  {t('verifying')}
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  {t('verify_email_cta')}
                </>
              )}
            </button>
          </form>

          {/* Resend Button */}
          <div className="mt-6 text-center">
            <p className="text-white/80 mb-4">{t('didnt_receive_code')}</p>
            <button
              onClick={handleResendVerification}
              disabled={isLoading}
              className="text-yellow-300 hover:text-yellow-200 font-medium py-2 transition duration-200 disabled:opacity-50"
            >
              {t('resend_verification_email')}
            </button>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-white/80 hover:text-white font-medium py-2 transition duration-200"
            >
              {t('back_to_login_arrow')}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-white/60">
            <p>{t('verification_link_expires')}</p>
            <p className="mt-1">{t('copyright')}</p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-4 sm:top-10 left-4 sm:left-10 w-12 h-12 sm:w-20 sm:h-20 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      <div className="absolute top-4 sm:top-10 right-4 sm:right-10 w-12 h-12 sm:w-20 sm:h-20 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
      <div className="absolute bottom-4 sm:bottom-10 left-8 sm:left-20 w-12 h-12 sm:w-20 sm:h-20 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      }
    >
      <VerifyEmailContent />
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
    </Suspense>
  )
}
