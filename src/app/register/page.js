'use client'

import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { encryptedFetch } from '@/lib/clientEncryption'
import {
  registerStart,
  registerSuccess,
  registerFailure,
  clearError
} from '../../store/slices/authSlice'

// Inline debug logger (restored to prevent reference errors)
const debugLogger = {
  log: (...args) => {
    if (process.env.NODE_ENV !== 'production') console.log('[REGISTER]', ...args)
  },
  error: (...args) => console.error('[REGISTER]', ...args)
}

export default function RegisterPage() {
  const { t, language, changeLanguage } = useTranslation()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const dispatch = useDispatch()
  const router = useRouter()
  const { isLoading, error } = useSelector((state) => state.auth)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Clear any previous errors
    dispatch(clearError())

    // Validation
    if (formData.password !== formData.confirmPassword) {
      dispatch(registerFailure('Passwords do not match'))
      return
    }

    if (formData.password.length < 6) {
      dispatch(registerFailure('Password must be at least 6 characters'))
      return
    }

    if (formData.username.length < 3) {
      dispatch(registerFailure('Username must be at least 3 characters'))
      return
    }

    try {
      dispatch(registerStart())

      // Call the actual registration API with email verification (encrypted)
      const data = await encryptedFetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          language
        })
      })

      // Show success message - redirect to email verification page
      dispatch(
        registerSuccess({
          username: formData.username,
          email: formData.email
        })
      )

      // Comprehensive production debugging
      debugLogger.log('Registration successful, preparing redirect', {
        username: formData.username,
        email: formData.email,
        environment: process.env.NODE_ENV,
        currentUrl:
          typeof window !== 'undefined' ? window.location.href : 'server'
      })

      // Redirect to email verification page (simplified)
const targetUrl = `/verify-email?email=${encodeURIComponent(formData.email)}&username=${encodeURIComponent(formData.username)}&lang=${language}`
      debugLogger.log('Redirecting to verify-email', { targetUrl })
      router.push(targetUrl)
    } catch (error) {
      debugLogger.error('Registration error', error)
      dispatch(registerFailure(error.message || 'Registration failed. Please try again.'))
    }
  }

  const handleLogin = () => {
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

      {/* Register Card */}
      <div className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 ring-1 ring-white/20">
        {/* Language Switcher */}
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
          <p className="text-white/90 text-sm sm:text-base">{t('register_title')}</p>
          <p className="text-xs sm:text-sm text-yellow-300 font-medium">{t('sub_tagline')}</p>
        </div>

        {/* Register Form */}
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
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition duration-200 pl-10 sm:pl-12 text-sm sm:text-base text-white placeholder-white/60 bg-white/10 backdrop-blur-sm"
                  placeholder={t('username_placeholder')}
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-medium text-white/90 mb-2"
              >
                {t('email_label')}
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition duration-200 pl-10 sm:pl-12 text-sm sm:text-base text-white placeholder-white/60 bg-white/10 backdrop-blur-sm"
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
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition duration-200 pl-10 sm:pl-12 text-sm sm:text-base text-white placeholder-white/60 bg-white/10 backdrop-blur-sm"
                  placeholder={t('password_placeholder')}
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    ></path>
                  </svg>
                </div>
              </div>
              <p className="text-xs text-red-400 mt-1">{t('password_too_short')}</p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs sm:text-sm font-medium text-white/90 mb-2"
              >
                {t('confirm_password_label')}
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition duration-200 pl-10 sm:pl-12 text-sm sm:text-base text-white placeholder-white/60 bg-white/10 backdrop-blur-sm"
                  placeholder={t('confirm_password_label')}
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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
                {error}
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
                  {t('registering')}
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
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    ></path>
                  </svg>
                  {t('register_cta')}
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
                <span className="px-2 bg-white text-gray-500 font-bold">
                  {t('already_have_account')}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogin}
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
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                ></path>
              </svg>
              {t('go_to_login')}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 text-center text-xs text-white/70">
            <p>{t('account_creation_agreement')}</p>
            <p className="mt-1">{t('email_verification_required_secure')}</p>
            <p className="mt-2">{t('copyright')}</p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-12 h-12 sm:w-20 sm:h-20 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      <div className="absolute top-10 right-10 w-12 h-12 sm:w-20 sm:h-20 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
      <div className="absolute bottom-10 left-20 w-12 h-12 sm:w-20 sm:h-20 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>

      {/* Debug Button */}
      {(process.env.NODE_ENV === 'development' ||
        (typeof window !== 'undefined' &&
          window.location.search.includes('debug=true'))) && (
        <button
          onClick={() => {
            const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]')
            alert(
              `Debug logs (${logs.length} entries)`
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
