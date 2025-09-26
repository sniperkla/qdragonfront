'use client'

import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { logout, loginSuccess } from '../../store/slices/authSlice'

export default function LandingPage() {
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  
  // Code generation form state
  const [showCodeGenerator, setShowCodeGenerator] = useState(false)
  const [codeForm, setCodeForm] = useState({
    accountNumber: '',
    platform: 'exness',
    plan: '30'
  })
  const [generatingCode, setGeneratingCode] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [myCodes, setMyCodes] = useState([])
  const [loadingCodes, setLoadingCodes] = useState(false)

  useEffect(() => {
    // Check if user is authenticated via cookie on page load
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          // Update Redux state with user data from cookie
          dispatch(loginSuccess({
            id: data.user.id,
            name: data.user.username,
            email: data.user.username
          }))
        } else {
          // No valid cookie, redirect to login
          router.push('/')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    if (!isAuthenticated) {
      checkAuth()
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, dispatch, router])

  // Fetch user's codes
  const fetchMyCodes = async () => {
    setLoadingCodes(true)
    try {
      const response = await fetch('/api/my-codes', {
        credentials: 'include'
      })
      const data = await response.json()
      if (response.ok) {
        setMyCodes(data.codes)
      }
    } catch (error) {
      console.error('Error fetching codes:', error)
    } finally {
      setLoadingCodes(false)
    }
  }

  // Load codes when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchMyCodes()
    }
  }, [isAuthenticated, isLoading])

  const handleLogout = async () => {
    try {
      // Call logout API to clear cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Update Redux state
      dispatch(logout());
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still logout locally even if API fails
      dispatch(logout());
      router.push('/');
    }
  }

  const handleCodeFormChange = (e) => {
    const { name, value } = e.target
    setCodeForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleGenerateCode = async () => {
    if (!codeForm.accountNumber) {
      alert('Please enter your trading account number')
      return
    }

    setGeneratingCode(true)
    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          accountNumber: codeForm.accountNumber,
          platform: codeForm.platform,
          plan: codeForm.plan
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setGeneratedCode(data.code)
        // Refresh codes list
        fetchMyCodes()
        // Redirect to payment page or show payment modal
        alert(`Code generated: ${data.code}\nPlan: ${codeForm.plan} days\nPrice: $${data.price}\n\nPlease proceed to payment.`)
      } else {
        alert(data.error || 'Failed to generate code')
      }
    } catch (error) {
      console.error('Error generating code:', error)
      alert('Network error. Please try again.')
    } finally {
      setGeneratingCode(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Your Q-DRAGON Dashboard!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Professional XAU/USD Trading Platform - Generate your trading codes below.
          </p>
        </div>

        {/* Code Generation Section */}
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Generate Trading Code</h2>
              <p className="text-yellow-100">Connect your trading platform and select your plan</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Account Number Input */}
            <div>
              <label className="block text-yellow-100 text-sm font-medium mb-2">
                Trading Account Number
              </label>
              <input
                type="text"
                name="accountNumber"
                value={codeForm.accountNumber}
                onChange={handleCodeFormChange}
                placeholder="e.g., 1234567"
                className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white focus:bg-white transition duration-200"
                required
              />
            </div>

            {/* Platform Selection */}
            <div>
              <label className="block text-yellow-100 text-sm font-medium mb-2">
                Trading Platform
              </label>
              <select
                name="platform"
                value={codeForm.platform}
                onChange={handleCodeFormChange}
                className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 focus:ring-2 focus:ring-white focus:bg-white transition duration-200"
              >
                <option value="exness">Exness</option>
                <option value="xm">XM</option>
                <option value="ic-markets">IC Markets</option>
                <option value="pepperstone">Pepperstone</option>
                <option value="fxpro">FxPro</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Plan Selection */}
            <div>
              <label className="block text-yellow-100 text-sm font-medium mb-2">
                Subscription Plan
              </label>
              <select
                name="plan"
                value={codeForm.plan}
                onChange={handleCodeFormChange}
                className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 focus:ring-2 focus:ring-white focus:bg-white transition duration-200"
              >
                <option value="30">30 Days - $99</option>
                <option value="60">60 Days - $189</option>
                <option value="90">90 Days - $269</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateCode}
            disabled={generatingCode || !codeForm.accountNumber}
            className="w-full md:w-auto bg-white text-yellow-600 font-bold py-4 px-8 rounded-lg hover:bg-yellow-50 disabled:bg-gray-300 disabled:text-gray-500 transition duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {generatingCode ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Code...
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                </svg>
                Generate Trading Code
              </>
            )}
          </button>

          {generatedCode && (
            <div className="mt-6 bg-white/20 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">Your Trading Code:</h3>
              <div className="bg-white/30 rounded p-3 font-mono text-xl font-bold tracking-wider">
                {generatedCode}
              </div>
              <p className="text-yellow-100 text-sm mt-2">
                Please proceed to payment to activate this code.
              </p>
            </div>
          )}
        </div>

        {/* My Trading Codes Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Trading Codes</h2>
            <button
              onClick={fetchMyCodes}
              disabled={loadingCodes}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
            >
              {loadingCodes ? (
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              )}
              Refresh
            </button>
          </div>

          {myCodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p className="text-lg font-medium">No trading codes generated yet</p>
              <p className="text-sm">Generate your first trading code above to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Platform</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Account</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Plan</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {myCodes.map((code) => (
                    <tr key={code._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-blue-600 font-bold">
                        {code.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                        {code.platform}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {code.accountNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {code.plan} days
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        ${code.price}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          code.status === 'activated' 
                            ? 'bg-green-100 text-green-800' 
                            : code.status === 'paid'
                            ? 'bg-blue-100 text-blue-800'
                            : code.status === 'pending_payment'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {code.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(code.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Full Name</h3>
              <p className="text-blue-700 text-lg">{user?.name}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Email Address</h3>
              <p className="text-green-700 text-lg">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-200">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Analytics</h3>
            </div>
            <p className="text-gray-600">View your account analytics and statistics.</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-200">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Settings</h3>
            </div>
            <p className="text-gray-600">Manage your account settings and preferences.</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-200">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Messages</h3>
            </div>
            <p className="text-gray-600">Check your messages and notifications.</p>
          </div>
        </div> */}

        {/* Success Message */}
        {/* <div className="mt-12 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Registration Successful!</h3>
              <p className="text-green-700">You have successfully created your account and logged in.</p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  )
}