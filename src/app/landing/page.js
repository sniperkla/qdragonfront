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
  
  // Extend code state
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [selectedCode, setSelectedCode] = useState(null)
  const [extendPlan, setExtendPlan] = useState('30')
  const [extendingCode, setExtendingCode] = useState(false)
  
  // Real-time countdown state
  const [currentTime, setCurrentTime] = useState(new Date())

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

  // Fetch user's codes with customer account data
  const fetchMyCodes = async () => {
    setLoadingCodes(true)
    try {
      // Fetch codes
      const codesResponse = await fetch('/api/my-codes', {
        credentials: 'include'
      })
      const codesData = await codesResponse.json()
      
      if (codesResponse.ok && codesData.codes) {
        // Fetch customer accounts for activated codes
        const customerAccountsResponse = await fetch('/api/my-customer-accounts', {
          credentials: 'include'
        })
        
        let customerAccounts = []
        if (customerAccountsResponse.ok) {
          const customerData = await customerAccountsResponse.json()
          customerAccounts = customerData.accounts || []
        }
        
        // Merge codes with customer account data
        const enrichedCodes = codesData.codes.map(code => {
          // Find matching customer account by license code
          const customerAccount = customerAccounts.find(account => 
            account.license === code.code
          )
          
          return {
            ...code,
            // Use customer account data if available
            customerAccount: customerAccount,
            expireDate: customerAccount?.expireDate || code.expiresAt,
            accountStatus: customerAccount?.status || 'unknown'
          }
        })
        
        console.log('Enriched codes with customer accounts:', enrichedCodes)
        setMyCodes(enrichedCodes)
      }
    } catch (error) {
      console.error('Error fetching codes:', error)
    } finally {
      setLoadingCodes(false)
    }
  }

    // Load codes when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchMyCodes()
    }
  }, [isAuthenticated])

  // Real-time countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second

    return () => clearInterval(timer)
  }, [])

  // Parse Thai date format to JavaScript Date with fallback handling
  const parseThaiDate = (dateString) => {
    if (!dateString) {
      console.warn('Empty date string provided to parseThaiDate')
      return null
    }

    try {
      console.log('Parsing date string:', dateString)
      
      // Check if it's already a valid ISO date string
      if (dateString.includes('T') || dateString.includes('Z')) {
        const isoDate = new Date(dateString)
        if (!isNaN(isoDate.getTime())) {
          console.log('Parsed as ISO date:', isoDate)
          return isoDate
        }
      }
      
      // Try Thai Buddhist Era format: "DD/MM/YYYY HH:mm"
      if (dateString.includes('/')) {
        const dateParts = dateString.split(' ')
        const [day, month, thaiYear] = dateParts[0].split('/')
        const [hours, minutes] = dateParts[1] ? dateParts[1].split(':') : ['23', '59']
        
        // Validate parts
        if (!day || !month || !thaiYear) {
          throw new Error('Missing date parts')
        }
        
        const dayNum = parseInt(day)
        const monthNum = parseInt(month)
        const yearNum = parseInt(thaiYear)
        const hourNum = parseInt(hours) || 23
        const minNum = parseInt(minutes) || 59
        
        // Validate ranges
        if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
          throw new Error('Invalid day/month values')
        }
        
        // Convert Thai Buddhist year to Gregorian year
        let gregorianYear = yearNum
        if (yearNum > 2500) { // Likely Thai Buddhist Era
          gregorianYear = yearNum - 543
          console.log(`Converting Thai year ${yearNum} to Gregorian ${gregorianYear}`)
        }
        
        const result = new Date(gregorianYear, monthNum - 1, dayNum, hourNum, minNum)
        console.log('Parsed Thai date:', { input: dateString, output: result, isValid: !isNaN(result.getTime()) })
        
        if (isNaN(result.getTime())) {
          throw new Error('Invalid date created')
        }
        
        return result
      }
      
      // Try as regular date string
      const fallbackDate = new Date(dateString)
      if (!isNaN(fallbackDate.getTime())) {
        console.log('Parsed as regular date:', fallbackDate)
        return fallbackDate
      }
      
      throw new Error('Unable to parse date in any format')
      
    } catch (error) {
      console.error('Error parsing date:', { input: dateString, error: error.message })
      return null
    }
  }

  // Calculate time remaining for a code using customer account data
  const getTimeRemaining = (code) => {
    if (code.status !== 'activated') {
      return { expired: false, text: 'Not activated', color: 'text-gray-500' }
    }

    // Prioritize customer account expiry date over code expiry date
    let expiryDate = null
    
    if (code.customerAccount?.expireDate) {
      // Use customer account expiry date (Thai format)
      expiryDate = parseThaiDate(code.customerAccount.expireDate)
      console.log('Using customer account expiry:', code.customerAccount.expireDate, '→', expiryDate)
    } else if (code.expireDate) {
      // Fallback to code's expireDate (Thai format)
      expiryDate = parseThaiDate(code.expireDate)
      console.log('Using code expiry date:', code.expireDate, '→', expiryDate)
    } else if (code.expiresAt) {
      // Last fallback to original expiresAt (ISO format)
      expiryDate = new Date(code.expiresAt)
      console.log('Using original expiresAt:', code.expiresAt, '→', expiryDate)
    }

    if (!expiryDate || isNaN(expiryDate.getTime())) {
      console.warn('Invalid expiry date for code:', code.code, { 
        customerAccount: code.customerAccount?.expireDate, 
        expireDate: code.expireDate, 
        expiresAt: code.expiresAt,
        parsedDate: expiryDate
      })
      
      // Try to show which date source had the issue
      let problemSource = 'Unknown'
      if (code.customerAccount?.expireDate) problemSource = 'Customer Account'
      else if (code.expireDate) problemSource = 'Code'
      else if (code.expiresAt) problemSource = 'Original'
      
      return { expired: false, text: `Invalid (${problemSource})`, color: 'text-red-500' }
    }

    const now = currentTime
    const timeDiff = expiryDate.getTime() - now.getTime()

    if (timeDiff <= 0) {
      return { expired: true, text: 'Expired', color: 'text-red-600 font-semibold' }
    }

    // Calculate time components
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

    // Format the display
    let timeText = ''
    let colorClass = ''

    if (days > 0) {
      timeText = `${days}d ${hours}h ${minutes}m`
      colorClass = days > 7 ? 'text-green-600' : days > 3 ? 'text-yellow-600' : 'text-orange-600'
    } else if (hours > 0) {
      timeText = `${hours}h ${minutes}m ${seconds}s`
      colorClass = hours > 12 ? 'text-yellow-600' : 'text-orange-600'
    } else if (minutes > 0) {
      timeText = `${minutes}m ${seconds}s`
      colorClass = 'text-red-500'
    } else {
      timeText = `${seconds}s`
      colorClass = 'text-red-600 font-bold animate-pulse'
    }

    return { expired: false, text: timeText, color: colorClass, expiryDate, source: code.customerAccount ? 'customer-account' : 'code' }
  }

  // Extend code functionality
  const handleExtendCode = (code) => {
    setSelectedCode(code)
    setExtendPlan('30')
    setShowExtendModal(true)
  }

  const submitExtendCode = async (e) => {
    e.preventDefault()
    if (!selectedCode || !extendPlan) {
      alert('Please select an extension plan')
      return
    }

    setExtendingCode(true)
    try {
      const response = await fetch('/api/extend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          codeId: selectedCode._id,
          extendPlan: extendPlan
        })
      })

      const data = await response.json()
      if (response.ok) {
        alert(`Extension request submitted successfully!\n\nLicense: ${data.licenseCode}\nCurrent expiry: ${data.currentExpiry}\nRequested extension: ${data.requestedDays} days\nStatus: Pending admin approval\n\nPlease wait for admin verification before the extension takes effect.`)
        setShowExtendModal(false)
        setSelectedCode(null)
        setExtendPlan('30')
        fetchMyCodes() // Refresh the codes list
      } else {
        alert(data.error || 'Failed to submit extension request')
      }
    } catch (error) {
      console.error('Error extending code:', error)
      alert('Failed to extend code')
    } finally {
      setExtendingCode(false)
    }
  }

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

          {/* Quick Status Overview */}
          {myCodes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {myCodes.filter(code => code.status === 'activated' && !getTimeRemaining(code).expired).length}
                </div>
                <div className="text-sm text-green-700">Active Codes</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {myCodes.filter(code => code.status === 'pending_payment').length}
                </div>
                <div className="text-sm text-yellow-700">Pending Payment</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">
                  {myCodes.filter(code => {
                    if (code.status !== 'activated') return false
                    
                    // Prioritize customer account expiry date
                    let expiryDate = null
                    if (code.customerAccount?.expireDate) {
                      expiryDate = parseThaiDate(code.customerAccount.expireDate)
                    } else if (code.expireDate) {
                      expiryDate = parseThaiDate(code.expireDate)
                    } else if (code.expiresAt) {
                      expiryDate = new Date(code.expiresAt)
                    }
                    
                    if (!expiryDate) return false
                    
                    const timeDiff = expiryDate.getTime() - currentTime.getTime()
                    const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
                    
                    return timeDiff > 0 && daysLeft <= 7
                  }).length}
                </div>
                <div className="text-sm text-red-700">Expiring Soon</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-600">
                  {myCodes.filter(code => getTimeRemaining(code).expired || code.status === 'expired').length}
                </div>
                <div className="text-sm text-gray-700">Expired</div>
              </div>
            </div>
          )}

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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Time Left</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Expires</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {myCodes.map((code) => {
                    const timeRemaining = getTimeRemaining(code)
                    
                    // Check if urgent using customer account data priority
                    let isUrgent = false
                    if (code.status === 'activated' && !timeRemaining.expired) {
                      let expiryDate = null
                      if (code.customerAccount?.expireDate) {
                        expiryDate = parseThaiDate(code.customerAccount.expireDate)
                      } else if (code.expireDate) {
                        expiryDate = parseThaiDate(code.expireDate)
                      } else if (code.expiresAt) {
                        expiryDate = new Date(code.expiresAt)
                      }
                      
                      if (expiryDate) {
                        const timeDiff = expiryDate.getTime() - currentTime.getTime()
                        const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
                        isUrgent = timeDiff > 0 && daysLeft <= 7
                      }
                    }
                    
                    return (
                    <tr key={code._id} className={`hover:bg-gray-50 ${isUrgent ? 'bg-red-50 border-l-4 border-red-400' : ''}`}>
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
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const timeRemaining = getTimeRemaining(code)
                          const dataSource = code.customerAccount?.expireDate ? 'CA' : 
                                           code.expireDate ? 'Code' : 
                                           code.expiresAt ? 'Orig' : 'None'
                          return (
                            <div>
                              <span className={timeRemaining.color}>
                                {timeRemaining.text}
                              </span>
                              {code.status === 'activated' && (
                                <div className="text-xs text-gray-400">
                                  {dataSource === 'CA' && '📊 Customer Account'}
                                  {dataSource === 'Code' && '🔖 Code Data'}
                                  {dataSource === 'Orig' && '📅 Original'}
                                  {dataSource === 'None' && '❌ No Data'}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {code.status === 'activated' 
                          ? (() => {
                              // Prioritize customer account expiry date with better error handling
                              let expiryDate = null
                              let dateSource = ''
                              let rawDate = ''
                              
                              if (code.customerAccount?.expireDate) {
                                rawDate = code.customerAccount.expireDate
                                expiryDate = parseThaiDate(rawDate)
                                dateSource = '(Customer Account)'
                              } else if (code.expireDate) {
                                rawDate = code.expireDate
                                expiryDate = parseThaiDate(rawDate)
                                dateSource = '(Code)'
                              } else if (code.expiresAt) {
                                rawDate = code.expiresAt
                                expiryDate = new Date(rawDate)
                                dateSource = '(Original)'
                              }
                              
                              let displayDate = 'No date available'
                              if (expiryDate && !isNaN(expiryDate.getTime())) {
                                displayDate = expiryDate.toLocaleDateString()
                              } else if (rawDate) {
                                displayDate = `Invalid: ${rawDate.substring(0, 20)}...`
                              }
                              
                              return (
                                <div>
                                  <div className={expiryDate && !isNaN(expiryDate.getTime()) ? '' : 'text-red-500'}>{displayDate}</div>
                                  {dateSource && <div className="text-xs text-gray-400">{dateSource}</div>}
                                  {(!expiryDate || isNaN(expiryDate.getTime())) && rawDate && (
                                    <div className="text-xs text-red-400" title={rawDate}>Raw: {rawDate}</div>
                                  )}
                                </div>
                              )
                            })()
                          : code.status === 'pending_payment'
                          ? 'Pay to activate'
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(code.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {code.status === 'activated' && (() => {
                          const timeRemaining = getTimeRemaining(code)
                          
                          // Check if urgent using customer account data priority
                          let isUrgent = false
                          if (!timeRemaining.expired) {
                            let expiryDate = null
                            if (code.customerAccount?.expireDate) {
                              expiryDate = parseThaiDate(code.customerAccount.expireDate)
                            } else if (code.expireDate) {
                              expiryDate = parseThaiDate(code.expireDate)
                            } else if (code.expiresAt) {
                              expiryDate = new Date(code.expiresAt)
                            }
                            
                            if (expiryDate) {
                              const timeDiff = expiryDate.getTime() - currentTime.getTime()
                              const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
                              isUrgent = timeDiff > 0 && daysLeft <= 7
                            }
                          }
                          
                          return (
                            <button
                              onClick={() => handleExtendCode(code)}
                              className={`px-3 py-1 rounded text-xs transition duration-200 ${
                                isUrgent 
                                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                                  : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            >
                              {isUrgent ? '⚠️ Extend Now' : 'Extend'}
                            </button>
                          )
                        })()}
                        {code.status === 'pending_payment' && (
                          <span className="text-xs text-gray-400">Pay to extend</span>
                        )}
                        {code.status === 'expired' && (
                          <span className="text-xs text-red-400">Expired</span>
                        )}
                      </td>
                    </tr>
                    )
                  })}
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

      {/* Extend Code Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Extend Trading Code</h3>
              <p className="text-gray-600 mb-4">
                Code: <span className="font-mono font-bold text-blue-600">{selectedCode?.code}</span>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Current Plan: {selectedCode?.plan} days
              </p>
            </div>

            <form onSubmit={submitExtendCode} className="space-y-6">
              <div>
                <label htmlFor="extendPlan" className="block text-sm font-medium text-gray-700 mb-2">
                  Extension Plan *
                </label>
                <select
                  id="extendPlan"
                  value={extendPlan}
                  onChange={(e) => setExtendPlan(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="7">7 Days (Trial Extension)</option>
                  <option value="30">30 Days (Monthly Extension)</option>
                  <option value="90">90 Days (Quarterly Extension)</option>
                  <option value="180">180 Days (Semi-Annual Extension)</option>
                  <option value="365">365 Days (Annual Extension)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select extension plan to add to your current trading code validity
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-orange-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-orange-800 mb-1">Admin Approval Required</h3>
                    <div className="text-sm text-orange-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Extension request requires admin verification</li>
                        <li>Request will be submitted for admin approval</li>
                        <li>Extension takes effect only after admin approval</li>
                        <li>You will receive notification once processed</li>
                        <li>Extended codes maintain the same license key</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowExtendModal(false)
                    setSelectedCode(null)
                    setExtendPlan('30')
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extendingCode || !extendPlan}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {extendingCode ? (
                    <>
                      <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Extending...
                    </>
                  ) : (
                    'Submit Extension Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}