'use client'

import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { logout, loginSuccess } from '../../store/slices/authSlice'
import { useTranslation } from '../../hooks/useTranslation'
// Use dynamic import to avoid SSR bundling issues
let socketIOClientFactory = null
const getSocketIO = async () => {
  if (!socketIOClientFactory) {
    const mod = await import('socket.io-client')
    socketIOClientFactory = mod.io
  }
  return socketIOClientFactory
}

export default function LandingPage() {
  const { t, language, changeLanguage } = useTranslation()
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

  // Notification state
  const [notifications, setNotifications] = useState([])
  // History state
  const [historyLoading, setHistoryLoading] = useState(false)
  const [purchaseHistory, setPurchaseHistory] = useState([])
  const [extensionHistory, setExtensionHistory] = useState([])

  // Modal state for replacing alerts
  const [alertModalVisible, setAlertModalVisible] = useState(false)
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    type: 'info', // 'info', 'success', 'error', 'warning'
    onConfirm: null
  })

  const showModalAlert = (message, type = 'info', title = null, onConfirm = null) => {
    setModalContent({
      title: title || (type === 'error' ? t('error') : type === 'success' ? t('success') : type === 'warning' ? t('warning') : t('information')),
      message,
      type,
      onConfirm
    })
    setAlertModalVisible(true)
  }

  const hideModalAlert = () => {
    setAlertModalVisible(false)
    if (modalContent.onConfirm) {
      modalContent.onConfirm()
    }
  }

  const showNotification = (message, type = 'info') => {
    const id = Date.now()
    const notification = { id, message, type }
    setNotifications((prev) => [...prev, notification])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 5000)
  }
  const [extendingCode, setExtendingCode] = useState(false)

  // Real-time countdown state
  const [currentTime, setCurrentTime] = useState(new Date())

  // WebSocket state
  const [socket, setSocket] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastWsEvent, setLastWsEvent] = useState(null)
  const [joinStatus, setJoinStatus] = useState({ joined: false, attempts: 0, rooms: [] })
  const joinIntervalRef = useRef(null)

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
          dispatch(
            loginSuccess({
              id: data.user.id,
              name: data.user.username,
              email: data.user.username
            })
          )
        } else {
          // No valid cookie, redirect to login
          router.push('/')
        }
      } catch (error) {
        // Silent error handling
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

  // Fetch user's licenses (unified view)
  const fetchMyCodes = async () => {
    // Starting fetchMyCodes
    setLoadingCodes(true)
    try {
      // Fetch unified licenses
      // Fetching from /api/my-licenses
      const licensesResponse = await fetch('/api/my-licenses', {
        credentials: 'include'
      })
      const licensesData = await licensesResponse.json()

      if (licensesResponse.ok && licensesData.licenses) {
        console.log('✅ Fetched unified licenses:', licensesData.licenses.length, 'licenses')
        console.log('📊 License statuses:', licensesData.licenses.map(l => ({ code: l.code, status: l.status })))
        setMyCodes(licensesData.licenses)
      } else {
        console.error('❌ Failed to fetch licenses:', licensesData.error)
        setMyCodes([])
      }
    } catch (error) {
      console.error('❌ Error fetching licenses:', error)
      setMyCodes([])
    } finally {
      setLoadingCodes(false)
      console.log('🏁 fetchMyCodes completed')
    }
  }

  const fetchHistory = async () => {
    if (historyLoading) return
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/history', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setPurchaseHistory(data.purchases || [])
        setExtensionHistory(data.extensions || [])
      } else {
        console.warn('Failed to load history:', data.error)
      }
    } catch (e) {
      console.error('History fetch error:', e)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Load codes when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchMyCodes()
      fetchHistory()
    }
  }, [isAuthenticated])

  // Removed interval polling for history: now relying on WebSocket events

  // Initialize WebSocket connection (don't wait for auth; we'll join later)
  useEffect(() => {
    if (socket) return

    // Ensure server initialized using same pattern as admin
    fetch('/api/init/socketio', { cache: 'no-store' }).catch(() => {})

    ;(async () => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
      console.log('🛰️ [Landing] Preparing socket connection to', baseUrl)
      const io = await getSocketIO()
      const s = io(baseUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      withCredentials: true,
      timeout: 15000,
      forceNew: true,
      autoConnect: true
      })

      setSocket(s)

    if (joinIntervalRef.current) {
      clearInterval(joinIntervalRef.current)
      joinIntervalRef.current = null
    }
    const joinRef = { stopped: false }

    const attemptJoin = () => {
      if (!user) return
      const idsToTry = []
      if (user.id) idsToTry.push(user.id)
      if (user._id && user._id !== user.id) idsToTry.push(user._id)
      if (idsToTry.length === 0) return
      idsToTry.forEach((val) => {
        console.log('🔗 Attempting join-user for:', val)
        s.emit('join-user', val)
      })
      setJoinStatus((prev) => ({ ...prev, attempts: prev.attempts + 1 }))
    }

    s.on('connect', () => {
      setWsConnected(true)
      setLastWsEvent('connect')
      // Start immediate attempt + repeating attempts until a room join succeeds
      attemptJoin()
      joinIntervalRef.current = setInterval(() => {
        setJoinStatus((st) => st.joined ? st : st) // force state read
        if (!joinStatus.joined) {
          attemptJoin()
        } else if (joinIntervalRef.current) {
          clearInterval(joinIntervalRef.current)
          joinIntervalRef.current = null
        }
      }, 2000)
    })

    s.on('disconnect', (reason) => {
      console.warn('🔌 Disconnected (landing):', reason)
      setWsConnected(false)
      setLastWsEvent('disconnect')
    })

    s.on('connect_error', (err) => {
      console.warn('⚠️ WebSocket connect_error (landing):', err.message)
      setLastWsEvent('connect_error')
    })
    s.on('error', (err) => {
      console.warn('⚠️ WebSocket generic error (landing):', err?.message || err)
    })
    s.on('reconnect_failed', () => {
      console.warn('❌ WebSocket reconnect_failed (landing)')
    })
    s.on('reconnect_attempt', (n) => {
      console.log('♻️ Reconnect attempt', n)
    })

    s.on('room-joined', (data) => {
      console.log('📥 room-joined event:', data)
      if (!data?.success) {
        // Retry join once more after delay
        setTimeout(() => {
          if (user?.id) s.emit('join-user', user.id)
          if (user?._id && user._id !== user?.id) s.emit('join-user', user._id)
        }, 500)
      } else if (data?.room) {
        setJoinStatus((prev) => {
          const newRooms = prev.rooms.includes(data.room)
            ? prev.rooms
            : [...prev.rooms, data.room]
          const userIdRooms = newRooms.filter(r => r.startsWith('user-'))
          const joined = userIdRooms.length > 0
          if (joined && data.room.startsWith('user-')) {
            console.log('✅ User room joined successfully:', data.room)
          }
            if (joined && joinIntervalRef.current) {
              clearInterval(joinIntervalRef.current)
              joinIntervalRef.current = null
            }
          return { ...prev, rooms: newRooms, joined }
        })
      }
    })

    // Codes updated (e.g., status change paid/activated)
    s.on('codes-updated', (payload) => {
      setLastWsEvent('codes-updated')
      fetchMyCodes()
      fetchHistory() // refresh history real-time
      showNotification(t('license_list_updated'), 'success')
    })

    // Fallback broadcast (in case user room missed join)
    s.on('codes-updated-broadcast', (payload) => {
      // Only refresh if this broadcast pertains to current user (userId matches) or if unsure
      if (!payload?.userId || payload.userId === user?.id || payload.userId === user?._id) {
        setLastWsEvent('codes-updated-broadcast')
        fetchMyCodes()
        fetchHistory()
        showNotification(t('license_updated_broadcast'), 'success')
      }
    })

    s.on('customer-account-updated', () => {
      setLastWsEvent('customer-account-updated')
      fetchMyCodes()
      fetchHistory()
    })

    s.on('client-notification', (data) => {
      setLastWsEvent('client-notification')
      if (data?.message) {
        showNotification(data.message, data.type || 'info')
        // Heuristic: refresh history on any client notification mentioning license or extension
        const msg = data.message.toLowerCase()
        if (msg.includes('license') || msg.includes('extension')) {
          fetchHistory()
        }
      }
    })

    s.on('broadcast-notification', (data) => {
      setLastWsEvent('broadcast-notification')
      if (data?.message) {
        showNotification(data.message, data.type || 'info')
      }
    })

    })()

    return () => {
      if (joinIntervalRef.current) {
        clearInterval(joinIntervalRef.current)
        joinIntervalRef.current = null
      }
    }
  }, [socket, user])

  // Re-emit join when user changes AFTER socket established
  useEffect(() => {
    if (!socket || !wsConnected) return
    if (user?.id) {
      console.log('🔄 Re-joining (user.id effect):', user.id)
      socket.emit('join-user', user.id)
    }
    if (user?._id && user._id !== user?.id) {
      console.log('🔄 Re-joining (user._id effect):', user._id)
      socket.emit('join-user', user._id)
    }
  }, [user?.id, user?._id, wsConnected, socket])

  // Removed fallback polling - relying solely on WebSocket events for updates

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
        const [hours, minutes] = dateParts[1]
          ? dateParts[1].split(':')
          : ['23', '59']

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
        if (yearNum > 2500) {
          // Likely Thai Buddhist Era
          gregorianYear = yearNum - 543
          console.log(
            `Converting Thai year ${yearNum} to Gregorian ${gregorianYear}`
          )
        }

        const result = new Date(
          gregorianYear,
          monthNum - 1,
          dayNum,
          hourNum,
          minNum
        )
        console.log('Parsed Thai date:', {
          input: dateString,
          output: result,
          isValid: !isNaN(result.getTime())
        })

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
      console.error('Error parsing date:', {
        input: dateString,
        error: error.message
      })
      return null
    }
  }

  // Calculate time remaining for a license
  const getTimeRemaining = (license) => {
    try {
      let expiryDate = null

      // Prioritize customer account expiry date
      if (license.customerAccount?.expireDate) {
        expiryDate = parseThaiDate(license.customerAccount.expireDate)
      } else if (license.expiresAt) {
        expiryDate = new Date(license.expiresAt)
      } else if (license.expireDate) {
        expiryDate = parseThaiDate(license.expireDate)
      }

      if (!expiryDate || isNaN(expiryDate.getTime())) {
        return {
          expired: false,
          timeLeft: 'Invalid date',
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        }
      }

      const now = currentTime
      const timeDiff = expiryDate.getTime() - now.getTime()

      if (timeDiff <= 0) {
        return {
          expired: true,
          timeLeft: 'Expired',
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        }
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor(
        (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      )
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

      let timeLeft = ''
      if (days > 0) {
        timeLeft = `${days}d ${hours}h ${minutes}m`
      } else if (hours > 0) {
        timeLeft = `${hours}h ${minutes}m ${seconds}s`
      } else if (minutes > 0) {
        timeLeft = `${minutes}m ${seconds}s`
      } else {
        timeLeft = `${seconds}s`
      }

      return {
        expired: false,
        timeLeft,
        days,
        hours,
        minutes,
        seconds
      }
    } catch (error) {
      console.error('Error calculating time remaining:', error)
      return {
        expired: false,
        timeLeft: 'Error',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
      }
    }
  }

  // Extend code functionality
  const handleExtendLicense = (license) => {
    setSelectedCode(license)
    setExtendPlan('30')
    setShowExtendModal(true)
  }

  const submitExtendLicense = async (e) => {
    e.preventDefault()
    if (!selectedCode || !extendPlan) {
      showModalAlert('Please select an extension plan', 'warning')
      return
    }

    setExtendingCode(true)
    try {
      const response = await fetch('/api/extend-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          codeId: selectedCode._id,
          extendPlan: extendPlan,
          source: selectedCode.source,
          licenseCode: selectedCode.code
        })
      })

      const data = await response.json()
      if (response.ok) {
        showModalAlert(
          `Extension request submitted successfully!\n\nLicense: ${data.licenseCode}\nCurrent expiry: ${data.currentExpiry}\nRequested extension: ${data.requestedDays} days\nStatus: Pending admin approval\n\nPlease wait for admin verification before the extension takes effect.`,
          'success',
          'Extension Request Submitted',
          () => {
            setShowExtendModal(false)
            setSelectedCode(null)
            setExtendPlan('30')
            fetchMyCodes() // Refresh the codes list
          }
        )
        return
      } else {
        showModalAlert(data.error || 'Failed to submit extension request', 'error')
      }
    } catch (error) {
      console.error('Error extending code:', error)
      showModalAlert('Failed to extend code', 'error')
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
      })

      // Update Redux state
      dispatch(logout())
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      // Still logout locally even if API fails
      dispatch(logout())
      router.push('/')
    }
  }

  const handleCodeFormChange = (e) => {
    const { name, value } = e.target
    setCodeForm((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePurchaseLicense = async () => {
    if (!codeForm.accountNumber) {
      showModalAlert('Please enter your trading account number', 'warning')
      return
    }

    setGeneratingCode(true)
    try {
      const response = await fetch('/api/purchase-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
        setGeneratedCode(data.license)
        // Refresh licenses list
        fetchMyCodes()
        // Show success message
        showModalAlert(
          `License purchased: ${data.license}\nPlan: ${codeForm.plan} days\nPrice: $${data.price}\n\nPlease proceed to payment.`,
          'success',
          'License Purchase Successful'
        )
      } else {
        showModalAlert(data.error || 'Failed to purchase license', 'error')
      }
    } catch (error) {
      console.error('Error purchasing license:', error)
      showModalAlert('Network error. Please try again.', 'error')
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 pb-8">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">{t('dashboard')}</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Language Toggle */}
              <div className="flex gap-1">
                {['en','th'].map(l => (
                  <button key={l} onClick={() => changeLanguage(l)} className={`px-2 py-1 text-xs rounded-md font-semibold transition-colors ${language===l ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{l.toUpperCase()}</button>
                ))}
              </div>
              <span className="text-gray-700">{t('welcome')}, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('welcome_dashboard_heading')}</h1>
          <p className="text-xl text-gray-600 mb-8">{t('dashboard_subtitle')}</p>
        </div>

        {/* License Purchase Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-2xl shadow-2xl mb-8 text-white">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="relative p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div className="mb-6 lg:mb-0">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl lg:text-4xl font-bold">{t('purchase_trading_license')}</h2>
                    <p className="text-purple-200 mt-1 text-lg">{t('purchase_subtitle')}</p>
                  </div>
                </div>
              </div>
              
              <div className="hidden lg:flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">{t('live_trading')}</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium">{t('premium')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Account Number Input */}
              <div className="relative">
                <label className="block text-purple-200 text-sm font-semibold mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {t('trading_account_number')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="accountNumber"
                    value={codeForm.accountNumber}
                    onChange={handleCodeFormChange}
                    placeholder={t('enter_account_number_placeholder')}
                    className="w-full px-4 py-3 pl-11 rounded-xl bg-white/95 backdrop-blur-sm text-gray-900 placeholder-gray-500 border border-white/20 focus:ring-2 focus:ring-purple-300 focus:border-transparent focus:bg-white transition-all duration-300 shadow-lg"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Platform Selection */}
              <div className="relative">
                <label className="block text-purple-200 text-sm font-semibold mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {t('trading_platform_label')}
                </label>
                <div className="relative">
                  <select
                    name="platform"
                    value={codeForm.platform}
                    onChange={handleCodeFormChange}
                    className="w-full px-4 py-3 pl-11 rounded-xl bg-white/95 backdrop-blur-sm text-gray-900 border border-white/20 focus:ring-2 focus:ring-purple-300 focus:border-transparent focus:bg-white transition-all duration-300 shadow-lg appearance-none"
                  >
                    <option value="exness">Exness</option>
                    <option value="xm">XM</option>
                    <option value="ic-markets">IC Markets</option>
                    <option value="pepperstone">Pepperstone</option>
                    <option value="fxpro">FxPro</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              <div className="relative">
                <label className="block text-purple-200 text-sm font-semibold mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('subscription_plan')}
                </label>
                <div className="relative">
                  <select
                    name="plan"
                    value={codeForm.plan}
                    onChange={handleCodeFormChange}
                    className="w-full px-4 py-3 pl-11 rounded-xl bg-white/95 backdrop-blur-sm text-gray-900 border border-white/20 focus:ring-2 focus:ring-purple-300 focus:border-transparent focus:bg-white transition-all duration-300 shadow-lg appearance-none"
                  >
                    <option value="30">30 Days - $99</option>
                    <option value="60">60 Days - $189</option>
                    <option value="90">90 Days - $269</option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <button
                onClick={handlePurchaseLicense}
                disabled={generatingCode || !codeForm.accountNumber}
                className="group relative w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center shadow-2xl hover:shadow-yellow-500/25 transform hover:-translate-y-1 hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none disabled:shadow-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-2xl blur opacity-30 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative flex items-center">
                  {generatingCode ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-lg">{t('purchasing_license')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-lg">{t('purchase_license_now')}</span>
                    </>
                  )}
                </div>
              </button>
              
              <div className="flex items-center text-purple-200 text-sm">
                <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('instant_activation')}
              </div>
            </div>

            {generatedCode && (
              <div className="mt-8 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-400/20 to-emerald-400/20 px-6 py-4 border-b border-white/10">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-white mb-1">{t('license_created_success')}</h3>
                      <p className="text-green-200 text-sm">{t('license_ready_for_payment_activation')}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl p-4 border border-gray-600/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-200 text-sm font-medium">{t('license_code')}</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(generatedCode)}
                        className="text-purple-300 hover:text-white transition-colors duration-200 p-1 rounded-lg hover:bg-white/10"
                        title={t('copy_to_clipboard')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 font-mono text-2xl font-bold tracking-wider text-center text-white border border-gray-500/30">
                      {generatedCode}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                    <div className="flex items-center text-purple-200">
                      <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('activate_within_24h')}
                    </div>
                    <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                    <div className="flex items-center text-purple-200">
                      <svg className="w-4 h-4 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.99-4.99v0A9 9 0 1120 12h-4" />
                      </svg>
                      {t('secure_payment_required')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* My Trading Licenses Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('my_trading_licenses') || t('license_header')}</h2>
            <button
              onClick={fetchMyCodes}
              disabled={loadingCodes}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
            >
              {loadingCodes ? (
                <svg
                  className="animate-spin w-4 h-4 mr-2"
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
              ) : (
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  ></path>
                </svg>
              )}
              {t('refresh')}
            </button>
          </div>

          {/* Quick Status Overview */}
          {myCodes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {myCodes.filter((code) => code.status === 'activated').length}
                </div>
                <div className="text-sm text-green-700">{t('active_licenses')}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {
                    myCodes.filter((code) => code.status === 'pending_payment')
                      .length
                  }
                </div>
                <div className="text-sm text-yellow-700">{t('pending_payment')}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-600">
                  {
                    myCodes.filter(
                      (code) =>
                        code.status === 'expired' || code.status === 'cancelled'
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-700">{t('expired_cancelled')}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {(() => {
                    const activeLicenses = myCodes.filter(
                      (code) => code.status === 'activated'
                    )
                    if (activeLicenses.length === 0) return '0'

                    const expiringSoon = activeLicenses.filter((code) => {
                      const timeRemaining = getTimeRemaining(code)
                      return !timeRemaining.expired && timeRemaining.days < 7
                    }).length

                    return expiringSoon
                  })()}
                </div>
                <div className="text-sm text-blue-700">{t('expiring_soon')}</div>
              </div>
            </div>
          )}

          {myCodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              <p className="text-lg font-medium">{t('no_licenses_yet')}</p>
              <p className="text-sm">{t('purchase_first_license_hint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">{t('license_header')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">{t('platform_header')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">{t('account_header')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">{t('plan_header')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">{t('status_header')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">{t('expires_header')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">{t('time_left_header')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">{t('actions_header')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {myCodes.map((code) => {
                    return (
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
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              code.status === 'activated'
                                ? 'bg-green-100 text-green-800'
                                : code.status === 'paid'
                                  ? 'bg-blue-100 text-blue-800'
                                  : code.status === 'pending_payment'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {code.status.replace('_', ' ').toUpperCase()}
                          </span>
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
                                if (
                                  expiryDate &&
                                  !isNaN(expiryDate.getTime())
                                ) {
                                  displayDate = expiryDate.toLocaleDateString()
                                } else if (rawDate) {
                                  displayDate = `Invalid: ${rawDate.substring(0, 20)}...`
                                }

                                return (
                                  <div>
                                    <div
                                      className={
                                        expiryDate &&
                                        !isNaN(expiryDate.getTime())
                                          ? ''
                                          : 'text-red-500'
                                      }
                                    >
                                      {displayDate}
                                    </div>
                                    {dateSource && (
                                      <div className="text-xs text-gray-400">
                                        {dateSource}
                                      </div>
                                    )}
                                    {(!expiryDate ||
                                      isNaN(expiryDate.getTime())) &&
                                      rawDate && (
                                        <div
                                          className="text-xs text-red-400"
                                          title={rawDate}
                                        >
                                          Raw: {rawDate}
                                        </div>
                                      )}
                                  </div>
                                )
                              })()
                            : code.status === 'pending_payment'
          ? t('pay_to_activate')
                              : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {code.status === 'activated' ? (
                            (() => {
                              const timeRemaining = getTimeRemaining(code)
                              return (
                                <div>
                                  <div
                                    className={`font-medium ${
                                      timeRemaining.expired
                                        ? 'text-red-600'
                                        : timeRemaining.days < 7
                                          ? 'text-orange-600'
                                          : timeRemaining.days < 30
                                            ? 'text-yellow-600'
                                            : 'text-green-600'
                                    }`}
                                  >
                                    {timeRemaining.timeLeft}
                                  </div>
                                  {!timeRemaining.expired &&
                                    timeRemaining.days > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {timeRemaining.days} day
                                        {timeRemaining.days !== 1 ? 's' : ''}{' '}
                                        left
                                      </div>
                                    )}
                                </div>
                              )
                            })()
                          ) : code.status === 'pending_payment' ? (
                            <span className="text-gray-400 text-xs">{t('pay_to_see_countdown')}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {code.status === 'activated' && (
                            <button
                              onClick={() => handleExtendLicense(code)}
                              className="px-3 py-1 rounded text-xs transition duration-200 bg-green-500 hover:bg-green-600 text-white"
                            >
                              {t('extend')}
                            </button>
                          )}
                          {code.status === 'pending_payment' && (
                            <span className="text-xs text-gray-400">{t('pay_to_activate')}</span>
                          )}
                          {code.status === 'expired' && (
                            <span className="text-xs text-red-400">{t('expired')}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Expiring Soon Alert */}
          {myCodes.length > 0 &&
            (() => {
              const activeLicenses = myCodes.filter(
                (code) => code.status === 'activated'
              )
              const expiringSoon = activeLicenses.filter((code) => {
                const timeRemaining = getTimeRemaining(code)
                return !timeRemaining.expired && timeRemaining.days < 7
              })

              if (expiringSoon.length === 0) return null

              return (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('licenses_expiring_soon')}
                  </h3>
                  <div className="space-y-2">
                    {expiringSoon.map((license) => {
                      const timeRemaining = getTimeRemaining(license)
                      return (
                        <div
                          key={license._id}
                          className="flex items-center justify-between bg-white rounded p-3"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="font-mono text-sm font-semibold text-blue-600">
                              {license.code}
                            </span>
                            <span className="text-sm text-gray-600">
                              {license.platform} • {license.accountNumber}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span
                              className={`text-sm font-medium ${
                                timeRemaining.days <= 1
                                  ? 'text-red-600'
                                  : 'text-orange-600'
                              }`}
                            >
                              {timeRemaining.timeLeft}
                            </span>
                            <button
                              onClick={() => handleExtendLicense(license)}
                              className="px-3 py-1 rounded text-xs bg-orange-500 hover:bg-orange-600 text-white transition duration-200"
                            >
                              {t('extend_now')}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
        </div>

        {/* History Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('history_title')}</h2>
            <button
              onClick={fetchHistory}
              disabled={historyLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
            >
              {historyLoading ? (
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {t('refresh')}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Purchase History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8V4m0 4a4 4 0 100 8m0-8a4 4 0 010 8m6 4H6" /></svg>
                {t('purchase_history')}
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{purchaseHistory.length}</span>
              </h3>
              {purchaseHistory.length === 0 ? (
                <p className="text-sm text-gray-500">{t('no_history_yet')}</p>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">{t('license_code')}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">{t('plan_days')}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">{t('price_label')}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">{t('status_label')}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">{t('created_at')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {purchaseHistory.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs text-blue-600 font-semibold">{item.licenseCode}</td>
                          <td className="px-3 py-2">{item.planDays}</td>
                          <td className="px-3 py-2">${item.price}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${item.status === 'activated' ? 'bg-green-100 text-green-700' : item.status === 'paid' ? 'bg-blue-100 text-blue-700' : item.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700' : item.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{item.status.replace('_',' ')}</span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Extension History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {t('extension_history')}
                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{extensionHistory.length}</span>
              </h3>
              {extensionHistory.length === 0 ? (
                <p className="text-sm text-gray-500">{t('no_history_yet')}</p>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">{t('license_code')}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">{t('requested_days')}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">{t('status_label')}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">{t('requested_on')}</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">{t('processed_on')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {extensionHistory.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs text-purple-600 font-semibold">{item.licenseCode}</td>
                          <td className="px-3 py-2">{item.requestedDays}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">{new Date(item.requestedAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{item.processedAt ? new Date(item.processedAt).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Info Card */}
        {/* <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Your Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Full Name
              </h3>
              <p className="text-blue-700 text-lg">{user?.name}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Email Address
              </h3>
              <p className="text-green-700 text-lg">{user?.email}</p>
            </div>
          </div>
        </div> */}

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
  <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-gray-800/30 to-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t('extend_trading_license')}</h3>
              <p className="text-gray-600 mb-4">
                {t('code_label')}{' '}
                <span className="font-mono font-bold text-blue-600">
                  {selectedCode?.code}
                </span>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {t('current_plan_label')} {selectedCode?.plan} {t('days')}
              </p>
            </div>

            <form onSubmit={submitExtendLicense} className="space-y-6">
              <div>
                <label
                  htmlFor="extendPlan"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {t('extension_plan')}
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
                <p className="text-xs text-gray-500 mt-1">{t('extension_plan_helper')}</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-orange-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    ></path>
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-orange-800 mb-1">{t('admin_approval_required')}</h3>
                    <div className="text-sm text-orange-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>{t('extension_bullet_admin_verification')}</li>
                        <li>{t('extension_bullet_request_submitted')}</li>
                        <li>{t('extension_bullet_effect_after_approval')}</li>
                        <li>{t('extension_bullet_receive_notification')}</li>
                        <li>{t('extension_bullet_same_license_key')}</li>
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
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={extendingCode || !extendPlan}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {extendingCode ? (
                    <>
                      <svg
                        className="animate-spin w-5 h-5 mr-2"
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
                      {t('extending')}
                    </>
                  ) : (
                    t('submit_extension_request')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 ${
              notification.type === 'success'
                ? 'bg-green-500 text-white'
                : notification.type === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-500 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{notification.message}</p>
              <button
                onClick={() =>
                  setNotifications((prev) =>
                    prev.filter((n) => n.id !== notification.id)
                  )
                }
                className="ml-2 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Modal */}
      {alertModalVisible && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/50 via-gray-800/40 to-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-200">
            <div className="text-center">
              {/* Icon based on type */}
              <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
                modalContent.type === 'error' ? 'bg-red-100' :
                modalContent.type === 'success' ? 'bg-green-100' :
                modalContent.type === 'warning' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                {modalContent.type === 'error' ? (
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : modalContent.type === 'success' ? (
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : modalContent.type === 'warning' ? (
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {modalContent.title}
              </h3>
              
              {/* Message */}
              <div className="text-gray-600 mb-6 whitespace-pre-line text-sm leading-relaxed">
                {modalContent.message}
              </div>
              
              {/* OK Button */}
              <button
                onClick={hideModalAlert}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  modalContent.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  modalContent.type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  modalContent.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                  'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {t('ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
