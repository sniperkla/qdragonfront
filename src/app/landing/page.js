'use client'

import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { logout, loginSuccess } from '../../store/slices/authSlice'
import { useTranslation } from '../../hooks/useTranslation'
import { encryptedFetch } from '@/lib/clientEncryption'
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

  const normalizePoints = (value) => {
    const numeric = Number(value ?? 0)
    if (Number.isNaN(numeric) || numeric < 0) return 0
    return numeric
  }

  // Store user in ref for WebSocket handlers to access latest value
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Format date with time (HH:MM)
  const formatDateTime = (dateString, locale = 'en-US') => {
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString(locale)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${dateStr} ${hours}:${minutes}`
  }

  // Code generation form state
  const [showCodeGenerator, setShowCodeGenerator] = useState(false)
  const [codeForm, setCodeForm] = useState({
    accountNumber: '',
    platform: 'exness',
    plan: '' // will be set after plans load
  })
  const [generatingCode, setGeneratingCode] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  // Recently generated (via points) license metadata for modern points panel
  const [recentPointsLicense, setRecentPointsLicense] = useState(null)
  const [myCodes, setMyCodes] = useState([])
  const [loadingCodes, setLoadingCodes] = useState(false)

  // Collapsible card state for mobile
  const [expandedCards, setExpandedCards] = useState({})
  const [isExpiringSoonExpanded, setIsExpiringSoonExpanded] = useState(false)

  // Extend code state
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [selectedCode, setSelectedCode] = useState(null)
  const [extendPlan, setExtendPlan] = useState('30')

  // Buy points modal state
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false)
  const [buyPointsForm, setBuyPointsForm] = useState({
    accountNumber: '',
    platform: 'exness',
    plan: '30'
  })

  // Top-up points modal state
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')

  // Change account number modal state
  const [showChangeAccountModal, setShowChangeAccountModal] = useState(false)
  const [changeAccountForm, setChangeAccountForm] = useState({
    licenseCode: '',
    currentAccountNumber: '',
    newAccountNumber: '',
    cost: 1000
  })
  const [changingAccount, setChangingAccount] = useState(false)

  // Notification state
  const [notifications, setNotifications] = useState([])
  // History state
  const [historyLoading, setHistoryLoading] = useState(false)
  const [purchaseHistory, setPurchaseHistory] = useState([])
  const [extensionHistory, setExtensionHistory] = useState([])
  const [topUpHistory, setTopUpHistory] = useState([])
  const [activeHistoryTab, setActiveHistoryTab] = useState('purchases')

  // Modal state for replacing alerts
  const [alertModalVisible, setAlertModalVisible] = useState(false)
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    type: 'info', // 'info', 'success', 'error', 'warning'
    onConfirm: null
  })

  const showModalAlert = (
    message,
    type = 'info',
    title = null,
    onConfirm = null
  ) => {
    setModalContent({
      title:
        title ||
        (type === 'error'
          ? t('error')
          : type === 'success'
            ? t('success')
            : type === 'warning'
              ? t('warning')
              : t('information')),
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
    const id = Date.now() + Math.random()
    const notification = { id, message, type, closing: false }
    setNotifications((prev) => [...prev, notification])

    // Auto-remove after 5 seconds with collapse animation
    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, closing: true } : n))
      )
      // Remove after animation duration (300ms)
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }, 320)
    }, 5000)
  }
  const [extendingCode, setExtendingCode] = useState(false)
  // Dynamic plans state
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [plansError, setPlansError] = useState(null)

  // Real-time countdown state
  const [currentTime, setCurrentTime] = useState(new Date())

  // WebSocket state
  const [socket, setSocket] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastWsEvent, setLastWsEvent] = useState(null)
  const [joinStatus, setJoinStatus] = useState({
    joined: false,
    attempts: 0,
    rooms: []
  })
  const joinIntervalRef = useRef(null)

  // Function to refresh user data from server
  const refreshUserData = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }

      const data = await response.json()

      // Validate response has user data
      if (!data || !data.user) {
        // console.error('Invalid user data response:', data)
        return
      }

      dispatch(
        loginSuccess({
          id: data.user.id,
          name: data.user.username,
          email: data.user.email || data.user.username,
          points: normalizePoints(data.user.points)
        })
      )
      // console.log('User data refreshed:', data.user)
    } catch (error) {
      console.error('Failed to refresh user data:', error)
    }
  }

  useEffect(() => {
    let isActive = true

    const checkAuth = async () => {
      setIsLoading(true)
      try {
        // console.log('Checking authentication...')
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store'
        })

        if (!isActive) return

        if (!response.ok) {
          throw new Error('Authentication failed')
        }

        const data = await response.json()

        // Validate response has user data
        if (!data || !data.user) {
          // console.error('Invalid auth response:', data)
          throw new Error('Invalid authentication response')
        }

        // console.log('User authenticated:', data.user)
        // console.log('Auth check successful:', data)
        dispatch(
          loginSuccess({
            id: data.user.id,
            name: data.user.username,
            email: data.user.email || data.user.username,
            points: normalizePoints(data.user.points)
          })
        )
        setIsLoading(false)
      } catch (error) {
        if (!isActive) return
        console.error('Auth check error:', error)
        // On authentication error, redirect to login
        router.push('/')
        setIsLoading(false)
      }
    }

    checkAuth()

    return () => {
      isActive = false
    }
  }, [dispatch, router])

  // Fetch user's licenses (unified view)
  const fetchMyCodes = async () => {
    // Starting fetchMyCodes
    setLoadingCodes(true)
    try {
      // Fetch unified licenses (with encryption)
      // Fetching from /api/my-licenses
      const response = await encryptedFetch('/api/my-licenses', {
        credentials: 'include'
      })

      const licensesData = await response.json()

      if (licensesData.licenses) {
        // console.log(
        //   '✅ Fetched unified licenses:',
        //   licensesData.licenses.length,
        //   'licenses'
        // )
        // console.log(
        //   '📊 License statuses:',
        //   licensesData.licenses.map((l) => ({ code: l.code, status: l.status }))
        // )
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
      // console.log('🏁 fetchMyCodes completed')
    }
  }

  // Fetch dynamic plans from API
  const fetchPlans = async () => {
    if (loadingPlans) return
    setLoadingPlans(true)
    setPlansError(null)
    try {
      // console.log('[Plans] Fetching /api/plans ...')
      const response = await encryptedFetch('/api/plans?ts=' + Date.now(), {
        cache: 'no-store'
      })

      const data = await response.json()

      if (response.ok && Array.isArray(data.plans)) {
        // console.log('[Plans] Loaded', data.plans.length, 'plans')
        setPlans(data.plans)
        if (data.plans.length === 0) {
          // Provide fallback defaults so user can still proceed
          const fallback = [
            {
              id: 'fallback-30',
              name: 'Monthly',
              days: 30,
              points: 30,
              price: 30,
              isLifetime: false
            },
            {
              id: 'fallback-90',
              name: 'Quarter',
              days: 90,
              points: 90,
              price: 90,
              isLifetime: false
            }
          ]
          // console.log('[Plans] Using fallback defaults')
          setPlans(fallback)
          // Set default plan in next render to avoid state update during render
          setTimeout(() => {
            setCodeForm((prev) => {
              if (!prev.plan) return { ...prev, plan: '30' }
              return prev
            })
          }, 0)
        } else {
          // Set default plan in next render
          setTimeout(() => {
            setCodeForm((prev) => {
              if (!prev.plan) {
                const defaultPlan = data.plans[0]
                return {
                  ...prev,
                  plan: defaultPlan.isLifetime
                    ? 'lifetime'
                    : String(defaultPlan.days)
                }
              }
              // Check if current plan still exists
              const exists = data.plans.some((p) =>
                prev.plan === 'lifetime'
                  ? p.isLifetime
                  : !p.isLifetime && String(p.days) === prev.plan
              )
              if (!exists) {
                const fallback = data.plans[0]
                return {
                  ...prev,
                  plan: fallback.isLifetime ? 'lifetime' : String(fallback.days)
                }
              }
              return prev
            })
          }, 0)
        }
      } else {
        console.warn('[Plans] Non-OK response', response.status, data)
        setPlansError(data.error || 'Failed to load plans')
        // Fallback still provided so select stays usable
        const fallback = [
          {
            id: 'fallback-30',
            name: 'Monthly',
            days: 30,
            points: 30,
            price: 30,
            isLifetime: false
          },
          {
            id: 'fallback-90',
            name: 'Quarter',
            days: 90,
            points: 90,
            price: 90,
            isLifetime: false
          }
        ]
        setPlans(fallback)
        setTimeout(() => {
          setCodeForm((prev) => {
            if (!prev.plan) return { ...prev, plan: '30' }
            return prev
          })
        }, 0)
      }
    } catch (err) {
      console.error('[Plans] Fetch error:', err)
      setPlansError(err.message)
      const fallback = [
        {
          id: 'fallback-30',
          name: 'Monthly',
          days: 30,
          points: 30,
          price: 30,
          isLifetime: false
        },
        {
          id: 'fallback-90',
          name: 'Quarter',
          days: 90,
          points: 90,
          price: 90,
          isLifetime: false
        }
      ]
      setPlans(fallback)
      setTimeout(() => {
        setCodeForm((prev) => {
          if (!prev.plan) return { ...prev, plan: '30' }
          return prev
        })
      }, 0)
    } finally {
      setLoadingPlans(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, []) // Only fetch once on mount

  const fetchHistory = async () => {
    if (historyLoading) return
    setHistoryLoading(true)
    try {
      // Add cache busting + no-store to ensure freshest extension status after admin actions
      const response = await encryptedFetch(`/api/history?ts=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store'
      })

      const data = await response.json()

      setPurchaseHistory(data.purchases || [])
      setExtensionHistory(data.extensions || [])
      setTopUpHistory(data.topups || [])
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
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3000')
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
        const currentUser = userRef.current
        if (!currentUser) {
          // console.log('⚠️ attemptJoin: user is null/undefined (from ref)')
          return
        }

        // console.log('🔍 User object for join (from ref):', {
        //   id: currentUser.id,
        //   _id: currentUser._id,
        //   name: currentUser.name
        // })

        const idsToTry = []
        if (currentUser.id) idsToTry.push(currentUser.id)
        if (currentUser._id && currentUser._id !== currentUser.id)
          idsToTry.push(currentUser._id)

        if (idsToTry.length === 0) {
          // console.error('❌ No user IDs found to join room!')
          return
        }

        idsToTry.forEach((val) => {
          // console.log('🔗 Attempting join-user for:', val, '(type:', typeof val, ')')
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
          setJoinStatus((st) => (st.joined ? st : st)) // force state read
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
        console.warn(
          '⚠️ WebSocket generic error (landing):',
          err?.message || err
        )
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
            if (user?._id && user._id !== user?.id)
              s.emit('join-user', user._id)
          }, 500)
        } else if (data?.room) {
          setJoinStatus((prev) => {
            const newRooms = prev.rooms.includes(data.room)
              ? prev.rooms
              : [...prev.rooms, data.room]
            const userIdRooms = newRooms.filter((r) => r.startsWith('user-'))
            const joined = userIdRooms.length > 0
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
        console.log('🔔 Received codes-updated event:', payload)
        setLastWsEvent('codes-updated')
        fetchMyCodes()
        fetchHistory() // refresh history real-time
        showNotification(t('license_list_updated'), 'success')
      })

      // Fallback broadcast (in case user room missed join)
      s.on('codes-updated-broadcast', (payload) => {
        console.log('🔔 Received codes-updated-broadcast event:', payload)
        // Only refresh if this broadcast pertains to current user (userId matches) or if unsure
        if (
          !payload?.userId ||
          payload.userId === user?.id ||
          payload.userId === user?._id
        ) {
          setLastWsEvent('codes-updated-broadcast')
          fetchMyCodes()
          fetchHistory()
          showNotification(t('license_updated_broadcast'), 'success')
        }
      })

      s.on('customer-account-updated', (data) => {
        console.log('🔔 Received customer-account-updated event:', data)
        setLastWsEvent('customer-account-updated')
        fetchMyCodes()
        fetchHistory()
      })

      // Broadcast fallback for customer account updates (if user room missed join)
      s.on('customer-account-updated-broadcast', (payload) => {
        console.log(
          '🔔 Received customer-account-updated-broadcast event:',
          payload
        )
        setLastWsEvent('customer-account-updated-broadcast')
        fetchMyCodes()
        fetchHistory()
      })

      // Listen for admin processed extension request broadcasts (in case fallback broadcast hits clients)
      s.on('extension-request-updated-broadcast', (data) => {
        console.log(
          '🔔 Received extension-request-updated-broadcast event:',
          data
        )
        setLastWsEvent('extension-request-updated-broadcast')
        // Proactively refresh history & licenses – event does not always contain userId
        fetchHistory()
        fetchMyCodes()
      })

      s.on('client-notification', (data) => {
        console.log('🔔 Received client-notification event:', data)
        setLastWsEvent('client-notification')
        if (data?.message) {
          showNotification(data.message, data.type || 'info')
          // Heuristic: refresh history on any client notification mentioning license or extension
          const msg = data.message.toLowerCase()
          if (msg.includes('license') || msg.includes('extension')) {
            fetchHistory()
            // Schedule a secondary fetch shortly after to avoid race conditions where DB write
            // completes just after the first fetch
            setTimeout(() => {
              fetchHistory()
            }, 1200)
          }
        }
      })

      s.on('broadcast-notification', (data) => {
        setLastWsEvent('broadcast-notification')
        if (data?.message) {
          showNotification(data.message, data.type || 'info')
        }
      })

      // Points system events
      s.on('points-updated', (data) => {
        console.log('🔔 Received points-updated event:', data)
        setLastWsEvent('points-updated')
        if (data?.newPoints !== undefined) {
          // Update user points in Redux state
          dispatch(
            loginSuccess({
              ...user,
              points: normalizePoints(data.newPoints)
            })
          )
          showNotification(
            `${language === 'th' ? 'เครดิตของคุณได้รับการอัปเดต' : 'Your credits have been updated'}: ${data.newPoints} ${language === 'th' ? 'เครดิต' : 'credits'}`,
            'success'
          )

          // Also refresh user data and history to ensure consistency
          refreshUserData()
          fetchHistory() // Refresh topup history
        }
      })

      // Broadcast fallback for points updates
      s.on('points-updated-broadcast', (data) => {
        // console.log('🔔 Received points-updated-broadcast event:', data)
        setLastWsEvent('points-updated-broadcast')
        if (data?.newPoints !== undefined) {
          dispatch(
            loginSuccess({
              ...user,
              points: normalizePoints(data.newPoints)
            })
          )
          refreshUserData()
          fetchHistory()
        }
      })

      s.on('topup-status-updated', (data) => {
        // console.log('🔔 Received topup-status-updated event:', data)
        setLastWsEvent('topup-status-updated')
        if (data?.status === 'approved' && data?.points) {
          showNotification(
            `${language === 'th' ? 'คำขอเติมเงินได้รับการอนุมัติ!' : 'Top-up request approved!'} +${data.points} ${language === 'th' ? 'เครดิต' : 'credits'}`,
            'success'
          )
          fetchHistory() // Refresh topup history
          // Add delay for DB consistency
          setTimeout(() => {
            fetchHistory()
          }, 1200)
        } else if (data?.status === 'rejected') {
          showNotification(
            `${language === 'th' ? 'คำขอเติมเงินถูกปฏิเสธ' : 'Top-up request rejected'}${data?.reason ? `: ${data.reason}` : ''}`,
            'error'
          )
          fetchHistory() // Refresh topup history even for rejections
        }
      })

      // Listen for new code/license generation events (admin creates license)
      s.on('new-code-generated', (data) => {
        // console.log('🔔 Received new-code-generated event:', data)
        setLastWsEvent('new-code-generated')
        fetchMyCodes()
        fetchHistory() // Refresh purchase history
      })

      // Listen for topup-processed (admin approval confirmation)
      s.on('topup-processed', (data) => {
        // console.log('🔔 Received topup-processed event:', data)
        setLastWsEvent('topup-processed')
        fetchHistory() // Refresh topup history
        refreshUserData() // Update points
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
    if (!socket || !wsConnected) {
      // console.log('⏸️ Skip re-join: socket or wsConnected not ready', {
      //   hasSocket: !!socket,
      //   wsConnected
      // })
      return
    }

    if (!user) {
      // console.log('⏸️ Skip re-join: user not available yet')
      return
    }

    // console.log('🔄 User data available, attempting to join rooms...')

    if (user?.id) {
      // console.log('🔄 Re-joining with user.id:', user.id)
      socket.emit('join-user', user.id)
    }
    if (user?._id && user._id !== user?.id) {
      // console.log('🔄 Re-joining with user._id:', user._id)
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
    // Set default to first available non-lifetime plan or '30'
    const firstNonLifetimePlan = plans.find((p) => !p.isLifetime)
    setExtendPlan(
      firstNonLifetimePlan ? firstNonLifetimePlan.days.toString() : '30'
    )
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
      const response = await encryptedFetch('/api/extend-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: {
          codeId: selectedCode._id,
          extendPlan: extendPlan,
          source: selectedCode.source,
          licenseCode: selectedCode.code
        }
      })

      const data = await response.json()

      if (data.success || data.status) {
        // Check if extension was completed immediately or is pending
        if (data.status === 'completed') {
          showModalAlert(
            `${language === 'th' ? 'ขยายใบอนุญาตสำเร็จ!' : 'License Extended Successfully!'}\n\n${language === 'th' ? 'ใบอนุญาต' : 'License'}: ${data.licenseCode}\n${language === 'th' ? 'วันหมดอายุเดิม' : 'Old expiry'}: ${data.oldExpiry}\n${language === 'th' ? 'วันหมดอายุใหม่' : 'New expiry'}: ${data.newExpiry}\n${language === 'th' ? 'จำนวนวันที่ขยาย' : 'Extended days'}: ${data.extendedDays} ${language === 'th' ? 'วัน' : 'days'}\n${language === 'th' ? 'เครดิตที่ใช้' : 'Credits used'}: ${data.pointsUsed} ${language === 'th' ? 'เครดิต' : 'credits'}\n${language === 'th' ? 'เครดิตคงเหลือ' : 'Remaining credits'}: ${data.remainingPoints} ${language === 'th' ? 'เครดิต' : 'credits'}`,
            'success',
            language === 'th' ? 'ขยายใบอนุญาตสำเร็จ' : 'Extension Successful',
            () => {
              setShowExtendModal(false)
              setSelectedCode(null)
              const firstNonLifetimePlan = plans.find((p) => !p.isLifetime)
              setExtendPlan(
                firstNonLifetimePlan
                  ? firstNonLifetimePlan.days.toString()
                  : '30'
              )
              fetchMyCodes() // Refresh the codes list
              refreshUserData() // Refresh user data to get updated points
              fetchHistory() // Refresh extension history immediately
            }
          )
        } else {
          // Fallback for old pending system (if any old codes still use it)
          showModalAlert(
            `Extension request submitted successfully!\n\nLicense: ${data.licenseCode}\nCurrent expiry: ${data.currentExpiry}\nRequested extension: ${data.requestedDays} days\nStatus: Pending admin approval\n\nPlease wait for admin verification before the extension takes effect.`,
            'success',
            'Extension Request Submitted',
            () => {
              setShowExtendModal(false)
              setSelectedCode(null)
              const firstNonLifetimePlan = plans.find((p) => !p.isLifetime)
              setExtendPlan(
                firstNonLifetimePlan
                  ? firstNonLifetimePlan.days.toString()
                  : '30'
              )
              fetchMyCodes() // Refresh the codes list
            }
          )
        }
      }
    } catch (error) {
      console.error('Error extending code:', error)
      showModalAlert(error.message || 'Failed to extend code', 'error')
    } finally {
      setExtendingCode(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Call logout API to clear cookie
      await encryptedFetch('/api/auth/logout', {
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

  // Change account number handlers
  const handleChangeAccount = async (license) => {
    try {
      // Fetch current settings and user credits
      const response = await encryptedFetch('/api/change-account-number', {
        credentials: 'include'
      })

      const data = await response.json()

      if (!data.success) {
        showModalAlert(data.error || 'Failed to load settings', 'error')
        return
      }

      if (!data.data.enabled) {
        showModalAlert(
          language === 'th'
            ? 'ฟีเจอร์การเปลี่ยนหมายเลขบัญชีปิดใช้งานชั่วคราว'
            : 'Account number change feature is temporarily disabled',
          'warning'
        )
        return
      }

      setChangeAccountForm({
        licenseCode: license.code,
        currentAccountNumber: license.accountNumber,
        newAccountNumber: '',
        cost: data.data.cost
      })
      setShowChangeAccountModal(true)
    } catch (error) {
      showModalAlert('Failed to load change account settings', 'error')
    }
  }

  const submitChangeAccount = async (e) => {
    e.preventDefault()

    if (!changeAccountForm.newAccountNumber.trim()) {
      showModalAlert(
        language === 'th'
          ? 'กรุณาใส่หมายเลขบัญชีใหม่'
          : 'Please enter new account number',
        'warning'
      )
      return
    }

    if (
      changeAccountForm.newAccountNumber ===
      changeAccountForm.currentAccountNumber
    ) {
      showModalAlert(
        language === 'th'
          ? 'หมายเลขบัญชีใหม่ต้องแตกต่างจากหมายเลขเดิม'
          : 'New account number must be different from current one',
        'warning'
      )
      return
    }

    setChangingAccount(true)
    try {
      const response = await encryptedFetch('/api/change-account-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: {
          licenseCode: changeAccountForm.licenseCode,
          newAccountNumber: changeAccountForm.newAccountNumber
        }
      })

      const data = await response.json()

      showModalAlert(
        `${language === 'th' ? 'เปลี่ยนหมายเลขบัญชีสำเร็จ!' : 'Account Number Changed Successfully!'}\n\n${language === 'th' ? 'ใบอนุญาต' : 'License'}: ${data.data.licenseCode}\n${language === 'th' ? 'หมายเลขเดิม' : 'Old number'}: ${data.data.oldAccountNumber}\n${language === 'th' ? 'หมายเลขใหม่' : 'New number'}: ${data.data.newAccountNumber}\n${language === 'th' ? 'เครดิตที่ใช้' : 'Credits used'}: ${data.data.creditsDeducted} ${language === 'th' ? 'เครดิต' : 'credits'}\n${language === 'th' ? 'เครดิตคงเหลือ' : 'Remaining credits'}: ${data.data.remainingCredits} ${language === 'th' ? 'เครดิต' : 'credits'}`,
        'success',
        language === 'th' ? 'เปลี่ยนหมายเลขบัญชีสำเร็จ' : 'Change Successful',
        () => {
          setShowChangeAccountModal(false)
          setChangeAccountForm({
            licenseCode: '',
            currentAccountNumber: '',
            newAccountNumber: '',
            cost: 1000
          })
          fetchMyCodes() // Refresh licenses
          refreshUserData() // Refresh points
        }
      )
    } catch (error) {
      console.error('Error changing account number:', error)

      // Check if it's an insufficient credits error
      if (error.required && error.current) {
        showModalAlert(
          `${language === 'th' ? 'เครดิตไม่เพียงพอ!' : 'Insufficient Credits!'}\n\n${language === 'th' ? 'ต้องการ' : 'Required'}: ${error.required} ${language === 'th' ? 'เครดิต' : 'credits'}\n${language === 'th' ? 'มีอยู่' : 'Current'}: ${error.current} ${language === 'th' ? 'เครดิต' : 'credits'}\n${language === 'th' ? 'ขาด' : 'Need'}: ${error.required - error.current} ${language === 'th' ? 'เครดิตเพิ่ม' : 'more credits'}`,
          'error'
        )
      } else {
        showModalAlert(
          error.message || 'Failed to change account number',
          'error'
        )
      }
    } finally {
      setChangingAccount(false)
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
      const response = await encryptedFetch('/api/purchase-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: {
          accountNumber: codeForm.accountNumber,
          platform: codeForm.platform,
          plan: codeForm.plan
        }
      })

      const data = await response.json()

      if (data.success || data.license) {
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

  // Points System Functions
  const handleTopUpRequest = async (amount) => {
    try {
      const response = await encryptedFetch('/api/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: {
          amount,
          paymentMethod: 'admin_review', // Will be reviewed by admin before approval
          paymentProof: '',
          transactionRef: ''
        }
      })

      const data = await response.json()

      showModalAlert(
        `${language === 'th' ? 'ส่งคำขอเติมเงินสำเร็จ!' : 'Top-up request submitted successfully!'}\n\n${language === 'th' ? 'จำนวนเงิน' : 'Amount'}: $${amount}\n${language === 'th' ? 'เครดิตที่จะได้รับ' : 'Credits to receive'}: ${amount}\n\n${language === 'th' ? 'รอแอดมินอนุมัติเพื่อรับเครดิต' : 'Please wait for admin approval to receive credits'}`,
        'success',
        language === 'th' ? 'คำขอเติมเงิน' : 'Top-up Request'
      )
      // Clear the input
      const topupInput = document.getElementById('topupAmount')
      if (topupInput) {
        topupInput.value = ''
      }
    } catch (error) {
      console.error('Network error submitting top-up request:', error)
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      })

      showModalAlert(
        `${
          language === 'th'
            ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
            : 'Network error. Please try again.'
        }\n\nError: ${error.message}`,
        'error'
      )
    }
  }

  const handlePointsPurchase = async (selectedPlanValue, accountNumber) => {
    // Resolve selected plan object
    const selectedPlan = plans.find((p) =>
      selectedPlanValue === 'lifetime'
        ? p.isLifetime
        : !p.isLifetime && String(p.days) === String(selectedPlanValue)
    )
    if (!selectedPlan) {
      showModalAlert(
        language === 'th' ? 'ไม่พบแผนที่เลือก' : 'Selected plan not found',
        'error'
      )
      return
    }

    const requiredPoints = selectedPlan.points
    const userPoints = user?.points || 0

    if (userPoints < requiredPoints) {
      showModalAlert(
        `${language === 'th' ? 'เครดิตไม่เพียงพอ' : 'Insufficient credits'}\n\n${language === 'th' ? 'เครดิตที่ต้องการ' : 'Credits needed'}: ${requiredPoints}\n${language === 'th' ? 'เครดิตที่มี' : 'Credits available'}: ${userPoints}\n\n${language === 'th' ? 'กรุณาเติมเงินเพื่อรับเครดิตเพิ่ม' : 'Please top-up to get more credits'}`,
        'warning',
        language === 'th' ? 'เครดิตไม่เพียงพอ' : 'Insufficient Credits'
      )
      return
    }

    setGeneratingCode(true)
    try {
      const response = await encryptedFetch('/api/purchase-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: {
          accountNumber,
          platform: codeForm.platform,
          plan: selectedPlan.isLifetime
            ? 'lifetime'
            : String(selectedPlan.days),
          pointsUsed: requiredPoints
        }
      })

      const data = await response.json()

      dispatch(
        loginSuccess({
          ...user,
          points: normalizePoints(data.license.remainingPoints)
        })
      )
      setGeneratedCode(data.license.code)
      fetchMyCodes()

      const planLabel = selectedPlan.isLifetime
        ? language === 'th'
          ? 'ตลอดชีพ'
          : 'Lifetime'
        : `${selectedPlan.days} ${language === 'th' ? 'วัน' : 'days'}`

      showModalAlert(
        `${language === 'th' ? '🎉 ซื้อและเปิดใช้งานใบอนุญาตสำเร็จ!' : '🎉 License purchased and activated successfully!'}\n\n${language === 'th' ? 'รหัสใบอนุญาต' : 'License Code'}: ${data.license.code}\n${language === 'th' ? 'แพลน' : 'Plan'}: ${planLabel}\n${language === 'th' ? 'เครดิตที่ใช้' : 'Credits used'}: ${requiredPoints}\n${language === 'th' ? 'เครดิตคงเหลือ' : 'Remaining credits'}: ${data.license.remainingPoints}\n${language === 'th' ? 'สถานะ' : 'Status'}: ${language === 'th' ? '✅ เปิดใช้งานแล้ว' : '✅ Activated'}\n\n${language === 'th' ? '🚀 บัญชีของคุณพร้อมใช้งานทันที!' : '🚀 Your account is ready to use immediately!'}`,
        'success',
        language === 'th' ? 'ซื้อใบอนุญาต' : 'License Activated'
      )
      setRecentPointsLicense({
        code: data.license.code,
        plan: data.license.plan,
        remainingPoints: data.license.remainingPoints,
        expiresAtThai: data.license.expireDateThai
      })
      const acctEl = document.getElementById('pointsAccountNumber')
      if (acctEl) acctEl.value = ''
    } catch (error) {
      console.error('Error purchasing with points:', error)
      showModalAlert(
        error.message ||
          (language === 'th'
            ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
            : 'Network error. Please try again.'),
        'error'
      )
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
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 pb-8">
        {/* Navigation Bar - Redesigned for Mobile */}
        <nav className="bg-white shadow-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-0 sm:h-16">
              {/* Left: Dashboard Title with Icon */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-sm sm:text-xl font-bold text-gray-900">
                    {t('dashboard')}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                    {t('welcome')}, {user?.name}
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Language Toggle */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                  {['en', 'th'].map((l) => (
                    <button
                      key={l}
                      onClick={() => changeLanguage(l)}
                      className={`px-2 sm:px-3 py-1 text-[10px] sm:text-sm rounded-md font-bold transition-all duration-200 ${
                        language === l
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black shadow-md scale-105'
                          : 'bg-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Logout Button - Redesigned for Mobile */}
                <button
                  onClick={handleLogout}
                  className="group relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-base font-medium sm:font-semibold shadow-md hover:shadow-lg flex items-center gap-1 sm:gap-2"
                >
                  <svg
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="hidden sm:inline">{t('logout')}</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-12 px-3 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t('welcome_dashboard_heading')}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-4 sm:mb-8">
              {t('dashboard_subtitle')}
            </p>
          </div>

          {/* Purchase Trading License component hidden (commented) per request; retained for future use */}
          {false && (
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-2xl shadow-2xl mb-8 text-white">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                  }}
                />
              </div>

              <div className="relative p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
                  <div className="mb-6 lg:mb-0">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-3xl lg:text-4xl font-bold">
                          {t('purchase_trading_license')}
                        </h2>
                        <p className="text-purple-200 mt-1 text-lg">
                          {t('purchase_subtitle')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">
                        {t('live_trading')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                      <svg
                        className="w-4 h-4 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {t('premium')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
                  {/* Account Number Input */}
                  <div className="relative">
                    <label className="block text-purple-200 text-sm font-semibold mb-3 flex items-center">
                      <svg
                        className="w-4 h-4 mr-2 text-purple-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      {t('trading_account_number')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="accountNumber"
                        value={codeForm.accountNumber}
                        onChange={handleCodeFormChange}
                        onKeyPress={(e) => {
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault()
                          }
                        }}
                        placeholder={t('enter_account_number_placeholder')}
                        className="w-full px-4 py-3 pl-11 rounded-xl bg-white/95 backdrop-blur-sm text-gray-900 placeholder-gray-500 border border-white/20 focus:ring-2 focus:ring-purple-300 focus:border-transparent focus:bg-white transition-all duration-300 shadow-lg"
                        required
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Platform Selection */}
                  <div className="relative">
                    <label className="block text-purple-200 text-sm font-semibold mb-3 flex items-center">
                      <svg
                        className="w-4 h-4 mr-2 text-purple-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
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
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Plan Selection */}
                  <div className="relative">
                    <label className="block text-purple-200 text-sm font-semibold mb-3 flex items-center">
                      <svg
                        className="w-4 h-4 mr-2 text-purple-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
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
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
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
                          <svg
                            className="animate-spin -ml-1 mr-3 h-6 w-6"
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
                          <span className="text-lg">
                            {t('purchasing_license')}
                          </span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          <span className="text-lg">
                            {t('purchase_license_now')}
                          </span>
                        </>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center text-purple-200 text-sm">
                    <svg
                      className="w-4 h-4 mr-2 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {t('instant_activation')}
                  </div>
                </div>

                {generatedCode && (
                  <div className="mt-8 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-green-400/20 to-emerald-400/20 px-6 py-4 border-b border-white/10">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-white mb-1">
                            {t('license_created_success')}
                          </h3>
                          <p className="text-green-200 text-sm">
                            {t('license_ready_for_payment_activation')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl p-4 border border-gray-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-200 text-sm font-medium">
                            {t('license_code')}
                          </span>
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(generatedCode)
                            }
                            className="text-purple-300 hover:text-white transition-colors duration-200 p-1 rounded-lg hover:bg-white/10"
                            title={t('copy_to_clipboard')}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="bg-black/30 rounded-lg p-4 font-mono text-2xl font-bold tracking-wider text-center text-white border border-gray-500/30">
                          {generatedCode}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                        <div className="flex items-center text-purple-200">
                          <svg
                            className="w-4 h-4 mr-2 text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {t('activate_within_24h')}
                        </div>
                        <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                        <div className="flex items-center text-purple-200">
                          <svg
                            className="w-4 h-4 mr-2 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12l2 2 4-4m5.99-4.99v0A9 9 0 1120 12h-4"
                            />
                          </svg>
                          {t('secure_payment_required')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modern Points System - Redesigned */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 rounded-3xl shadow-2xl mb-12">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
              />
            </div>

            <div className="relative p-8 lg:p-12">
              {/* Header */}
              <div className="flex flex-col lg:flex-row items-center justify-between mb-8">
                <div className="text-center lg:text-left mb-6 lg:mb-0">
                  <div className="flex items-center justify-center lg:justify-start mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mr-4 shadow-xl">
                      <svg
                        className="w-7 h-7 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-3xl lg:text-4xl font-bold text-white">
                        {language === 'th'
                          ? 'ซื้อใบอนุญาตเทรด'
                          : 'Buy Trading License'}
                      </h2>
                      <p className="text-purple-200 text-lg">
                        {language === 'th'
                          ? 'ปลดล็อคความสามารถในการเทรดแบบมืออาชีพทันที'
                          : 'Unlock professional trading capabilities instantly'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Points Balance Display */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center lg:text-right">
                  <p className="text-purple-200 text-sm font-medium mb-1">
                    {language === 'th' ? 'เครดิตของคุณ' : 'Your Credits'}
                  </p>
                  <div className="text-4xl font-black text-white mb-2">
                    {user?.points || 0}
                    <span className="text-lg font-semibold ml-2 opacity-80">
                      {language === 'th' ? 'เครดิต' : 'CRD'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Form Grid */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                {/* Trading Account Input */}
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-3 flex items-center">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {language === 'th'
                      ? 'หมายเลขบัญชีเทรด'
                      : 'Trading Account Number'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      language === 'th'
                        ? 'กรอกหมายเลขบัญชีของคุณ'
                        : 'Enter your account number'
                    }
                    onKeyPress={(e) => {
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-white/95 text-gray-900 placeholder-gray-500 border border-white/20 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300"
                    id="pointsAccountNumber"
                    required
                  />
                </div>

                {/* Platform Selection */}
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-3 flex items-center">
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
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    {language === 'th' ? 'แพลตฟอร์มเทรด' : 'Trading Platform'}
                  </label>
                  <select
                    name="platform"
                    value={codeForm.platform}
                    onChange={handleCodeFormChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/95 text-gray-900 border border-white/20 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300"
                  >
                    <option value="exness">Exness</option>
                    <option value="xm">XM</option>
                    <option value="ic-markets">IC Markets</option>
                    <option value="pepperstone">Pepperstone</option>
                    <option value="fxpro">FxPro</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Plan Selection (Points Purchase) */}
                <div>
                  <label className="block text-purple-200 text-sm font-semibold mb-3 flex items-center">
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {language === 'th'
                      ? 'แผนการสมัครสมาชิก'
                      : 'Subscription Plan'}
                  </label>
                  {plansError && (
                    <div className="text-xs text-red-200 mb-2">
                      {language === 'th'
                        ? 'โหลดแผนไม่สำเร็จ'
                        : 'Failed to load plans'}
                      : {plansError}
                    </div>
                  )}
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 border-2 border-yellow-400 focus:ring-4 focus:ring-yellow-300 focus:border-yellow-500 transition-all duration-300 cursor-pointer hover:bg-yellow-50"
                      id="pointsPlan"
                      value={codeForm.plan}
                      onChange={(e) => {
                        console.log('[Plan Select] Changed to:', e.target.value)
                        setCodeForm((prev) => ({
                          ...prev,
                          plan: e.target.value
                        }))
                      }}
                    >
                      {loadingPlans && (
                        <option>
                          {language === 'th'
                            ? 'กำลังโหลด...'
                            : 'Loading plans...'}
                        </option>
                      )}
                      {!loadingPlans && plans.length === 0 && (
                        <option value="">
                          {language === 'th'
                            ? 'ไม่มีแผนพร้อมใช้งาน'
                            : 'No plans available'}
                        </option>
                      )}
                      {plans.map((p) => (
                        <option
                          key={p.id}
                          value={p.isLifetime ? 'lifetime' : p.days}
                        >
                          {p.isLifetime
                            ? `${p.name} - ${language === 'th' ? 'ตลอดชีพ' : 'Lifetime'} - ${p.points} ${language === 'th' ? 'เครดิต' : 'Crd'}`
                            : `${p.name || p.days + ' days'} - ${p.days} ${language === 'th' ? 'วัน' : 'Days'} - ${p.points} ${language === 'th' ? 'เครดิต' : 'Pts'}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Points Indicator Below Dropdown */}
                  {(() => {
                    const selected = plans.find((p) =>
                      codeForm.plan === 'lifetime'
                        ? p.isLifetime
                        : !p.isLifetime && String(p.days) === codeForm.plan
                    )
                    if (selected) {
                      const hasEnough = (user?.points || 0) >= selected.points
                      return (
                        <div
                          className={`text-xs mt-2 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${hasEnough ? 'bg-green-400/20 text-green-200' : 'bg-red-400/20 text-red-200'}`}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>
                            {language === 'th' ? 'ต้องการ' : 'Needs'}{' '}
                            <strong>{selected.points}</strong>{' '}
                            {language === 'th' ? 'เครดิต' : 'pts'} •{' '}
                            {language === 'th' ? 'คุณมี' : 'You have'}{' '}
                            <strong>{user?.points || 0}</strong>
                          </span>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Buy with Points Button */}
                <button
                  onClick={() => {
                    // console.log('[Buy Button] Clicked')
                    const plan = document.getElementById('pointsPlan').value
                    const accountNumber = document.getElementById(
                      'pointsAccountNumber'
                    )?.value
                    const platform = codeForm.platform

                    // console.log('[Buy Button] Values:', {
                    //   plan,
                    //   accountNumber,
                    //   platform,
                    //   userPoints: user?.points
                    // })

                    if (!accountNumber) {
                      showModalAlert(
                        language === 'th'
                          ? 'กรุณากรอกหมายเลขบัญชี'
                          : 'Please enter account number',
                        'warning'
                      )
                      return
                    }

                    // Set form data and show modal for confirmation
                    setBuyPointsForm({
                      accountNumber,
                      platform,
                      plan
                    })
                    setShowBuyPointsModal(true)
                  }}
                  disabled={(() => {
                    if (generatingCode || !codeForm.plan) {
                      // console.log(
                      //   '[Buy Button] Disabled: generating or no plan',
                      //   { generatingCode, plan: codeForm.plan }
                      // )
                      return true
                    }
                    const selected = plans.find((p) =>
                      codeForm.plan === 'lifetime'
                        ? p.isLifetime
                        : !p.isLifetime && String(p.days) === codeForm.plan
                    )
                    if (!selected) {
                      // console.log(
                      //   '[Buy Button] Disabled: plan not found in list',
                      //   {
                      //     searchingFor: codeForm.plan,
                      //     availablePlans: plans.map((p) => ({
                      //       days: p.days,
                      //       isLifetime: p.isLifetime
                      //     }))
                      //   }
                      // )
                      return true
                    }
                    const needed = selected.points
                    const hasEnough = (user?.points || 0) >= needed
                    // console.log('[Buy Button] Points check:', {
                    //   needed,
                    //   userPoints: user?.points,
                    //   hasEnough
                    // })
                    return !hasEnough
                  })()}
                  className="flex-1 group relative bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center shadow-2xl hover:shadow-yellow-500/25 transform hover:-translate-y-1 disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-2xl blur opacity-30 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative flex items-center">
                    {generatingCode ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-6 w-6"
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
                        <span className="text-lg">
                          {language === 'th'
                            ? 'กำลังสร้าง...'
                            : 'Generating...'}
                        </span>
                      </>
                    ) : (() => {
                        // Determine required points for selected plan
                        const selected = plans.find((p) =>
                          codeForm.plan === 'lifetime'
                            ? p.isLifetime
                            : !p.isLifetime && String(p.days) === codeForm.plan
                        )
                        const needed = selected
                          ? selected.points
                          : parseInt(codeForm.plan || '0', 10)
                        return (user?.points || 0) < needed
                      })() ? (
                      <>
                        <svg
                          className="w-6 h-6 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        <span className="text-lg">
                          {language === 'th'
                            ? 'เครดิตไม่เพียงพอ'
                            : 'Insufficient Points'}
                        </span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <span className="text-lg">
                          {language === 'th'
                            ? 'ซื้อด้วยเครดิตทันที'
                            : 'Buy with Credits Now'}
                        </span>
                      </>
                    )}
                  </div>
                </button>

                {/* Top-up Points Button - Redesigned */}
                <button
                  onClick={() => {
                    setTopUpAmount('')
                    setShowTopUpModal(true)
                  }}
                  className="group flex-1 relative bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 hover:from-green-500 hover:via-emerald-600 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center shadow-xl hover:shadow-2xl hover:shadow-green-500/50 transform hover:-translate-y-1 hover:scale-105 overflow-hidden"
                >
                  {/* Animated background shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                  {/* Icon with animation */}
                  <div className="relative mr-3 bg-white/20 rounded-full p-2 group-hover:rotate-90 transition-transform duration-300">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>

                  {/* Text content */}
                  <div className="relative flex flex-col items-start">
                    <span className="text-lg font-extrabold tracking-wide">
                      {language === 'th' ? 'เติมเครดิต' : 'Top-up Credits'}
                    </span>
                    <span className="text-xs font-normal opacity-90">
                      {language === 'th'
                        ? 'เติมเงิน รับเครดิตทันที'
                        : 'Add funds, get credits'}
                    </span>
                  </div>

                  {/* Arrow indicator */}
                  <svg
                    className="w-5 h-5 ml-3 relative group-hover:translate-x-1 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>
              </div>

              {/* Info Cards */}
              {/* <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="w-10 h-10 bg-green-400 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold mb-1">{language === 'th' ? 'เปิดใช้งานทันที' : 'Instant Activation'}</h3>
                  <p className="text-purple-200 text-sm">{language === 'th' ? 'ไม่ต้องรอการชำระเงิน' : 'No payment waiting'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="w-10 h-10 bg-blue-400 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold mb-1">{language === 'th' ? 'ปลอดภัย 100%' : '100% Secure'}</h3>
                  <p className="text-purple-200 text-sm">{language === 'th' ? 'การเข้ารหัส SSL' : 'SSL Encryption'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="w-10 h-10 bg-purple-400 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold mb-1">{language === 'th' ? 'อัตราแลกเปลี่ยน' : 'Exchange Rate'}</h3>
                  <p className="text-purple-200 text-sm">1 {language === 'th' ? 'เครดิต' : 'Credit'} = 1 {language === 'th' ? 'วัน' : 'Day'}</p>
                </div>
              </div> */}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-400 mt-0.5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  {language === 'th'
                    ? 'วิธีใช้งานระบบเครดิต'
                    : 'How Points System Works'}
                </h3>
                <div className="text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      {language === 'th'
                        ? 'เติมเงิน: ส่งคำขอเติมเงิน รอแอดมินอนุมัติ'
                        : 'Top-up: Submit request, wait for admin approval'}
                    </li>
                    <li>
                      {language === 'th'
                        ? 'อัตราแลกเปลี่ยน: 1 THB = 1 เครดิต'
                        : 'Exchange rate: 1 THB = 1 Credit'}
                    </li>
                    <li>
                      {language === 'th'
                        ? 'ซื้อใบอนุญาต: ใช้เครดิตซื้อได้ทันที ไม่ต้องรอการชำระเงิน'
                        : 'Buy license: Use credits instantly, no payment waiting'}
                    </li>
                    <li>
                      {language === 'th'
                        ? 'ใบอนุญาตจะเปิดใช้งานทันทีหลังจากซื้อ'
                        : 'License activates immediately after purchase'}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Trading Licenses Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {t('my_trading_licenses') || t('license_header')}
            </h2>
          </div>

          {/* Quick Status Overview */}
          {myCodes.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {myCodes.filter((code) => code.status === 'activated').length}
                </div>
                <div className="text-xs sm:text-sm text-green-700">
                  {t('active_licenses')}
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                  {
                    myCodes.filter((code) => code.status === 'pending_payment')
                      .length
                  }
                </div>
                <div className="text-xs sm:text-sm text-yellow-700">
                  {t('pending_payment')}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-600">
                  {
                    myCodes.filter(
                      (code) =>
                        code.status === 'expired' || code.status === 'cancelled'
                    ).length
                  }
                </div>
                <div className="text-xs sm:text-sm text-gray-700">
                  {t('expired_cancelled')}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
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
                <div className="text-xs sm:text-sm text-blue-700">
                  {t('expiring_soon')}
                </div>
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
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {myCodes.map((code) => {
                  const timeRemaining =
                    code.status === 'activated' ? getTimeRemaining(code) : null
                  const isExpanded = expandedCards[code._id] || false
                  
                  return (
                    <div
                      key={code._id}
                      className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
                    >
                      {/* Compact Header - Always Visible */}
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-mono text-xs text-blue-600 font-bold break-all flex-1 mr-2">
                            {code.code}
                          </div>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
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
                        </div>
                        
                        {/* Quick Info */}
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                          <span className="capitalize">{code.platform}</span>
                          {code.status === 'activated' && timeRemaining && (
                            <span className={`font-semibold ${timeRemaining.expired ? 'text-red-600' : timeRemaining.days < 7 ? 'text-orange-600' : 'text-green-600'}`}>
                              {timeRemaining.expired
                                ? t('expired')
                                : `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m`}
                            </span>
                          )}
                        </div>
                        
                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => setExpandedCards(prev => ({ ...prev, [code._id]: !prev[code._id] }))}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span>{isExpanded ? (language === 'th' ? 'ซ่อนรายละเอียด' : 'Hide Details') : (language === 'th' ? 'ดูรายละเอียด' : 'Show Details')}</span>
                          <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="p-3 border-t border-gray-100 animate-fade-in">
                          {/* Info Grid */}
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between items-center text-sm gap-2">
                              <span className="text-gray-600 whitespace-nowrap">
                                {t('account_header')}:
                              </span>
                              <span className="text-gray-900 font-medium text-right break-all">
                                {code.accountNumber}
                              </span>
                            </div>
                            <div className="flex justify-between items-start text-sm gap-2">
                              <span className="text-gray-600 whitespace-nowrap">
                                {t('plan_header')}:
                              </span>
                              <span className="text-gray-900 font-medium text-right">
                                {code.cumulativePlanDays &&
                                code.cumulativePlanDays > code.plan ? (
                                  <>
                                    {code.plan} {t('days')} (+
                                    {code.cumulativePlanDays - code.plan}) ={' '}
                                    {code.cumulativePlanDays} {t('days')}
                                  </>
                                ) : (
                                  <>
                                    {code.plan} {t('days')}
                                  </>
                                )}
                              </span>
                            </div>
                            {code.status === 'activated' && timeRemaining && (
                              <>
                                <div className="flex justify-between items-center text-sm gap-2">
                                  <span className="text-gray-600 whitespace-nowrap">
                                    {t('expires_header')}:
                                  </span>
                                  <span className="text-gray-900 text-xs text-right">
                                    {(() => {
                                      let expiryDate = null
                                      if (code.customerAccount?.expireDate) {
                                        expiryDate = parseThaiDate(
                                          code.customerAccount.expireDate
                                        )
                                      } else if (code.expireDate) {
                                        expiryDate = parseThaiDate(code.expireDate)
                                      } else if (code.expiresAt) {
                                        expiryDate = new Date(code.expiresAt)
                                      }
                                      return expiryDate &&
                                        !isNaN(expiryDate.getTime())
                                        ? expiryDate.toLocaleDateString()
                                        : 'N/A'
                                    })()}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => handleExtendLicense(code)}
                              disabled={code.status !== 'activated'}
                              className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition"
                            >
                              {t('extend')}
                            </button>
                            <button
                              onClick={() => handleChangeAccount(code)}
                              disabled={code.status !== 'activated'}
                              className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition"
                            >
                              {t('change_account_btn')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        {t('license_header')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        {t('platform_header')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        {t('account_header')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        {t('plan_header')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        {t('status_header')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        {t('expires_header')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        {t('time_left_header')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                        {t('actions_header')}
                      </th>
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
                            {code.cumulativePlanDays &&
                            code.cumulativePlanDays > code.plan ? (
                              <div className="flex flex-col leading-tight">
                                <span>
                                  {code.plan} {t('days') || 'days'}
                                  <span className="text-xs text-gray-500 ml-1">
                                    (+{code.cumulativePlanDays - code.plan})
                                  </span>
                                </span>
                                <span className="text-xs text-gray-500">
                                  = {code.cumulativePlanDays}{' '}
                                  {t('days') || 'days'}
                                </span>
                              </div>
                            ) : (
                              <span>
                                {code.plan} {t('days') || 'days'}
                              </span>
                            )}
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
                                    displayDate =
                                      expiryDate.toLocaleDateString()
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
                                          {timeRemaining.days !== 1
                                            ? 's'
                                            : ''}{' '}
                                          left
                                        </div>
                                      )}
                                  </div>
                                )
                              })()
                            ) : code.status === 'pending_payment' ? (
                              <span className="text-gray-400 text-xs">
                                {t('pay_to_see_countdown')}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {code.status === 'activated' && (
                                <>
                                  <button
                                    onClick={() => handleExtendLicense(code)}
                                    className="px-3 py-1 rounded text-xs transition duration-200 bg-green-500 hover:bg-green-600 text-white"
                                  >
                                    {t('extend')}
                                  </button>
                                  <button
                                    onClick={() => handleChangeAccount(code)}
                                    className="px-3 py-1 rounded text-xs transition duration-200 bg-blue-500 hover:bg-blue-600 text-white"
                                  >
                                    {language === 'th'
                                      ? 'เปลี่ยนบัญชี'
                                      : 'Change Account'}
                                  </button>
                                </>
                              )}
                              {code.status === 'pending_payment' && (
                                <span className="text-xs text-gray-400">
                                  {t('pay_to_activate')}
                                </span>
                              )}
                              {code.status === 'expired' && (
                                <span className="text-xs text-red-400">
                                  {t('expired')}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Expiring Soon Alert - Collapsible on Mobile */}
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
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl sm:rounded-2xl overflow-hidden mb-6 shadow-md">
                  {/* Header - Always Visible on Mobile, clickable dropdown trigger */}
                  <button
                    onClick={() => setIsExpiringSoonExpanded(!isExpiringSoonExpanded)}
                    className="w-full sm:cursor-default"
                  >
                    <div className="p-3 sm:p-4 flex items-center justify-between hover:bg-orange-100/50 sm:hover:bg-transparent transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm sm:text-lg font-bold text-orange-800">
                            {t('licenses_expiring_soon')}
                          </h3>
                          <p className="text-xs text-orange-600 mt-0.5">
                            {expiringSoon.length} {language === 'th' ? 'ใบอนุญาต' : 'license(s)'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Chevron - Only on mobile */}
                      <div className="block sm:hidden">
                        <svg
                          className={`w-5 h-5 text-orange-600 transition-transform ${isExpiringSoonExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Content - Collapsible on Mobile, Always Visible on Desktop */}
                  <div className={`${isExpiringSoonExpanded ? 'block' : 'hidden'} sm:block border-t border-orange-200`}>
                    <div className="p-3 sm:p-4 space-y-2 bg-white/50">
                      {expiringSoon.map((license) => {
                        const timeRemaining = getTimeRemaining(license)
                        return (
                          <div
                            key={license._id}
                            className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-orange-100 hover:shadow-md transition-shadow"
                          >
                            {/* Mobile Layout */}
                            <div className="block sm:hidden space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-mono text-xs font-bold text-blue-600 break-all flex-1">
                                  {license.code}
                                </span>
                                <span
                                  className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                                    timeRemaining.days <= 1
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-orange-100 text-orange-700'
                                  }`}
                                >
                                  {timeRemaining.timeLeft}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span className="capitalize">{license.platform}</span>
                                <span className="text-gray-400">•</span>
                                <span className="break-all">{license.accountNumber}</span>
                              </div>
                              <button
                                onClick={() => handleExtendLicense(license)}
                                className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white transition shadow-sm"
                              >
                                {t('extend_now')}
                              </button>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden sm:flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
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
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}
        </div>

        {/* History Section - Redesigned */}
        <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-8 border border-gray-200">
          {/* Header with animated icon */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div className="flex items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl blur opacity-30 animate-pulse"></div>
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {t('history_title')}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {language === 'th'
                    ? 'ติดตามธุรกรรมและกิจกรรมทั้งหมดของคุณ'
                    : 'Track all your transactions and activities'}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation - Slim on Mobile, Normal on Desktop */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-6 bg-white rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-inner">
            <button
              onClick={() => setActiveHistoryTab('purchases')}
              className={`flex-1 min-w-[80px] sm:min-w-[140px] px-2 sm:px-4 py-1.5 sm:py-3 rounded-md sm:rounded-lg font-medium sm:font-semibold transition-all duration-200 sm:duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base ${
                activeHistoryTab === 'purchases'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md sm:shadow-lg sm:scale-105'
                  : 'bg-transparent text-gray-600 hover:bg-gray-50 sm:hover:bg-gray-100'
              }`}
            >
              <svg
                className="w-3.5 h-3.5 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="hidden sm:inline">{t('purchase_history')}</span>
              <span className="inline sm:hidden">
                {language === 'th' ? 'ซื้อ' : 'Buy'}
              </span>
              <span
                className={`text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold ${
                  activeHistoryTab === 'purchases'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {purchaseHistory.length}
              </span>
            </button>

            <button
              onClick={() => setActiveHistoryTab('extensions')}
              className={`flex-1 min-w-[80px] sm:min-w-[140px] px-2 sm:px-4 py-1.5 sm:py-3 rounded-md sm:rounded-lg font-medium sm:font-semibold transition-all duration-200 sm:duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base ${
                activeHistoryTab === 'extensions'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md sm:shadow-lg sm:scale-105'
                  : 'bg-transparent text-gray-600 hover:bg-gray-50 sm:hover:bg-gray-100'
              }`}
            >
              <svg
                className="w-3.5 h-3.5 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="hidden sm:inline">{t('extension_history')}</span>
              <span className="inline sm:hidden">
                {language === 'th' ? 'ขยาย' : 'Ext'}
              </span>
              <span
                className={`text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold ${
                  activeHistoryTab === 'extensions'
                    ? 'bg-white/20 text-white'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {extensionHistory.length}
              </span>
            </button>

            <button
              onClick={() => setActiveHistoryTab('topups')}
              className={`flex-1 min-w-[80px] sm:min-w-[140px] px-2 sm:px-4 py-1.5 sm:py-3 rounded-md sm:rounded-lg font-medium sm:font-semibold transition-all duration-200 sm:duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base ${
                activeHistoryTab === 'topups'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md sm:shadow-lg sm:scale-105'
                  : 'bg-transparent text-gray-600 hover:bg-gray-50 sm:hover:bg-gray-100'
              }`}
            >
              <svg
                className="w-3.5 h-3.5 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="whitespace-nowrap">{language === 'th' ? 'เติมเครดิต' : 'Top-ups'}</span>
              <span
                className={`text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold ${
                  activeHistoryTab === 'topups'
                    ? 'bg-white/20 text-white'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {topUpHistory.length}
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-lg p-6 min-h-[400px]">
            {/* Purchase History Tab */}
            {activeHistoryTab === 'purchases' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8V4m0 4a4 4 0 100 8m0-8a4 4 0 010 8m6 4H6"
                    />
                  </svg>
                  {t('purchase_history')}
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {purchaseHistory.length}
                  </span>
                </h3>
                {purchaseHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('no_history_yet')}</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-100 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {t('license_code')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {t('plan_days')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {t('status_label')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {t('created_at')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {purchaseHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs text-blue-600 font-semibold">
                              {item.licenseCode}
                            </td>
                            <td className="px-3 py-2">{item.planDays}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${item.status === 'activated' ? 'bg-green-100 text-green-700' : item.status === 'paid' ? 'bg-blue-100 text-blue-700' : item.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700' : item.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
                              >
                                {item.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {formatDateTime(
                                item.createdAt,
                                language === 'th' ? 'th-TH' : 'en-US'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Extension History Tab */}
            {activeHistoryTab === 'extensions' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t('extension_history')}
                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {extensionHistory.length}
                  </span>
                </h3>
                {extensionHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('no_history_yet')}</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-100 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {t('license_code')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {t('requested_days')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {language === 'th'
                              ? 'รวมแผน (วัน)'
                              : 'Total Plan (days)'}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {t('status_label')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {t('requested_on')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {t('processed_on')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {extensionHistory.map((item) => (
                          <>
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono text-xs text-purple-600 font-semibold">
                                {item.licenseCode}
                              </td>
                              <td className="px-3 py-2">
                                {item.requestedDays}
                              </td>
                              <td className="px-3 py-2">
                                {item.cumulativePlanDays ? (
                                  <span className="inline-flex items-center space-x-1">
                                    <span>{item.cumulativePlanDays}</span>
                                    {item.totalExtendedDays ? (
                                      <span className="text-xs text-gray-400">
                                        (+{item.totalExtendedDays}{' '}
                                        {language === 'th'
                                          ? 'ขยาย'
                                          : 'extended'}
                                        )
                                      </span>
                                    ) : null}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500">
                                {formatDateTime(
                                  item.requestedAt,
                                  language === 'th' ? 'th-TH' : 'en-US'
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500">
                                {item.processedAt
                                  ? formatDateTime(
                                      item.processedAt,
                                      language === 'th' ? 'th-TH' : 'en-US'
                                    )
                                  : '-'}
                              </td>
                            </tr>
                            {item.status === 'rejected' &&
                              item.rejectionReason && (
                                <tr
                                  key={`${item.id}-reason`}
                                  className="bg-red-50"
                                >
                                  <td colSpan="6" className="px-3 py-2">
                                    <div className="flex items-start space-x-2">
                                      <svg
                                        className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <div className="flex-1">
                                        <span className="text-xs font-semibold text-red-700">
                                          {language === 'th'
                                            ? 'เหตุผลการปฏิเสธ: '
                                            : 'Rejection Reason: '}
                                        </span>
                                        <span className="text-xs text-red-600">
                                          {item.rejectionReason}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Top-up History Tab */}
            {activeHistoryTab === 'topups' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {language === 'th'
                    ? 'ประวัติการเติมเครดิต'
                    : 'Top-up History'}
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {topUpHistory.length}
                  </span>
                </h3>
                {topUpHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('no_history_yet')}</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-100 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                            {language === 'th' ? 'จำนวนเงิน' : 'Amount'}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                            {language === 'th' ? 'เครดิตที่ได้รับ' : 'Credits'}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                            {language === 'th'
                              ? 'วิธีชำระเงิน'
                              : 'Payment Method'}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                            {t('status_label')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                            {language === 'th' ? 'วันที่ขอ' : 'Requested On'}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                            {language === 'th'
                              ? 'วันที่อนุมัติ'
                              : 'Processed On'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {topUpHistory.map((item) => (
                          <>
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-semibold text-green-600">
                                ฿{item.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                  {item.points}{' '}
                                  {language === 'th' ? 'เครดิต' : 'pts'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                                {item.paymentMethod.replace('_', ' ')}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    item.status === 'approved'
                                      ? 'bg-green-100 text-green-800'
                                      : item.status === 'rejected'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {item.status === 'approved'
                                    ? language === 'th'
                                      ? 'อนุมัติแล้ว'
                                      : 'Approved'
                                    : item.status === 'rejected'
                                      ? language === 'th'
                                        ? 'ปฏิเสธ'
                                        : 'Rejected'
                                      : language === 'th'
                                        ? 'รอดำเนินการ'
                                        : 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatDateTime(
                                  item.createdAt,
                                  language === 'th' ? 'th-TH' : 'en-US'
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.processedAt
                                  ? formatDateTime(
                                      item.processedAt,
                                      language === 'th' ? 'th-TH' : 'en-US'
                                    )
                                  : '-'}
                              </td>
                            </tr>
                            {item.status === 'rejected' &&
                              item.rejectionReason && (
                                <tr
                                  key={`${item.id}-reason`}
                                  className="bg-red-50"
                                >
                                  <td colSpan="6" className="px-4 py-3">
                                    <div className="flex items-start space-x-2">
                                      <svg
                                        className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <div className="flex-1">
                                        <span className="text-sm font-semibold text-red-700">
                                          {language === 'th'
                                            ? 'เหตุผลการปฏิเสธ: '
                                            : 'Rejection Reason: '}
                                        </span>
                                        <span className="text-sm text-red-600">
                                          {item.rejectionReason}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
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
                    {recentPointsLicense && (
                      <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow flex items-start justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-wide opacity-80">
                            {language === 'th' ? 'สร้างสำเร็จ' : 'Generated'}
                          </div>
                          <div className="font-mono text-sm md:text-base font-semibold break-all">
                            {recentPointsLicense.code}
                          </div>
                          <div className="text-xs mt-1 opacity-80">
                            {language === 'th' ? 'คลิกคัดลอกเพื่อนำไปใช้ในระบบเทรด' : 'Copy and use this license in your trading system'}
                          </div>
                          {recentPointsLicense.expiresAtThai && (
                            <div className="text-[11px] mt-1 opacity-70">
                              {language === 'th' ? 'วันหมดอายุ (เวลาไทย): ' : 'Expiry (Thai time): '} {recentPointsLicense.expiresAtThai}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(recentPointsLicense.code)
                              showNotification(language === 'th' ? 'คัดลอกโค้ดแล้ว' : 'Code copied')
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded bg-white/90 text-emerald-600 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white shadow"
                          >
                            {language === 'th' ? 'คัดลอก' : 'Copy'}
                          </button>
                          <button
                            onClick={() => setRecentPointsLicense(null)}
                            className="px-2 py-1 text-[10px] rounded text-white/70 hover:text-white"
                          >
                            {language === 'th' ? 'ซ่อน' : 'Hide'}
                          </button>
                        </div>
                      </div>
                    )}
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {t('extend_trading_license')}
              </h3>
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
                  {plans
                    .filter((plan) => !plan.isLifetime && plan.days > 0)
                    .map((plan) => (
                      <option key={plan.id} value={plan.days.toString()}>
                        {plan.name} - {plan.days}{' '}
                        {language === 'th' ? 'วัน' : 'Days'} ({plan.points}{' '}
                        {language === 'th' ? 'เครดิต' : 'Credits'})
                      </option>
                    ))}
                  {plans.filter((plan) => !plan.isLifetime && plan.days > 0)
                    .length === 0 && (
                    <>
                      <option value="7">
                        7 {language === 'th' ? 'วัน' : 'Days'} (7{' '}
                        {language === 'th' ? 'เครดิต' : 'Credits'})
                      </option>
                      <option value="30">
                        30 {language === 'th' ? 'วัน' : 'Days'} (30{' '}
                        {language === 'th' ? 'เครดิต' : 'Credits'})
                      </option>
                      <option value="60">
                        60 {language === 'th' ? 'วัน' : 'Days'} (60{' '}
                        {language === 'th' ? 'เครดิต' : 'Credits'})
                      </option>
                      <option value="90">
                        90 {language === 'th' ? 'วัน' : 'Days'} (90{' '}
                        {language === 'th' ? 'เครดิต' : 'Credits'})
                      </option>
                      <option value="180">
                        180 {language === 'th' ? 'วัน' : 'Days'} (180{' '}
                        {language === 'th' ? 'เครดิต' : 'Credits'})
                      </option>
                      <option value="365">
                        365 {language === 'th' ? 'วัน' : 'Days'} (365{' '}
                        {language === 'th' ? 'เครดิต' : 'Credits'})
                      </option>
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'th'
                    ? 'ขยายระยะเวลาใบอนุญาตของคุณ'
                    : 'Extend your license period'}
                </p>
              </div>

              {/* Points Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">
                    {language === 'th' ? 'เครดิตที่จำเป็น' : 'Required Credits'}
                    :
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {parseInt(extendPlan)}{' '}
                    {language === 'th' ? 'เครดิต' : 'Credits'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    {language === 'th' ? 'เครดิตคงเหลือ' : 'Your Credits'}:
                  </span>
                  <span
                    className={`text-lg font-bold ${user?.points >= parseInt(extendPlan) ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {user?.points || 0}{' '}
                    {language === 'th' ? 'เครดิต' : 'Credits'}
                  </span>
                </div>
                {user?.points < parseInt(extendPlan) && (
                  <div className="mt-2 text-sm text-red-600">
                    {language === 'th'
                      ? '⚠️ เครดิตไม่เพียงพอ! กรุณาเติมเงินเพื่อเพิ่มเครดิต'
                      : '⚠️ Insufficient points! Please top up to add more points.'}
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-400 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    ></path>
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-green-800 mb-1">
                      {language === 'th'
                        ? 'ขยายใบอนุญาตทันที!'
                        : 'Instant License Extension!'}
                    </h3>
                    <div className="text-sm text-green-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          {language === 'th'
                            ? 'เครดิตจะถูกหักทันทีหลังจากกดยืนยัน'
                            : 'Points will be deducted immediately upon confirmation'}
                        </li>
                        <li>
                          {language === 'th'
                            ? 'ใบอนุญาตของคุณจะถูกขยายทันที'
                            : 'Your license will be extended instantly'}
                        </li>
                        <li>
                          {language === 'th'
                            ? 'ไม่จำเป็นต้องรออนุมัติจากแอดมิน'
                            : 'No admin approval required'}
                        </li>
                        <li>
                          {language === 'th'
                            ? 'ใบอนุญาตเดิมจะยังคงใช้งานได้'
                            : 'Same license key continues to work'}
                        </li>
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
                    const firstNonLifetimePlan = plans.find(
                      (p) => !p.isLifetime
                    )
                    setExtendPlan(
                      firstNonLifetimePlan
                        ? firstNonLifetimePlan.days.toString()
                        : '30'
                    )
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    extendingCode ||
                    !extendPlan ||
                    user?.points < parseInt(extendPlan)
                  }
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
                      {language === 'th' ? 'กำลังขยาย...' : 'Extending...'}
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
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      {language === 'th' ? 'ขยายทันที' : 'Extend Now'} (
                      {parseInt(extendPlan)}{' '}
                      {language === 'th' ? 'เครดิต' : 'Credits'})
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Account Number Modal */}
      {showChangeAccountModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white">
                {language === 'th'
                  ? 'เปลี่ยนหมายเลขบัญชี'
                  : 'Change Account Number'}
              </h3>
            </div>
            <form onSubmit={submitChangeAccount} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-blue-500 mt-0.5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">
                      {language === 'th'
                        ? 'ข้อมูลการเปลี่ยน:'
                        : 'Change Details:'}
                    </p>
                    <ul className="space-y-1">
                      <li>
                        • {language === 'th' ? 'ค่าใช้จ่าย' : 'Cost'}:{' '}
                        <strong>{changeAccountForm.cost}</strong>{' '}
                        {language === 'th' ? 'เครดิต' : 'credits'}
                      </li>
                      <li>
                        •{' '}
                        {language === 'th'
                          ? 'เครดิตปัจจุบัน'
                          : 'Current credits'}
                        : <strong>{user?.points || 0}</strong>{' '}
                        {language === 'th' ? 'เครดิต' : 'credits'}
                      </li>
                      <li>
                        •{' '}
                        {language === 'th'
                          ? 'การเปลี่ยนมีผลทันที'
                          : 'Change takes effect immediately'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'th' ? 'ใบอนุญาต' : 'License'}
                </label>
                <input
                  type="text"
                  value={changeAccountForm.licenseCode}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'th'
                    ? 'หมายเลขบัญชีปัจจุบัน'
                    : 'Current Account Number'}
                </label>
                <input
                  type="text"
                  value={changeAccountForm.currentAccountNumber}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'th'
                    ? 'หมายเลขบัญชีใหม่'
                    : 'New Account Number'}{' '}
                  *
                </label>
                <input
                  type="text"
                  value={changeAccountForm.newAccountNumber}
                  onChange={(e) =>
                    setChangeAccountForm((prev) => ({
                      ...prev,
                      newAccountNumber: e.target.value
                    }))
                  }
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  placeholder={
                    language === 'th'
                      ? 'ใส่หมายเลขบัญชีใหม่'
                      : 'Enter new account number'
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>

              {(user?.points || 0) < changeAccountForm.cost && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 font-medium">
                    {language === 'th'
                      ? '⚠️ เครดิตไม่เพียงพอ!'
                      : '⚠️ Insufficient Credits!'}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    {language === 'th'
                      ? `คุณต้องการอีก ${changeAccountForm.cost - (user?.points || 0)} เครดิต กรุณาเติมเครดิตก่อน`
                      : `You need ${changeAccountForm.cost - (user?.points || 0)} more credits. Please top up first.`}
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeAccountModal(false)
                    setChangeAccountForm({
                      licenseCode: '',
                      currentAccountNumber: '',
                      newAccountNumber: '',
                      cost: 1000
                    })
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    changingAccount ||
                    (user?.points || 0) < changeAccountForm.cost ||
                    !changeAccountForm.newAccountNumber.trim()
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {changingAccount ? (
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
                      {language === 'th' ? 'กำลังเปลี่ยน...' : 'Changing...'}
                    </>
                  ) : (
                    <>
                      {language === 'th'
                        ? 'ยืนยันการเปลี่ยน'
                        : 'Confirm Change'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-4 right-2 sm:right-4 z-50 flex flex-col space-y-2 w-72 sm:w-80 max-w-[calc(100vw-1rem)]">
        {notifications.map((notification) => {
          const baseColor =
            notification.type === 'success'
              ? 'bg-green-500'
              : notification.type === 'error'
                ? 'bg-red-500'
                : notification.type === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
          return (
            <div
              key={notification.id}
              className={`group relative overflow-hidden p-4 pr-10 rounded-lg shadow-lg text-white transition-all duration-300 ease-out ${baseColor} ${notification.closing ? 'opacity-0 translate-x-8 max-h-0 py-0 mt-0 mb-0' : 'opacity-100 translate-x-0'} `}
            >
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/20">
                <div className="h-full bg-white/60 origin-left animate-notif-shrink-5s" />
              </div>
              <p className="text-sm font-medium break-words pr-2">
                {notification.message}
              </p>
              <button
                onClick={() => {
                  // trigger closing animation
                  setNotifications((prev) =>
                    prev.map((n) =>
                      n.id === notification.id ? { ...n, closing: true } : n
                    )
                  )
                  setTimeout(() => {
                    setNotifications((prev) =>
                      prev.filter((n) => n.id !== notification.id)
                    )
                  }, 300)
                }}
                className="absolute top-1 right-1 px-2 py-1 text-xs rounded opacity-70 hover:opacity-100 transition-colors"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {/* Buy Points Modal */}
      {showBuyPointsModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-gray-800/30 to-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
                <svg
                  className="h-8 w-8 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {language === 'th'
                  ? 'ยืนยันการซื้อใบอนุญาต'
                  : 'Confirm License Purchase'}
              </h3>
              <p className="text-gray-600">
                {language === 'th'
                  ? 'กรุณาตรวจสอบข้อมูลก่อนดำเนินการ'
                  : 'Please review your purchase details'}
              </p>
            </div>

            {/* Purchase Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {language === 'th' ? 'รายละเอียดการซื้อ' : 'Purchase Details'}
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {language === 'th' ? 'บัญชีเทรด:' : 'Trading Account:'}
                  </span>
                  <span className="font-mono font-semibold">
                    {buyPointsForm.accountNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {language === 'th' ? 'แพลตฟอร์ม:' : 'Platform:'}
                  </span>
                  <span className="font-semibold capitalize">
                    {buyPointsForm.platform}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {language === 'th' ? 'แผน:' : 'Plan:'}
                  </span>
                  <span className="font-semibold">
                    {(() => {
                      const sel = plans.find((p) =>
                        buyPointsForm.plan === 'lifetime'
                          ? p.isLifetime
                          : !p.isLifetime &&
                            String(p.days) === String(buyPointsForm.plan)
                      )
                      if (!sel) return buyPointsForm.plan
                      if (sel.isLifetime)
                        return `${sel.name} (${language === 'th' ? 'ตลอดชีพ' : 'Lifetime'})`
                      return `${sel.name || sel.days + ' days'} (${sel.days} ${language === 'th' ? 'วัน' : 'Days'})`
                    })()}
                  </span>
                </div>
                <hr className="my-3" />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold text-gray-800">
                    {language === 'th'
                      ? 'เครดิตที่ต้องใช้:'
                      : 'Points Required:'}
                  </span>
                  <span className="font-bold text-blue-600">
                    {(() => {
                      const sel = plans.find((p) =>
                        buyPointsForm.plan === 'lifetime'
                          ? p.isLifetime
                          : !p.isLifetime &&
                            String(p.days) === String(buyPointsForm.plan)
                      )
                      return sel ? sel.points : buyPointsForm.plan
                    })()}{' '}
                    {language === 'th' ? 'เครดิต' : 'Credits'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {language === 'th'
                      ? 'เครดิตคงเหลือ:'
                      : 'Remaining Credits:'}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {(() => {
                      const sel = plans.find((p) =>
                        buyPointsForm.plan === 'lifetime'
                          ? p.isLifetime
                          : !p.isLifetime &&
                            String(p.days) === String(buyPointsForm.plan)
                      )
                      const cost = sel
                        ? sel.points
                        : parseInt(buyPointsForm.plan || '0', 10)
                      return Math.max(0, (user?.points || 0) - cost)
                    })()}{' '}
                    {language === 'th' ? 'เครดิต' : 'Credits'}
                  </span>
                </div>
              </div>
            </div>

            {/* Instant Activation Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-400 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-green-800 mb-1">
                    {language === 'th'
                      ? '🚀 เปิดใช้งานทันที!'
                      : '🚀 Instant Activation!'}
                  </h3>
                  <div className="text-sm text-green-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        {language === 'th'
                          ? 'เครดิตจะถูกหักทันทีหลังจากยืนยัน'
                          : 'Points will be deducted immediately'}
                      </li>
                      <li>
                        {language === 'th'
                          ? 'ใบอนุญาตจะเปิดใช้งานทันที'
                          : 'License will be activated instantly'}
                      </li>
                      <li>
                        {language === 'th'
                          ? 'ไม่ต้องรอการชำระเงิน'
                          : 'No payment processing required'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowBuyPointsModal(false)
                  setBuyPointsForm({
                    accountNumber: '',
                    platform: 'exness',
                    plan: codeForm.plan || ''
                  })
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  setShowBuyPointsModal(false)
                  await handlePointsPurchase(
                    buyPointsForm.plan,
                    buyPointsForm.accountNumber
                  )
                  setBuyPointsForm({
                    accountNumber: '',
                    platform: 'exness',
                    plan: codeForm.plan || ''
                  })
                }}
                disabled={(() => {
                  if (generatingCode) return true
                  const sel = plans.find((p) =>
                    buyPointsForm.plan === 'lifetime'
                      ? p.isLifetime
                      : !p.isLifetime &&
                        String(p.days) === String(buyPointsForm.plan)
                  )
                  const cost = sel
                    ? sel.points
                    : parseInt(buyPointsForm.plan || '0', 10)
                  return (user?.points || 0) < cost
                })()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {generatingCode ? (
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
                    {language === 'th' ? 'กำลังสร้าง...' : 'Creating...'}
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    {language === 'th' ? 'ยืนยันและซื้อ' : 'Confirm & Buy'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-up Points Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-gray-800/30 to-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 mb-4">
                <svg
                  className="h-8 w-8 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {language === 'th' ? 'เติมเครดิต' : 'Top-up Points'}
              </h3>
              <p className="text-gray-600">
                {language === 'th'
                  ? 'เติมเงินเพื่อรับเครดิตสำหรับซื้อใบอนุญาต'
                  : 'Add money to receive points for license purchases'}
              </p>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                {language === 'th' ? 'จำนวนเงิน (บาท)' : 'Amount (THB)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-lg font-semibold">฿</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  placeholder="300"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-4 text-lg font-semibold bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
                  autoFocus
                />
              </div>
            </div>

            {/* Exchange Rate Info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-emerald-400 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-emerald-800 mb-1">
                    {language === 'th' ? 'อัตราแลกเปลี่ยน' : 'Exchange Rate'}
                  </h3>
                  <div className="text-sm text-emerald-700">
                    <p className="font-semibold mb-2">
                      1 {language === 'th' ? 'บาท' : 'THB'} = 1{' '}
                      {language === 'th' ? 'เครดิต' : 'Credit'}
                    </p>
                    {topUpAmount &&
                      !isNaN(parseFloat(topUpAmount)) &&
                      parseFloat(topUpAmount) > 0 && (
                        <div className="bg-emerald-100 rounded-lg p-3 mt-3">
                          <p className="font-semibold text-emerald-800">
                            ฿{parseFloat(topUpAmount).toFixed(2)} ={' '}
                            {Math.floor(parseFloat(topUpAmount))}{' '}
                            {language === 'th' ? 'เครดิต' : 'Credits'}
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">
                            {language === 'th'
                              ? 'เครดิตใหม่หลังเติม:'
                              : 'Total credits after top-up:'}{' '}
                            {(user?.points || 0) +
                              Math.floor(parseFloat(topUpAmount))}{' '}
                            {language === 'th' ? 'เครดิต' : 'Credits'}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Approval Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-400 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">
                    {language === 'th'
                      ? '⏳ รอการอนุมัติ'
                      : '⏳ Pending Approval'}
                  </h3>
                  <div className="text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        {language === 'th'
                          ? 'คำขอจะถูกส่งไปยังแอดมิน'
                          : 'Request will be sent to admin'}
                      </li>
                      <li>
                        {language === 'th'
                          ? 'รอการอนุมัติก่อนได้รับเครดิต'
                          : 'Wait for approval before receiving points'}
                      </li>
                      <li>
                        {language === 'th'
                          ? 'คุณจะได้รับการแจ้งเตือนเมื่อได้รับอนุมัติ'
                          : 'You will be notified when approved'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowTopUpModal(false)
                  setTopUpAmount('')
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  if (!topUpAmount || parseFloat(topUpAmount) < 1) {
                    showModalAlert(
                      language === 'th'
                        ? 'กรุณากรอกจำนวนเงินที่ถูกต้อง'
                        : 'Please enter a valid amount',
                      'warning'
                    )
                    return
                  }
                  setShowTopUpModal(false)
                  await handleTopUpRequest(parseFloat(topUpAmount))
                  setTopUpAmount('')
                }}
                disabled={!topUpAmount || parseFloat(topUpAmount) < 1}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {language === 'th' ? 'ส่งคำขอ' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModalVisible && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/50 via-gray-800/40 to-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-200">
            <div className="text-center">
              {/* Icon based on type */}
              <div
                className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
                  modalContent.type === 'error'
                    ? 'bg-red-100'
                    : modalContent.type === 'success'
                      ? 'bg-green-100'
                      : modalContent.type === 'warning'
                        ? 'bg-yellow-100'
                        : 'bg-blue-100'
                }`}
              >
                {modalContent.type === 'error' ? (
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : modalContent.type === 'success' ? (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : modalContent.type === 'warning' ? (
                  <svg
                    className="h-6 w-6 text-yellow-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
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
                  modalContent.type === 'error'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : modalContent.type === 'success'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : modalContent.type === 'warning'
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {t('ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
