'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '../../hooks/useTranslation'

export default function AdminPage() {
  const { t, language, changeLanguage } = useTranslation()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminKey, setAdminKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [codes, setCodes] = useState([])
  const [loadingCodes, setLoadingCodes] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [updating, setUpdating] = useState({})
  const [activeTab, setActiveTab] = useState('customers')
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerFilter, setCustomerFilter] = useState('all')
  const [customerSearch, setCustomerSearch] = useState('')

  // Top-up requests state
  const [topUpRequests, setTopUpRequests] = useState([])
  const [loadingTopUps, setLoadingTopUps] = useState(false)
  const [topUpFilter, setTopUpFilter] = useState('all')
  const [processingTopUp, setProcessingTopUp] = useState({})

  // Plan settings state
  const [planSettings, setPlanSettings] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [planFilter, setPlanFilter] = useState('all')
  const [planModal, setPlanModal] = useState({
    show: false,
    mode: 'create', // 'create' or 'edit'
    plan: null
  })
  const [planForm, setPlanForm] = useState({
    name: '',
    days: '',
    price: '',
    points: '',
    description: '',
    isActive: true,
    isLifetime: false,
    sortOrder: 0
  })
  const [topUpRejectModal, setTopUpRejectModal] = useState({
    show: false,
    requestId: '',
    amount: '',
    reason: ''
  })
  const [bulkTopUpRejectModal, setBulkTopUpRejectModal] = useState({
    show: false,
    selectedIds: [],
    reason: ''
  })
  const [bulkSelecting, setBulkSelecting] = useState(false)
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([])
  const [selectedTopUpIds, setSelectedTopUpIds] = useState([])
  const [bulkTopUpMode, setBulkTopUpMode] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    type: '',
    id: '',
    name: ''
  })
  const [confirmText, setConfirmText] = useState('')
  const [newItemNotification, setNewItemNotification] = useState({
    show: false,
    message: '',
    targetTab: null
  })
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  })
  const [manualAccountForm, setManualAccountForm] = useState({
    username: '',
    platform: 'mt4',
    accountNumber: '',
    plan: 'lifetime',
    extendDays: '',
    demoDays: '', // number of days for demo (if demo username)
    isDemo: false
  })
  const [creatingAccount, setCreatingAccount] = useState(false)

  // Extension requests state
  const [extensionRequests, setExtensionRequests] = useState([])
  const [loadingExtensions, setLoadingExtensions] = useState(false)
  const [extensionFilter, setExtensionFilter] = useState('all')
  const [processingExtension, setProcessingExtension] = useState({})
  const [rejectionModal, setRejectionModal] = useState({
    show: false,
    requestId: '',
    licenseCode: '',
    reason: ''
  })

  // System settings state
  const [systemSettings, setSystemSettings] = useState([])
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [editingSettings, setEditingSettings] = useState({})

  // Add credits modal state
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false)
  const [addCreditsForm, setAddCreditsForm] = useState({
    username: '',
    credits: '',
    reason: ''
  })
  const [addingCredits, setAddingCredits] = useState(false)

  // Extend modal state
  const [extendModal, setExtendModal] = useState({
    show: false,
    customerId: '',
    licenseCode: '',
    currentExpiry: '',
    selectedPlan: '30',
    customDays: '',
    extendingCode: false
  })

  const router = useRouter()

  const [wsConnected, setWsConnected] = useState(false)
  const [wsInitializing, setWsInitializing] = useState(false)
  const [lastWsEvent, setLastWsEvent] = useState(null)
  // Track current tab in ref for socket handlers without re-binding
  const activeTabRef = useRef('customers')
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // WebSocket (reintroduced): initialize server then connect
  useEffect(() => {
    if (!isAuthenticated) return
    let socket
    let cancelled = false

    const initAndConnect = async () => {
      try {
        setWsInitializing(true)
        // Try to ensure server is up
        await fetch('/api/init/socketio').catch(() => {})
        const { io } = require('socket.io-client')
        socket = io(
          process.env.NODE_ENV === 'production'
            ? process.env.NEXT_PUBLIC_APP_URL
            : 'http://localhost:3000',
          {
            path: '/api/socketio',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
          }
        )

        socket.on('connect', () => {
          if (cancelled) return
          setWsConnected(true)
          setWsInitializing(false)
          socket.emit('join-admin')
          // Initial full sync
          fetchPlanSettings()
          fetchAllCustomers()
          fetchTopUpRequests()
        })

        socket.on('disconnect', () => {
          if (cancelled) return
          setWsConnected(false)
        })

        // Customer account updates
        socket.on('customer-account-updated', () => {
          setLastWsEvent({ type: 'customer-account', ts: Date.now() })
          fetchAllCustomers()
        })
        socket.on('customer-account-updated-broadcast', (payload) => {
          // Fallback broadcast handler
          setLastWsEvent({
            type: 'customer-account-broadcast',
            ts: Date.now(),
            payload
          })
          fetchAllCustomers()
        })
        socket.on('admin-notification', (data) => {
          if (data?.message) {
            showNotification(data.message)
          }
        })
        // Top-up related events
        socket.on('topup-request-updated', (payload) => {
          setLastWsEvent({ type: 'topup', ts: Date.now(), payload })
          fetchTopUpRequests()
          // Auto-switch to top-ups tab for new requests
          const isNewRequest = !!(payload && payload.action === 'created')
          if (isNewRequest && activeTabRef.current !== 'topup-requests') {
            showNotification('[TOP-UP] New top-up request received')
            setActiveTab('topup-requests')
            playNotificationSound()
          }
        })
        socket.on('topup-processed', () => {
          setLastWsEvent({ type: 'topup-processed', ts: Date.now() })
          fetchTopUpRequests()
        })
      } catch (e) {
        setWsInitializing(false)
        console.warn('WebSocket setup error', e)
      }
    }

    initAndConnect()

    return () => {
      cancelled = true
      if (socket) {
        socket.disconnect()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Format date to Thai Buddhist Era format with time
  const formatThaiDateTime = (dateString) => {
    const d = new Date(dateString)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const yearBE = d.getFullYear() + 543 // Convert to Buddhist Era
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')

    return `${day}/${month}/${yearBE} ${hours}:${minutes}`
  }

  // Check admin authentication
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch('/api/admin/verify', {
          credentials: 'include'
        })
        if (response.ok) {
          setIsAuthenticated(true)
          fetchPlanSettings()
          fetchAllCustomers()
          fetchTopUpRequests()
          fetchSystemSettings()
        }
      } catch (error) {
        // Auth check failed - handled by loading state
      } finally {
        setLoading(false)
      }
    }
    checkAdminAuth()
  }, [])

  // Notification functions
  // Map message tokens to tabs
  const resolveTabFromMessage = (msg = '') => {
    const lower = msg.toLowerCase()
    if (lower.includes('[customers]') || lower.includes('customer account'))
      return 'customers'
    if (
      lower.includes('[top-up]') ||
      lower.includes('top-up request') ||
      lower.includes('topup')
    )
      return 'topup-requests'
    if (lower.includes('[create]')) return 'create-account'
    return null
  }

  const showNotification = (message) => {
    const targetTab = resolveTabFromMessage(message)
    setNewItemNotification({ show: true, message, targetTab })
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNewItemNotification((prev) =>
        prev.show ? { show: false, message: '', targetTab: null } : prev
      )
    }, 5000)
  }

  const showToast = (message, type = 'success') => {
    const targetTab = resolveTabFromMessage(message)
    setToast({ show: true, message, type, targetTab })
    // Auto-hide toast after 3 seconds unless hovered
    setTimeout(() => {
      setToast((prev) =>
        prev.show ? { show: false, message: '', type: 'success' } : prev
      )
    }, 3000)
  }

  const playNotificationSound = () => {
    // Create a simple notification beep
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800 // 800 Hz tone
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      )

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      // Audio not available - silent fallback
    }
  }

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adminKey })
      })

      if (response.ok) {
        setIsAuthenticated(true)
        setAdminKey('')
        fetchPlanSettings()
        fetchAllCustomers()
        fetchTopUpRequests()
      } else {
        showToast(t('invalid_admin_key'), 'error')
      }
    } catch (error) {
      showToast(t('login') + ' failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllCodes = async () => {
    console.log('🔄 fetchAllCodes called - refreshing codes table...')
    setLoadingCodes(true)
    try {
      const response = await fetch('/api/admin/codes', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCodes(data.codes)
        // Reset selection after refresh to avoid stale IDs
        setSelectedCustomerIds([])
        console.log(
          '✅ Codes table updated with',
          data.codes?.length || 0,
          'codes'
        )
      }
    } catch (error) {
      console.error('❌ Error fetching codes:', error)
    } finally {
      setLoadingCodes(false)
    }
  }

  const fetchAllCustomers = async () => {
    console.log('🔄 fetchAllCustomers called - refreshing customers table...')
    setLoadingCustomers(true)
    try {
      const response = await fetch('/api/admin/customers', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.accounts)
        console.log(
          '✅ Customers table updated with',
          data.accounts?.length || 0,
          'accounts'
        )
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error)
    } finally {
      setLoadingCustomers(false)
    }
  }

  const updateCodeStatus = async (codeId, newStatus) => {
    setUpdating((prev) => ({ ...prev, [codeId]: true }))

    try {
      const response = await fetch('/api/admin/codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          codeId,
          status: newStatus,
          paymentMethod: newStatus === 'paid' ? 'admin_confirmed' : undefined
        })
      })

      if (response.ok) {
        const data = await response.json()

        // Update local state
        setCodes((prev) =>
          prev.map((code) =>
            code._id === codeId
              ? {
                  ...code,
                  status: newStatus,
                  ...(newStatus === 'paid' && { paidAt: new Date() })
                }
              : code
          )
        )

        // If customer account was created, add it directly to the state
        if (data.customerAccountCreated && data.customerAccount) {
          // Add the new customer account to the customers list immediately
          setCustomers((prev) => [data.customerAccount, ...prev])

          // Also refresh the list to ensure consistency
          setTimeout(() => {
            fetchAllCustomers()
          }, 500)
        }

        showToast(
          `Code status updated to ${newStatus.replace('_', ' ').toUpperCase()}`,
          'success'
        )
      } else {
        showToast('Failed to update status', 'error')
      }
    } catch (error) {
      showToast('Update failed', 'error')
    } finally {
      setUpdating((prev) => ({ ...prev, [codeId]: false }))
    }
  }

  const updateCustomerStatus = async (accountId, newStatus) => {
    setUpdating((prev) => ({ ...prev, [accountId]: true }))

    try {
      const response = await fetch('/api/admin/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accountId,
          status: newStatus
        })
      })

      if (response.ok) {
        // Update local state
        setCustomers((prev) =>
          prev.map((customer) =>
            customer._id === accountId
              ? { ...customer, status: newStatus }
              : customer
          )
        )
        if (newStatus === 'suspended') {
          showToast(t('customer_account_suspended'), 'success')
        } else if (newStatus === 'valid') {
          showToast(t('customer_account_reactivated'), 'success')
        } else {
          showToast(t('customer_account_status_updated'), 'success')
        }
      } else {
        showToast('Failed to update customer status', 'error')
      }
    } catch (error) {
      showToast('Update failed', 'error')
    } finally {
      setUpdating((prev) => ({ ...prev, [accountId]: false }))
    }
  }

  // Bulk selection helpers
  const toggleSelectCustomer = (id) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  const selectAllVisibleCustomers = () => {
    const visible = customers
      .filter((customer) => {
        const matchesFilter =
          customerFilter === 'all' || customer.status === customerFilter
        const matchesSearch =
          customerSearch === '' ||
          customer.user.toLowerCase().includes(customerSearch.toLowerCase()) ||
          customer.license.toLowerCase().includes(customerSearch.toLowerCase()) ||
          customer.accountNumber.toLowerCase().includes(customerSearch.toLowerCase())
        return matchesFilter && matchesSearch
      })
      .map((c) => c._id)
    setSelectedCustomerIds(visible)
  }
  const clearSelection = () => setSelectedCustomerIds([])

  // Top-up bulk selection helpers
  const toggleSelectTopUp = (id) => {
    setSelectedTopUpIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  
  const selectAllVisibleTopUps = () => {
    const visible = (Array.isArray(topUpRequests) ? topUpRequests : [])
      .filter((request) => {
        const matchesFilter = topUpFilter === 'all' || request.status === topUpFilter
        return matchesFilter && request.status === 'pending' // Only allow selection of pending requests
      })
      .map((r) => r._id)
    setSelectedTopUpIds(visible)
  }
  
  const clearTopUpSelection = () => setSelectedTopUpIds([])

  const interpolate = (template, vars = {}) => {
    return template.replace(/\{(\w+)\}/g, (_, k) =>
      vars[k] !== undefined ? vars[k] : `{${k}}`
    )
  }

  const performBulkAction = async (action) => {
    if (!['suspend', 'delete'].includes(action)) return
    if (selectedCustomerIds.length === 0) {
      showToast(t('no_customers_selected'), 'error')
      return
    }
    // Confirmation for delete
    if (action === 'delete') {
      const confirmMsg = interpolate(t('bulk_delete_confirm'), {
        count: selectedCustomerIds.length
      })
      if (!window.confirm(confirmMsg)) return
    }
    if (action === 'suspend') {
      const confirmMsg = interpolate(t('bulk_suspend_confirm'), {
        count: selectedCustomerIds.length
      })
      if (!window.confirm(confirmMsg)) return
    }
    try {
      const response = await fetch('/api/admin/customers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ids: selectedCustomerIds })
      })
      const data = await response.json()
      if (response.ok) {
        if (action === 'suspend') {
          showToast(
            interpolate(t('bulk_suspend_processed'), {
              success: data.processedCount,
              skipped: data.skippedCount
            }),
            'success'
          )
        } else {
          showToast(
            interpolate(t('bulk_delete_processed'), {
              success: data.processedCount,
              skipped: data.skippedCount
            }),
            'success'
          )
        }
        // Update local state optimistically
        if (action === 'suspend') {
          setCustomers((prev) =>
            prev.map((c) =>
              selectedCustomerIds.includes(c._id)
                ? c.status === 'valid'
                  ? { ...c, status: 'suspended' }
                  : c
                : c
            )
          )
        } else if (action === 'delete') {
          setCustomers((prev) =>
            prev.filter((c) => !selectedCustomerIds.includes(c._id))
          )
        }
        setSelectedCustomerIds([])
        // Full refresh for consistency
        setTimeout(() => fetchAllCustomers(), 400)
      } else {
        showToast(data.error || 'Bulk action failed', 'error')
      }
    } catch (err) {
      showToast('Network error performing bulk action', 'error')
    }
  }

  const handleDeleteClick = (type, id, name) => {
    setDeleteConfirmation({ show: true, type, id, name })
    setConfirmText('')
  }

  const confirmDelete = async () => {
    if (confirmText !== 'DELETE') {
      showToast('Please type "DELETE" to confirm', 'error')
      return
    }

    const { type, id } = deleteConfirmation
    setUpdating((prev) => ({ ...prev, [id]: true }))

    try {
      const endpoint =
        type === 'code' ? '/api/admin/codes' : '/api/admin/customers'
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          [type === 'code' ? 'codeId' : 'accountId']: id
        })
      })

      if (response.ok) {
        if (type === 'code') {
          setCodes((prev) => prev.filter((code) => code._id !== id))
          showToast('Trading code deleted successfully', 'success')
        } else {
          setCustomers((prev) => prev.filter((customer) => customer._id !== id))
          showToast('Customer account deleted successfully', 'success')
        }
        setDeleteConfirmation({ show: false, type: '', id: '', name: '' })
        setConfirmText('')
      } else {
        showToast('Failed to delete', 'error')
      }
    } catch (error) {
      showToast('Delete failed', 'error')
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }))
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, type: '', id: '', name: '' })
    setConfirmText('')
  }

  // Extension request functions
  const fetchExtensionRequests = async () => {
    setLoadingExtensions(true)
    try {
      const response = await fetch('/api/admin/extension-requests', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setExtensionRequests(data.requests)
      }
    } catch (error) {
      // Error handled by UI state
    } finally {
      setLoadingExtensions(false)
    }
  }

  // Top-up request functions
  const fetchTopUpRequests = async () => {
    setLoadingTopUps(true)
    try {
      const response = await fetch('/api/admin/topup', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setTopUpRequests(data.requests || [])
      } else {
        console.error('Failed to fetch top-up requests:', response.status)
        setTopUpRequests([])
      }
    } catch (error) {
      console.error('Error fetching top-up requests:', error)
      setTopUpRequests([])
    } finally {
      setLoadingTopUps(false)
    }
  }

  // Plan settings functions
  const fetchPlanSettings = async () => {
    setLoadingPlans(true)
    try {
      const response = await fetch('/api/admin/plan-settings', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setPlanSettings(data.plans || [])
      } else {
        console.error('Failed to fetch plan settings:', response.status)
        setPlanSettings([])
      }
    } catch (error) {
      console.error('Error fetching plan settings:', error)
      setPlanSettings([])
    } finally {
      setLoadingPlans(false)
    }
  }

  const showPlanModal = (mode, plan = null) => {
    if (mode === 'edit' && plan) {
      setPlanForm({
        name: plan.name,
        days: plan.isLifetime ? '' : plan.days.toString(),
        price: plan.price.toString(),
        points: plan.points.toString(),
        description: plan.description || '',
        isActive: plan.isActive,
        isLifetime: plan.isLifetime,
        sortOrder: plan.sortOrder.toString()
      })
    } else {
      setPlanForm({
        name: '',
        days: '',
        price: '',
        points: '',
        description: '',
        isActive: true,
        isLifetime: false,
        sortOrder: '0'
      })
    }
    setPlanModal({ show: true, mode, plan })
  }

  const closePlanModal = () => {
    setPlanModal({ show: false, mode: 'create', plan: null })
    setPlanForm({
      name: '',
      days: '',
      price: '',
      points: '',
      description: '',
      isActive: true,
      isLifetime: false,
      sortOrder: '0'
    })
  }

  const handlePlanSubmit = async (e) => {
    e.preventDefault()

    const isEdit = planModal.mode === 'edit'
    const url = '/api/admin/plan-settings'
    const method = isEdit ? 'PUT' : 'POST'

    const body = {
      ...planForm,
      days: planForm.isLifetime ? 999999 : parseInt(planForm.days),
      price: parseFloat(planForm.price),
      points: parseInt(planForm.points),
      sortOrder: parseInt(planForm.sortOrder)
    }

    if (isEdit) {
      body.planId = planModal.plan.id
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      const data = await response.json()
      if (response.ok) {
        showToast(
          isEdit 
            ? `Plan "${planForm.name}" updated successfully!`
            : `Plan "${planForm.name}" created successfully!`,
          'success'
        )
        setPlanModal({ show: false, mode: 'create', plan: null })
        fetchPlanSettings()
      } else {
        showToast(data.error || 'Failed to save plan', 'error')
      }
    } catch (error) {
      showToast('Failed to save plan', 'error')
    }
  }

  const deletePlan = async (planId, planName) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${planName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/plan-settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId })
      })

      const data = await response.json()
      if (response.ok) {
        showToast(`Plan "${planName}" deleted successfully!`, 'success')
        fetchPlanSettings()
      } else {
        showToast(data.error || 'Failed to delete plan', 'error')
      }
    } catch (error) {
      showToast('Failed to delete plan', 'error')
    }
  }

  // System Settings Functions
  const fetchSystemSettings = async () => {
    setLoadingSettings(true)
    try {
      const response = await fetch('/api/admin/system-settings', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSystemSettings(data.data || [])
      } else {
        console.error('Failed to fetch system settings:', response.status)
        setSystemSettings([])
      }
    } catch (error) {
      console.error('Error fetching system settings:', error)
      setSystemSettings([])
    } finally {
      setLoadingSettings(false)
    }
  }

  const updateSystemSetting = async (key, value) => {
    try {
      const setting = systemSettings.find(s => s.key === key)
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key,
          value,
          description: setting?.description || '',
          category: setting?.category || 'general'
        })
      })

      const data = await response.json()
      if (response.ok) {
        showToast('Setting updated successfully!', 'success')
        fetchSystemSettings()
      } else {
        showToast(data.error || 'Failed to update setting', 'error')
      }
    } catch (error) {
      showToast('Failed to update setting', 'error')
    }
  }

  const initializeSystemSettings = async () => {
    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()
      if (response.ok) {
        showToast('System settings initialized successfully!', 'success')
        fetchSystemSettings()
      } else {
        showToast(data.error || 'Failed to initialize settings', 'error')
      }
    } catch (error) {
      showToast('Failed to initialize settings', 'error')
    }
  }

  const approveTopUp = async (requestId) => {
    setProcessingTopUp((prev) => ({ ...prev, [requestId]: true }))
    try {
      const response = await fetch('/api/admin/topup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId,
          action: 'approve'
        })
      })

      const data = await response.json()
      if (response.ok) {
        showToast(
          `Top-up approved! ฿${data.amount} credited as ${data.points} credits`,
          'success'
        )
        fetchTopUpRequests()
      } else {
        showToast(data.error || 'Failed to approve top-up', 'error')
      }
    } catch (error) {
      showToast('Failed to approve top-up', 'error')
    } finally {
      setProcessingTopUp((prev) => ({ ...prev, [requestId]: false }))
    }
  }

  const showTopUpRejectModal = (requestId, amount) => {
    setTopUpRejectModal({
      show: true,
      requestId,
      amount,
      reason: ''
    })
  }

  const performBulkTopUpAction = (action) => {
    if (!['approve', 'reject'].includes(action)) return
    if (selectedTopUpIds.length === 0) {
      showToast('No requests selected', 'error')
      return
    }

    if (action === 'approve') {
      const confirmMsg = `Are you sure you want to approve ${selectedTopUpIds.length} top-up request(s)? This will credit credits to users immediately.`
      if (!window.confirm(confirmMsg)) return
      
      bulkApproveTopUps()
    } else {
      // Show bulk reject modal
      setBulkTopUpRejectModal({
        show: true,
        selectedIds: selectedTopUpIds,
        reason: ''
      })
    }
  }

  const bulkApproveTopUps = async () => {
    try {
      setProcessingTopUp((prev) => {
        const newState = { ...prev }
        selectedTopUpIds.forEach(id => {
          newState[id] = true
        })
        return newState
      })

      const response = await fetch('/api/admin/topup/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'approve',
          requestIds: selectedTopUpIds
        })
      })

      const data = await response.json()
      if (response.ok) {
        showToast(
          `Bulk approval completed! ${data.processedCount} requests approved${data.errorCount > 0 ? `, ${data.errorCount} errors` : ''}`,
          'success'
        )
        setSelectedTopUpIds([])
        fetchTopUpRequests()
      } else {
        showToast(data.error || 'Failed to process bulk approval', 'error')
      }
    } catch (error) {
      showToast('Failed to process bulk approval', 'error')
    } finally {
      setProcessingTopUp((prev) => {
        const newState = { ...prev }
        selectedTopUpIds.forEach(id => {
          delete newState[id]
        })
        return newState
      })
    }
  }

  const bulkRejectTopUps = async () => {
    if (!bulkTopUpRejectModal.reason.trim()) {
      showToast('Please provide a rejection reason', 'error')
      return
    }

    try {
      setProcessingTopUp((prev) => {
        const newState = { ...prev }
        bulkTopUpRejectModal.selectedIds.forEach(id => {
          newState[id] = true
        })
        return newState
      })

      const response = await fetch('/api/admin/topup/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'reject',
          requestIds: bulkTopUpRejectModal.selectedIds,
          rejectionReason: bulkTopUpRejectModal.reason
        })
      })

      const data = await response.json()
      if (response.ok) {
        showToast(
          `Bulk rejection completed! ${data.processedCount} requests rejected${data.errorCount > 0 ? `, ${data.errorCount} errors` : ''}`,
          'success'
        )
        setBulkTopUpRejectModal({
          show: false,
          selectedIds: [],
          reason: ''
        })
        setSelectedTopUpIds([])
        fetchTopUpRequests()
      } else {
        showToast(data.error || 'Failed to process bulk rejection', 'error')
      }
    } catch (error) {
      showToast('Failed to process bulk rejection', 'error')
    } finally {
      setProcessingTopUp((prev) => {
        const newState = { ...prev }
        bulkTopUpRejectModal.selectedIds.forEach(id => {
          delete newState[id]
        })
        return newState
      })
    }
  }

  const rejectTopUp = async () => {
    if (!topUpRejectModal.reason.trim()) {
      showToast('Please provide a rejection reason', 'error')
      return
    }

    setProcessingTopUp((prev) => ({
      ...prev,
      [topUpRejectModal.requestId]: true
    }))
    try {
      const response = await fetch('/api/admin/topup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId: topUpRejectModal.requestId,
          action: 'reject',
          rejectionReason: topUpRejectModal.reason
        })
      })

      const data = await response.json()
      if (response.ok) {
        showToast(`Top-up rejected for ฿${data.amount}`, 'success')
        setTopUpRejectModal({
          show: false,
          requestId: '',
          amount: '',
          reason: ''
        })
        fetchTopUpRequests()
      } else {
        showToast(data.error || 'Failed to reject top-up', 'error')
      }
    } catch (error) {
      showToast('Failed to reject top-up', 'error')
    } finally {
      setProcessingTopUp((prev) => ({
        ...prev,
        [topUpRejectModal.requestId]: false
      }))
    }
  }

  const approveExtension = async (requestId) => {
    setProcessingExtension((prev) => ({ ...prev, [requestId]: true }))
    try {
      const response = await fetch('/api/admin/extension-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId,
          action: 'approve'
        })
      })

      const data = await response.json()
      if (response.ok) {
        showToast(
          `Extension approved! ${data.licenseCode} extended by ${data.extendedDays} days`,
          'success'
        )
        // Optimistically update local list so UI reflects immediately
        setExtensionRequests((prev) =>
          prev.map((r) =>
            r._id === requestId
              ? {
                  ...r,
                  status: 'approved',
                  processedAt: new Date().toISOString(),
                  processedBy: 'admin'
                }
              : r
          )
        )
        fetchExtensionRequests()
        fetchAllCustomers() // Refresh customer list
      } else {
        showToast(data.error || 'Failed to approve extension', 'error')
      }
    } catch (error) {
      showToast('Failed to approve extension', 'error')
    } finally {
      setProcessingExtension((prev) => ({ ...prev, [requestId]: false }))
    }
  }

  const showRejectModal = (requestId, licenseCode) => {
    setRejectionModal({
      show: true,
      requestId,
      licenseCode,
      reason: ''
    })
  }

  const rejectExtension = async () => {
    if (!rejectionModal.reason.trim()) {
      showToast('Please provide a rejection reason', 'error')
      return
    }

    setProcessingExtension((prev) => ({
      ...prev,
      [rejectionModal.requestId]: true
    }))
    try {
      const response = await fetch('/api/admin/extension-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId: rejectionModal.requestId,
          action: 'reject',
          rejectionReason: rejectionModal.reason
        })
      })

      const data = await response.json()
      if (response.ok) {
        showToast(`Extension rejected for ${data.licenseCode}`, 'success')
        setRejectionModal({
          show: false,
          requestId: '',
          licenseCode: '',
          reason: ''
        })
        fetchExtensionRequests()
      } else {
        showToast(data.error || 'Failed to reject extension', 'error')
      }
    } catch (error) {
      showToast('Failed to reject extension', 'error')
    } finally {
      setProcessingExtension((prev) => ({
        ...prev,
        [rejectionModal.requestId]: false
      }))
    }
  }

  // Admin extend functions
  const showExtendModal = (customer) => {
    setExtendModal({
      show: true,
      customerId: customer._id,
      licenseCode: customer.license,
      currentExpiry: customer.expireDate || 'Unknown',
      selectedPlan: '', // Start with custom option
      customDays: '',
      extendingCode: false
    })
  }

  const handleAdminExtendCode = async () => {
    // Determine which days to use - custom or preset plan
    let daysToExtend
    if (extendModal.customDays && extendModal.customDays.trim() !== '') {
      daysToExtend = parseInt(extendModal.customDays)
      if (isNaN(daysToExtend) || daysToExtend <= 0) {
        showToast('Please enter a valid number of days', 'error')
        return
      }
    } else if (extendModal.selectedPlan) {
      daysToExtend = parseInt(extendModal.selectedPlan)
    } else {
      showToast('Please select an extension plan or enter custom days', 'error')
      return
    }

    setExtendModal((prev) => ({ ...prev, extendingCode: true }))

    try {
      const response = await fetch('/api/admin/extend-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: extendModal.customerId,
          extendDays: daysToExtend
        })
      })

      const data = await response.json()

      if (response.ok) {
        const extendType = extendModal.customDays ? 'custom' : 'preset'
        showToast(
          `License ${extendModal.licenseCode} extended by ${daysToExtend} days (${extendType})! New expiry: ${data.newExpiry}`,
          'success'
        )
        setExtendModal({
          show: false,
          customerId: '',
          licenseCode: '',
          currentExpiry: '',
          selectedPlan: '30',
          customDays: '',
          extendingCode: false
        })

        // Refresh customer list
        fetchAllCustomers()
      } else {
        showToast(data.error || 'Failed to extend license', 'error')
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setExtendModal((prev) => ({ ...prev, extendingCode: false }))
    }
  }

  const createManualAccount = async (e) => {
    e.preventDefault()
    setCreatingAccount(true)

    try {
      const response = await fetch('/api/admin/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(manualAccountForm)
      })

      const data = await response.json()

      if (response.ok) {
        const extendMessage = manualAccountForm.extendDays
          ? ` (${manualAccountForm.plan === 'lifetime' ? 'Lifetime' : `${manualAccountForm.plan} days`}${manualAccountForm.extendDays ? ` + ${manualAccountForm.extendDays} extra days` : ''})`
          : ''

        const expiryMessage = data.license.expireDateThai
          ? ` | Expires: ${data.license.expireDateThai}`
          : ''

        showToast(
          `License generated successfully! License Key: ${data.license.license}${extendMessage}${expiryMessage}`,
          'success'
        )

        // Reset form
        setManualAccountForm({
          username: '',
          platform: 'mt4',
          accountNumber: '',
          plan: 'lifetime',
          extendDays: '',
          demoDays: '',
          isDemo: false
        })

        // Refresh customer list
        fetchAllCustomers()

        // Switch to customers tab to show the new license
        setActiveTab('customers')
      } else {
        showToast(data.error || 'Failed to generate license', 'error')
      }
    } catch (error) {
      showToast('Failed to generate license', 'error')
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleFormChange = (field, value) => {
    setManualAccountForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  // Manual refresh function (real-time updates handled via WebSocket events)
  const refreshAllTables = async () => {
    try {
      console.log('🔄 Manual refreshing all tables...')
      await Promise.all([
        fetchPlanSettings(),
        fetchAllCustomers(),
        fetchTopUpRequests()
      ])
      showToast('Tables refreshed successfully!', 'success')
      showNotification('📊 Tables refreshed successfully!')
      playNotificationSound()
    } catch (error) {
      console.error('Error refreshing tables:', error)
      showToast('Error refreshing tables', 'error')
    }
  }

  const filteredCodes = codes.filter((code) => {
    const matchesFilter = filter === 'all' || code.status === filter
    const matchesSearch =
      searchTerm === '' ||
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.accountNumber.includes(searchTerm)
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800'
      case 'paid':
        return 'bg-blue-100 text-blue-800'
      case 'activated':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Q-DRAGON {t('admin_panel')}
            </h1>
            <p className="text-gray-600">
              {t('enter_admin_key')}{' '}
              {language === 'th'
                ? 'เพื่อเข้าถึงระบบจัดการการชำระเงิน'
                : 'to access payment management'}
            </p>
          </div>

          {/* Language Selector */}
          <div className="flex justify-center mb-6">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => changeLanguage('th')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  language === 'th'
                    ? 'bg-white text-yellow-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ไทย
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-white text-yellow-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label
                htmlFor="adminKey"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('admin_key')}
              </label>
              <input
                type="password"
                id="adminKey"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder={t('enter_admin_key')}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
            >
              {loading ? t('loading') : t('admin_panel')}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Q-DRAGON {t('admin_panel')}
              </h1>
              <p className="text-gray-600">
                {language === 'th'
                  ? 'จัดการการชำระเงินและการเปิดใช้งานรหัสเทรดดิ้ง'
                  : 'Manage trading code payments and activations'}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${wsInitializing ? 'bg-yellow-400 animate-pulse' : wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {wsInitializing
                      ? 'Connecting...'
                      : wsConnected
                        ? 'Live (WebSocket)'
                        : 'Offline'}
                  </span>
                  {!wsConnected && !wsInitializing && (
                    <button
                      onClick={() => window.location.reload()}
                      className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => changeLanguage('th')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    language === 'th'
                      ? 'bg-white text-yellow-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ไทย
                </button>
                <button
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    language === 'en'
                      ? 'bg-white text-yellow-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Auto-refresh removed - using real-time WebSocket updates */}
              <button
                onClick={() => {
                  fetch('/api/admin/logout', {
                    method: 'POST',
                    credentials: 'include'
                  })
                  setIsAuthenticated(false)
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'customers'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('customers')} ({customers.length})
              </button>
              <button
                onClick={() => setActiveTab('create-account')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'create-account'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('manual_account')}
              </button>
              <button
                onClick={() => setActiveTab('topup-requests')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'topup-requests'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {language === 'th' ? 'คำขอเติมเงิน' : 'Top-ups'} (
                {Array.isArray(topUpRequests)
                  ? topUpRequests.filter((r) => r.status === 'pending').length
                  : 0}
                )
              </button>
              <button
                onClick={() => setActiveTab('add-credits')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'add-credits'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {language === 'th' ? 'เพิ่มเครดิต' : 'Add Credits'}
              </button>
              <button
                onClick={() => setActiveTab('plan-settings')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'plan-settings'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {language === 'th' ? 'ตั้งค่าแผน' : 'Plan Settings'} ({planSettings.length})
              </button>
              <button
                onClick={() => setActiveTab('system-settings')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'system-settings'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {language === 'th' ? 'ตั้งค่าระบบ' : 'System Settings'}
              </button>
            </nav>
          </div>
        </div>



        {activeTab === 'plan-settings' && (
          <>
            {/* Plan Settings Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <button
                    onClick={fetchPlanSettings}
                    disabled={loadingPlans}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center"
                  >
                    {loadingPlans ? (
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                    )}
                    {t('refresh')}
                  </button>

                  <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="all">{language === 'th' ? 'แผนทั้งหมด' : 'All Plans'}</option>
                    <option value="active">{language === 'th' ? 'ใช้งานอยู่' : 'Active'}</option>
                    <option value="inactive">{language === 'th' ? 'ไม่ใช้งาน' : 'Inactive'}</option>
                  </select>

                  <button
                    onClick={() => showPlanModal('create')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    {language === 'th' ? 'เพิ่มแผน' : 'Add Plan'}
                  </button>
                </div>
              </div>
            </div>

            {/* Plan Settings Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {['all', 'active', 'inactive', 'lifetime'].map((status) => {
                const plans = planSettings.filter((plan) => {
                  if (status === 'all') return true
                  if (status === 'active') return plan.isActive
                  if (status === 'inactive') return !plan.isActive
                  if (status === 'lifetime') return plan.isLifetime
                  return false
                })
                const count = plans.length
                const totalValue = plans.reduce((sum, plan) => sum + plan.price, 0)
                
                return (
                  <div key={status} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {status === 'all'
                        ? language === 'th' ? 'แผนทั้งหมด' : 'Total Plans'
                        : status === 'active'
                          ? language === 'th' ? 'ใช้งานอยู่' : 'Active Plans'
                          : status === 'inactive'
                            ? language === 'th' ? 'ไม่ใช้งาน' : 'Inactive Plans'
                            : language === 'th' ? 'แผนตลอดชีพ' : 'Lifetime Plans'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ${totalValue.toFixed(2)} {language === 'th' ? 'รวม' : 'total value'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Plan Settings Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'ชื่อแผน' : 'Plan Name'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'วัน' : 'Days'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'ราคา' : 'Price'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'เครดิต' : 'Credits'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'ราคา/วัน' : 'Price/Day'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'สถานะ' : 'Status'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'คำอธิบาย' : 'Description'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'การดำเนินการ' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {planSettings
                      .filter((plan) => {
                        if (planFilter === 'all') return true
                        if (planFilter === 'active') return plan.isActive
                        if (planFilter === 'inactive') return !plan.isActive
                        return true
                      })
                      .map((plan) => (
                        <tr key={plan.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {plan.name}
                            {plan.isLifetime && (
                              <span className="ml-2 inline-flex px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
                                LIFETIME
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {plan.isLifetime ? '∞' : plan.days.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-green-600">
                            ฿{plan.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-blue-600">
                            {plan.points}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {plan.pricePerDay ? `฿${plan.pricePerDay}` : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                plan.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {plan.isActive
                                ? language === 'th' ? 'ใช้งาน' : 'ACTIVE'
                                : language === 'th' ? 'ไม่ใช้งาน' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {plan.description || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => showPlanModal('edit', plan)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                              >
                                {language === 'th' ? 'แก้ไข' : 'Edit'}
                              </button>
                              <button
                                onClick={() => deletePlan(plan.id, plan.name)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                              >
                                {language === 'th' ? 'ลบ' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {planSettings.filter((plan) => {
                if (planFilter === 'all') return true
                if (planFilter === 'active') return plan.isActive
                if (planFilter === 'inactive') return !plan.isActive
                return true
              }).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  <p className="text-lg font-medium">
                    {language === 'th' ? 'ไม่พบแผน' : 'No plans found'}
                  </p>
                  <p className="text-sm">
                    {language === 'th' ? 'ไม่มีแผนที่ตรงกับตัวกรองที่เลือก' : 'No plans match your current filter'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'customers' && (
          <>
            {/* Customer Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <button
                    onClick={fetchAllCustomers}
                    disabled={loadingCustomers}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center"
                  >
                    {loadingCustomers ? (
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

                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="all">
                      {t('all')} {t('status')}
                    </option>
                    <option value="valid">{t('valid')}</option>
                    <option value="expired">{t('expired')}</option>
                    <option value="suspended">{t('suspended')}</option>
                  </select>
                  <button
                    onClick={() => setBulkSelecting((b) => !b)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border ${bulkSelecting ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  >
                    {bulkSelecting ? t('bulk_mode_on') : t('bulk_mode')}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder={
                    language === 'th'
                      ? 'ค้นหาตามชื่อผู้ใช้, ใบอนุญาต หรือหมายเลขบัญชี...'
                      : 'Search by username, license or account number...'
                  }
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 min-w-64"
                />
              </div>
              {bulkSelecting && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                  <div className="text-sm text-blue-700 font-medium flex items-center gap-2">
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
                        d="M3 7h18M3 12h18M3 17h18"
                      />
                    </svg>
                    {selectedCustomerIds.length} {t('selected') || 'selected'}
                    <button
                      onClick={selectAllVisibleCustomers}
                      className="ml-2 text-xs underline"
                    >
                      {t('select_visible')}
                    </button>
                    <button
                      onClick={clearSelection}
                      className="ml-1 text-xs underline"
                    >
                      {t('clear_selection')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => performBulkAction('suspend')}
                      disabled={selectedCustomerIds.length === 0}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-xs disabled:opacity-50"
                    >
                      {t('suspend_selected')}
                    </button>
                    <button
                      onClick={() => performBulkAction('delete')}
                      disabled={selectedCustomerIds.length === 0}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs disabled:opacity-50"
                    >
                      {t('delete_selected')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {['all', 'valid', 'expired', 'suspended'].map((status) => {
                const count =
                  status === 'all'
                    ? customers.length
                    : customers.filter((c) => c.status === status).length
                return (
                  <div
                    key={status}
                    className="bg-white rounded-xl shadow-lg p-6"
                  >
                    <div className="text-2xl font-bold text-gray-900">
                      {count}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {status === 'all'
                        ? language === 'th'
                          ? 'ลูกค้าทั้งหมด'
                          : 'Total Customers'
                        : status === 'valid'
                          ? t('valid')
                          : status === 'expired'
                            ? t('expired')
                            : status === 'suspended'
                              ? t('suspended')
                              : status}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Customer Accounts Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {bulkSelecting && (
                        <th className="px-3 py-4 text-left text-sm font-medium text-gray-900">
                          Sel
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('user')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 whitespace-nowrap">
                        {t('license')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('platform')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('account')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('plan')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('expire_date')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 whitespace-nowrap min-w-[110px]">
                        {t('status')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('source')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('activated')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers
                      .filter((customer) => {
                        const matchesFilter =
                          customerFilter === 'all' ||
                          customer.status === customerFilter
                        const matchesSearch =
                          customerSearch === '' ||
                          customer.user
                            .toLowerCase()
                            .includes(customerSearch.toLowerCase()) ||
                          customer.license
                            .toLowerCase()
                            .includes(customerSearch.toLowerCase()) ||
                          customer.accountNumber
                            .toLowerCase()
                            .includes(customerSearch.toLowerCase())
                        return matchesFilter && matchesSearch
                      })
                      .map((customer) => (
                        <tr key={customer._id} className="hover:bg-gray-50">
                          {bulkSelecting && (
                            <td className="px-3 py-4 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                checked={selectedCustomerIds.includes(
                                  customer._id
                                )}
                                onChange={() =>
                                  toggleSelectCustomer(customer._id)
                                }
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {customer.user}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-blue-600 font-bold whitespace-nowrap">
                            {customer.license}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                            {customer.platform}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {customer.accountNumber}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {customer.plan} days
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {customer.plan === 999999
                              ? 'Lifetime'
                              : customer.expireDate}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wide rounded-full uppercase ${
                                customer.status === 'valid'
                                  ? 'bg-green-500/90 text-white shadow-sm'
                                  : customer.status === 'expired'
                                    ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg ring-2 ring-red-300/40 animate-pulse'
                                    : 'bg-yellow-400/90 text-gray-900 shadow-sm'
                              }`}
                              title={
                                customer.status === 'expired'
                                  ? 'This license has fully expired'
                                  : ''
                              }
                            >
                              {customer.status === 'expired' && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                              )}
                              {customer.status === 'valid'
                                ? t('valid')
                                : customer.status === 'expired'
                                  ? t('expired')
                                  : customer.status === 'suspended'
                                    ? t('suspended')
                                    : customer.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                customer.adminGenerated ||
                                customer.createdBy === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {customer.adminGenerated ||
                              customer.createdBy === 'admin'
                                ? 'ADMIN'
                                : 'USER'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatThaiDateTime(customer.activatedAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {(customer.status === 'valid' ||
                                customer.status === 'expired') &&
                                customer.plan !== 999999 && (
                                  <button
                                    onClick={() => showExtendModal(customer)}
                                    disabled={updating[customer._id]}
                                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                  >
                                    {updating[customer._id]
                                      ? '...'
                                      : t('extend')}
                                  </button>
                                )}
                              {customer.status === 'valid' && (
                                <button
                                  onClick={() =>
                                    updateCustomerStatus(
                                      customer._id,
                                      'suspended'
                                    )
                                  }
                                  disabled={updating[customer._id]}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                >
                                  {updating[customer._id]
                                    ? '...'
                                    : t('suspend_action')}
                                </button>
                              )}
                              {customer.status === 'suspended' && (
                                <button
                                  onClick={() =>
                                    updateCustomerStatus(customer._id, 'valid')
                                  }
                                  disabled={updating[customer._id]}
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                >
                                  {updating[customer._id]
                                    ? '...'
                                    : t('reactivate_action')}
                                </button>
                              )}
                              {(customer.status === 'suspended' ||
                                customer.status === 'expired') && (
                                <button
                                  onClick={() =>
                                    handleDeleteClick(
                                      'customer',
                                      customer._id,
                                      customer.license
                                    )
                                  }
                                  disabled={updating[customer._id]}
                                  className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                >
                                  {updating[customer._id] ? '...' : t('delete')}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {customers.filter((customer) => {
                const matchesFilter =
                  customerFilter === 'all' || customer.status === customerFilter
                const matchesSearch =
                  customerSearch === '' ||
                  customer.user
                    .toLowerCase()
                    .includes(customerSearch.toLowerCase()) ||
                  customer.license
                    .toLowerCase()
                    .includes(customerSearch.toLowerCase()) ||
                  customer.accountNumber
                    .toLowerCase()
                    .includes(customerSearch.toLowerCase())
                return matchesFilter && matchesSearch
              }).length === 0 && (
                <div className="text-center py-12 text-gray-500">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    ></path>
                  </svg>
                  <p className="text-lg font-medium">No customers found</p>
                  <p className="text-sm">
                    No customer accounts match your current filter
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'create-account' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('generate_license_key')}
              </h2>
              <p className="text-gray-600">{t('create_trading_license')}</p>
            </div>

            <form
              onSubmit={createManualAccount}
              className="max-w-2xl space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t('username')} *
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={manualAccountForm.username}
                    onChange={(e) =>
                      handleFormChange('username', e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder={t('enter_username')}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="accountNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t('account_number')} *
                  </label>
                  <input
                    type="text"
                    id="accountNumber"
                    value={
                      manualAccountForm.isDemo
                        ? ''
                        : manualAccountForm.accountNumber
                    }
                    onChange={(e) =>
                      handleFormChange('accountNumber', e.target.value)
                    }
                    onKeyPress={(e) => {
                      if (!manualAccountForm.isDemo && !/[0-9]/.test(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${manualAccountForm.isDemo ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                    placeholder={
                      manualAccountForm.isDemo
                        ? 'DEMO'
                        : t('enter_account_number')
                    }
                    disabled={manualAccountForm.isDemo}
                    required={!manualAccountForm.isDemo}
                  />
                </div>

                <div>
                  <label
                    htmlFor="platform"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t('trading_platform')} *
                  </label>
                  <select
                    id="platform"
                    value={manualAccountForm.platform}
                    onChange={(e) =>
                      handleFormChange('platform', e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  >
                    <option value="mt4">MetaTrader 4 (MT4)</option>
                    <option value="mt5">MetaTrader 5 (MT5)</option>
                    <option value="ctrader">cTrader</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="plan"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t('plan_duration')} *
                  </label>
                  <select
                    id="plan"
                    value={manualAccountForm.plan}
                    onChange={(e) => handleFormChange('plan', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${manualAccountForm.isDemo ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                    required
                    disabled={manualAccountForm.isDemo}
                  >
                    <option value="7">7 Days (Trial)</option>
                    <option value="30">30 Days (Monthly)</option>
                    <option value="90">90 Days (Quarterly)</option>
                    <option value="180">180 Days (Semi-Annual)</option>
                    <option value="365">365 Days (Annual)</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="extendDays"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t('extend_days_optional')}
                  </label>
                  <input
                    type="number"
                    id="extendDays"
                    value={manualAccountForm.extendDays}
                    onChange={(e) =>
                      handleFormChange('extendDays', e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${manualAccountForm.isDemo ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                    placeholder={t('additional_days')}
                    min="0"
                    max="9999"
                    disabled={manualAccountForm.isDemo}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {manualAccountForm.isDemo
                      ? t('demo_mode_extra_days_disabled')
                      : t('add_extra_days')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('demo_license_title')}
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="isDemo"
                      checked={manualAccountForm.isDemo}
                      onChange={(e) =>
                        handleFormChange('isDemo', e.target.checked)
                      }
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isDemo" className="text-sm text-gray-700">
                      {t('mark_as_demo')}
                    </label>
                  </div>
                  <input
                    type="number"
                    id="demoDays"
                    value={manualAccountForm.demoDays}
                    onChange={(e) =>
                      handleFormChange('demoDays', e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100"
                    placeholder={t('demo_days_placeholder')}
                    min="1"
                    max="60"
                    disabled={!manualAccountForm.isDemo}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('demo_days_help')}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
                      d="M15 7a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-6a2 2 0 01-2-2V9a2 2 0 012-2h2z"
                    ></path>
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800 mb-1">
                      {t('license_generation_notice')}
                    </h3>
                    <div className="text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>{t('unique_license_generated')}</li>
                        <li>{t('immediately_activated')}</li>
                        <li>{t('expiry_calculated')}</li>
                        <li>{t('no_user_account')}</li>
                        <li>{t('direct_trading_access')}</li>
                        <li>
                          <strong>{t('extend_days_note')}</strong>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={creatingAccount}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 flex items-center"
                >
                  {creatingAccount ? (
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
                      {t('generating_license')}
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
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        ></path>
                      </svg>
                      {t('generate_license')}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setManualAccountForm({
                      username: '',
                      platform: 'mt4',
                      accountNumber: '',
                      plan: 'lifetime',
                      extendDays: ''
                    })
                  }
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                >
                  Reset Form
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'topup-requests' && (
          <>
            {/* Top-up Request Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <button
                    onClick={fetchTopUpRequests}
                    disabled={loadingTopUps}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center"
                  >
                    {loadingTopUps ? (
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

                  <select
                    value={topUpFilter}
                    onChange={(e) => setTopUpFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="all">
                      {language === 'th' ? 'คำขอทั้งหมด' : 'All Requests'}
                    </option>
                    <option value="pending">{t('pending')}</option>
                    <option value="approved">
                      {language === 'th' ? 'อนุมัติแล้ว' : 'Approved'}
                    </option>
                    <option value="rejected">
                      {language === 'th' ? 'ปฏิเสธแล้ว' : 'Rejected'}
                    </option>
                  </select>
                  
                  <button
                    onClick={() => setBulkTopUpMode((b) => !b)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border ${bulkTopUpMode ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  >
                    {bulkTopUpMode 
                      ? (language === 'th' ? 'โหมดจัดการหลายรายการ' : 'Bulk Mode ON')
                      : (language === 'th' ? 'จัดการหลายรายการ' : 'Bulk Actions')
                    }
                  </button>
                </div>
              </div>
              
              {bulkTopUpMode && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                  <div className="text-sm text-blue-700 font-medium flex items-center gap-2">
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {selectedTopUpIds.length} {language === 'th' ? 'รายการที่เลือก' : 'selected'}
                    <button
                      onClick={selectAllVisibleTopUps}
                      className="ml-2 text-xs underline"
                    >
                      {language === 'th' ? 'เลือกที่แสดง (รอดำเนินการ)' : 'Select Visible (Pending)'}
                    </button>
                    <button
                      onClick={clearTopUpSelection}
                      className="ml-1 text-xs underline"
                    >
                      {language === 'th' ? 'ยกเลิกการเลือก' : 'Clear Selection'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => performBulkTopUpAction('approve')}
                      disabled={selectedTopUpIds.length === 0}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-xs disabled:opacity-50 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      {language === 'th' ? 'อนุมัติที่เลือก' : 'Approve Selected'}
                    </button>
                    <button
                      onClick={() => performBulkTopUpAction('reject')}
                      disabled={selectedTopUpIds.length === 0}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs disabled:opacity-50 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      {language === 'th' ? 'ปฏิเสธที่เลือก' : 'Reject Selected'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Top-up Request Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {['all', 'pending', 'approved', 'rejected'].map((status) => {
                const requests = Array.isArray(topUpRequests)
                  ? topUpRequests
                  : []
                const count =
                  status === 'all'
                    ? requests.length
                    : requests.filter((r) => r.status === status).length
                const totalAmount =
                  status === 'all'
                    ? requests.reduce((sum, r) => sum + (r.amount || 0), 0)
                    : requests
                        .filter((r) => r.status === status)
                        .reduce((sum, r) => sum + (r.amount || 0), 0)
                return (
                  <div
                    key={status}
                    className="bg-white rounded-xl shadow-lg p-6"
                  >
                    <div className="text-2xl font-bold text-gray-900">
                      {count}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {status === 'all'
                        ? language === 'th'
                          ? 'คำขอทั้งหมด'
                          : 'Total Requests'
                        : status === 'pending'
                          ? language === 'th'
                            ? 'รอดำเนินการ'
                            : 'Pending'
                          : status === 'approved'
                            ? language === 'th'
                              ? 'อนุมัติแล้ว'
                              : 'Approved'
                            : language === 'th'
                              ? 'ปฏิเสธแล้ว'
                              : 'Rejected'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ฿{totalAmount.toFixed(2)}{' '}
                      {language === 'th' ? 'รวม' : 'total'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Top-up Requests Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {bulkTopUpMode && (
                        <th className="px-3 py-4 text-left text-sm font-medium text-gray-900">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            onChange={(e) => {
                              if (e.target.checked) {
                                selectAllVisibleTopUps()
                              } else {
                                clearTopUpSelection()
                              }
                            }}
                            checked={selectedTopUpIds.length > 0 && selectedTopUpIds.length === (Array.isArray(topUpRequests) ? topUpRequests : [])
                              .filter((request) => {
                                const matchesFilter = topUpFilter === 'all' || request.status === topUpFilter
                                return matchesFilter && request.status === 'pending'
                              }).length}
                          />
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('user')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'จำนวนเงิน' : 'Amount'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'เครดิต' : 'Credits'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('status')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'วันที่ขอ' : 'Requested'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {language === 'th' ? 'ดำเนินการ' : 'Processed'}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(Array.isArray(topUpRequests) ? topUpRequests : [])
                      .filter(
                        (request) =>
                          topUpFilter === 'all' ||
                          request.status === topUpFilter
                      )
                      .map((request) => (
                        <tr key={request._id} className="hover:bg-gray-50">
                          {bulkTopUpMode && (
                            <td className="px-3 py-4 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                checked={selectedTopUpIds.includes(request._id)}
                                onChange={() => toggleSelectTopUp(request._id)}
                                disabled={request.status !== 'pending'}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {request.userId?.username || 'Unknown User'}
                          </td>
                          <td className="px-6 py-4 text-sm text-green-600 font-bold">
                            ฿{request.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-blue-600 font-bold">
                            {request.points} crd
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                request.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : request.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {request.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatThaiDateTime(request.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {request.processedAt
                              ? formatThaiDateTime(request.processedAt)
                              : '-'}
                            {request.processedBy && (
                              <div className="text-xs text-gray-400">
                                by {request.processedBy}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => approveTopUp(request._id)}
                                    disabled={processingTopUp[request._id]}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                  >
                                    {processingTopUp[request._id]
                                      ? '...'
                                      : language === 'th'
                                        ? 'อนุมัติ'
                                        : 'Approve'}
                                  </button>
                                  <button
                                    onClick={() =>
                                      showTopUpRejectModal(
                                        request._id,
                                        request.amount
                                      )
                                    }
                                    disabled={processingTopUp[request._id]}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                  >
                                    {processingTopUp[request._id]
                                      ? '...'
                                      : language === 'th'
                                        ? 'ปฏิเสธ'
                                        : 'Reject'}
                                  </button>
                                </>
                              )}
                              {request.status === 'rejected' &&
                                request.rejectionReason && (
                                  <span
                                    className="text-xs text-red-600"
                                    title={request.rejectionReason}
                                  >
                                    Reason:{' '}
                                    {request.rejectionReason.substring(0, 20)}
                                    ...
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {(Array.isArray(topUpRequests) ? topUpRequests : []).filter(
                (request) =>
                  topUpFilter === 'all' || request.status === topUpFilter
              ).length === 0 && (
                <div className="text-center py-12 text-gray-500">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <p className="text-lg font-medium">
                    {language === 'th'
                      ? 'ไม่พบคำขอเติมเงิน'
                      : 'No top-up requests found'}
                  </p>
                  <p className="text-sm">
                    {language === 'th'
                      ? 'ไม่มีคำขอเติมเงินที่ตรงกับตัวกรองที่เลือก'
                      : 'No top-up requests match your current filter'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}


      </div>

      {/* Top-up Rejection Modal */}
      {topUpRejectModal.show && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-gray-800/30 to-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
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
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {language === 'th'
                  ? 'ปฏิเสธคำขอเติมเงิน'
                  : 'Reject Top-up Request'}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'th' ? 'จำนวนเงิน' : 'Amount'}:{' '}
                <span className="font-bold text-red-600">
                  ฿{topUpRejectModal.amount}
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="topUpRejectionReason"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {language === 'th'
                    ? 'เหตุผลที่ปฏิเสธ *'
                    : 'Rejection Reason *'}
                </label>
                <textarea
                  id="topUpRejectionReason"
                  value={topUpRejectModal.reason}
                  onChange={(e) =>
                    setTopUpRejectModal((prev) => ({
                      ...prev,
                      reason: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={
                    language === 'th'
                      ? 'โปรดระบุเหตุผลในการปฏิเสธ...'
                      : 'Please provide a reason for rejection...'
                  }
                  rows="3"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setTopUpRejectModal({
                      show: false,
                      requestId: '',
                      amount: '',
                      reason: ''
                    })
                  }
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  onClick={rejectTopUp}
                  disabled={
                    processingTopUp[topUpRejectModal.requestId] ||
                    !topUpRejectModal.reason.trim()
                  }
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {processingTopUp[topUpRejectModal.requestId] ? (
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
                      {language === 'th' ? 'กำลังปฏิเสธ...' : 'Rejecting...'}
                    </>
                  ) : language === 'th' ? (
                    'ปฏิเสธคำขอ'
                  ) : (
                    'Reject Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Admin Extend Modal */}
      {extendModal.show && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-gray-800/30 to-black/40 backdrop-blur-sm flex justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 my-10 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 mb-4">
                <svg
                  className="h-6 w-6 text-purple-600"
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
                Extend License
              </h3>
              <p className="text-gray-600 mb-2">
                License:{' '}
                <span className="font-mono font-bold text-purple-600">
                  {extendModal.licenseCode}
                </span>
              </p>
              <p className="text-sm text-gray-500">
                Current Expiry: {extendModal.currentExpiry}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="extensionPlan"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Preset Extension Plans
                </label>
                <select
                  id="extensionPlan"
                  value={extendModal.selectedPlan}
                  onChange={(e) =>
                    setExtendModal((prev) => ({
                      ...prev,
                      selectedPlan: e.target.value,
                      customDays: ''
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">-- Select Custom Days Instead --</option>
                  <option value="7">7 Days (Trial Extension)</option>
                  <option value="30">30 Days (Monthly)</option>
                  <option value="60">60 Days (2 Months)</option>
                  <option value="90">90 Days (Quarterly)</option>
                  <option value="180">180 Days (6 Months)</option>
                  <option value="365">365 Days (Annual)</option>
                </select>
              </div>

              <div className="flex items-center">
                <div className="flex-1 border-t border-gray-300"></div>
                <div className="px-4 text-sm text-gray-500 bg-white">OR</div>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              <div>
                <label
                  htmlFor="customDays"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Custom Extension Days
                </label>
                <input
                  type="number"
                  id="customDays"
                  value={extendModal.customDays}
                  onChange={(e) =>
                    setExtendModal((prev) => ({
                      ...prev,
                      customDays: e.target.value,
                      selectedPlan: ''
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter custom days (e.g., 45)"
                  min="1"
                  max="9999"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter any number of days for custom extension. This will clear
                  the preset selection above.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-purple-400 mt-0.5 mr-3"
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
                  <div>
                    <h3 className="text-sm font-medium text-purple-800 mb-1">
                      Admin Extension Options
                    </h3>
                    <div className="text-sm text-purple-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          <strong>Preset Plans:</strong> Choose from predefined
                          extension periods
                        </li>
                        <li>
                          <strong>Custom Days:</strong> Enter any specific
                          number of days (1-9999)
                        </li>
                        <li>
                          License will be extended immediately - no approval
                          needed
                        </li>
                        <li>
                          New expiry date calculated from current expiry (or
                          today if expired)
                        </li>
                        <li>
                          Automatically reactivates expired licenses to valid
                          status
                        </li>
                        <li>
                          No payment required - admin override with audit trail
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setExtendModal({
                      show: false,
                      customerId: '',
                      licenseCode: '',
                      currentExpiry: '',
                      selectedPlan: '',
                      customDays: '',
                      extendingCode: false
                    })
                  }
                  disabled={extendModal.extendingCode}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdminExtendCode}
                  disabled={
                    extendModal.extendingCode ||
                    (!extendModal.selectedPlan && !extendModal.customDays)
                  }
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {extendModal.extendingCode ? (
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
                      Extending...
                    </>
                  ) : (
                    (() => {
                      const days =
                        extendModal.customDays &&
                        extendModal.customDays.trim() !== ''
                          ? extendModal.customDays
                          : extendModal.selectedPlan
                      const type =
                        extendModal.customDays &&
                        extendModal.customDays.trim() !== ''
                          ? 'Custom'
                          : 'Preset'
                      return `Extend by ${days} Days (${type})`
                    })()
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-gray-800/30 to-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Delete{' '}
                {deleteConfirmation.type === 'code'
                  ? 'Trading Code'
                  : 'Customer Account'}
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete{' '}
                <span className="font-mono font-bold text-red-600">
                  {deleteConfirmation.name}
                </span>
                ?
              </p>
              <p className="text-sm text-red-600 mb-4">
                This action cannot be undone. All associated data will be
                permanently removed.
              </p>
            </div>

            <div className="mb-6">
              <label
                htmlFor="confirmText"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Type <span className="font-bold text-red-600">DELETE</span> to
                confirm:
              </label>
              <input
                type="text"
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Type DELETE here"
                autoComplete="off"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={cancelDelete}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={
                  confirmText !== 'DELETE' || updating[deleteConfirmation.id]
                }
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating[deleteConfirmation.id]
                  ? 'Deleting...'
                  : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Notification */}
      {newItemNotification.show && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg border-l-4 border-green-600 animate-bounce ${newItemNotification.targetTab ? 'cursor-pointer hover:bg-green-600 transition-colors' : ''}`}
            onClick={() => {
              if (newItemNotification.targetTab) {
                setActiveTab(newItemNotification.targetTab)
                setNewItemNotification({
                  show: false,
                  message: '',
                  targetTab: null
                })
              }
            }}
          >
            <div className="flex items-center">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div>
                <p className="font-semibold">{newItemNotification.message}</p>
                <p className="text-sm opacity-90">
                  {newItemNotification.targetTab
                    ? 'Click to open related tab'
                    : 'Check the tables below for details'}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setNewItemNotification({
                    show: false,
                    message: '',
                    targetTab: null
                  })
                }}
                className="ml-4 text-white hover:text-gray-200"
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
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Top-up Reject Modal */}
      {bulkTopUpRejectModal.show && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-gray-800/30 to-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
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
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {language === 'th' ? 'ปฏิเสธคำขอเติมเงินหลายรายการ' : 'Bulk Reject Top-up Requests'}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'th' ? 'จำนวนคำขอที่เลือก' : 'Selected requests'}:{' '}
                <span className="font-bold text-red-600">
                  {bulkTopUpRejectModal.selectedIds.length}
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="bulkTopUpRejectionReason"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {language === 'th'
                    ? 'เหตุผลที่ปฏิเสธ (ใช้สำหรับทุกคำขอ) *'
                    : 'Rejection Reason (applies to all requests) *'}
                </label>
                <textarea
                  id="bulkTopUpRejectionReason"
                  value={bulkTopUpRejectModal.reason}
                  onChange={(e) =>
                    setBulkTopUpRejectModal((prev) => ({
                      ...prev,
                      reason: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={
                    language === 'th'
                      ? 'โปรดระบุเหตุผลในการปฏิเสธ...'
                      : 'Please provide a reason for rejection...'
                  }
                  rows="3"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setBulkTopUpRejectModal({
                      show: false,
                      selectedIds: [],
                      reason: ''
                    })
                  }
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  onClick={bulkRejectTopUps}
                  disabled={
                    bulkTopUpRejectModal.selectedIds.some(id => processingTopUp[id]) ||
                    !bulkTopUpRejectModal.reason.trim()
                  }
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {bulkTopUpRejectModal.selectedIds.some(id => processingTopUp[id]) ? (
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
                      {language === 'th' ? 'กำลังปฏิเสธ...' : 'Rejecting...'}
                    </>
                  ) : language === 'th' ? (
                    'ปฏิเสธคำขอทั้งหมด'
                  ) : (
                    'Reject All Requests'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Settings Modal */}
      {planModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {planModal.mode === 'create'
                ? language === 'th' ? 'สร้างแผนใหม่' : 'Create New Plan'
                : language === 'th' ? 'แก้ไขแผน' : 'Edit Plan'}
            </h2>

            <form onSubmit={handlePlanSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'th' ? 'ชื่อแผน' : 'Plan Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    placeholder={language === 'th' ? 'เช่น Premium Plan' : 'e.g. Premium Plan'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'th' ? 'จำนวนวัน' : 'Number of Days'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required={!planForm.isLifetime}
                    disabled={planForm.isLifetime}
                    value={planForm.days}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, days: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100"
                    placeholder="30"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'th' ? 'ราคา (บาท)' : 'Price (THB)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    placeholder="300.00"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'th' ? 'เครดิตที่ได้รับ' : 'Credits Received'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={planForm.points}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, points: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    placeholder="10"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'th' ? 'ลำดับการแสดง' : 'Sort Order'}
                  </label>
                  <input
                    type="number"
                    value={planForm.sortOrder}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, sortOrder: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={planForm.isActive}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded text-yellow-600 focus:ring-yellow-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {language === 'th' ? 'ใช้งาน' : 'Active'}
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={planForm.isLifetime}
                      onChange={(e) => {
                        setPlanForm(prev => ({
                          ...prev,
                          isLifetime: e.target.checked,
                          days: e.target.checked ? 0 : prev.days
                        }))
                      }}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {language === 'th' ? 'ตลอดชีพ' : 'Lifetime'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'th' ? 'คำอธิบาย' : 'Description'}
                </label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  placeholder={language === 'th' ? 'คำอธิบายแผน (ไม่บังคับ)' : 'Plan description (optional)'}
                  rows="3"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loadingPlans}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
                >
                  {loadingPlans ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}
                    </div>
                  ) : (
                    <>
                      {planModal.mode === 'create'
                        ? language === 'th' ? 'สร้างแผน' : 'Create Plan'
                        : language === 'th' ? 'บันทึกการเปลี่ยนแปลง' : 'Save Changes'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closePlanModal}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === 'system-settings' && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {language === 'th' ? 'ตั้งค่าระบบ' : 'System Settings'}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={fetchSystemSettings}
                disabled={loadingSettings}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                {loadingSettings ? (
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                )}
                {t('refresh')}
              </button>
              {systemSettings.length === 0 && (
                <button
                  onClick={initializeSystemSettings}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  {language === 'th' ? 'เริ่มต้นการตั้งค่า' : 'Initialize Settings'}
                </button>
              )}
            </div>
          </div>

          {loadingSettings ? (
            <div className="flex justify-center items-center py-12">
              <svg className="animate-spin w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : systemSettings.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <p className="text-gray-500">
                {language === 'th' ? 'ไม่มีการตั้งค่า คลิกเพื่อเริ่มต้น' : 'No settings found. Click to initialize.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account Number Change Settings */}
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                  {language === 'th' ? 'การเปลี่ยนหมายเลขบัญชี' : 'Account Number Change'}
                </h3>
                
                {systemSettings.filter(s => s.key.includes('account_number')).map(setting => (
                  <div key={setting.key} className="mb-4 last:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {setting.key === 'account_number_change_cost' 
                        ? (language === 'th' ? 'ค่าใช้จ่ายในการเปลี่ยน (เครดิต)' : 'Change Cost (Credits)')
                        : (language === 'th' ? 'เปิดใช้งานฟีเจอร์' : 'Feature Enabled')
                      }
                      <span className="ml-2 text-xs text-gray-500">{setting.description}</span>
                    </label>
                    
                    {typeof setting.value === 'boolean' ? (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={setting.value}
                          onChange={(e) => updateSystemSetting(setting.key, e.target.checked)}
                          className="rounded text-yellow-600 focus:ring-yellow-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {setting.value 
                            ? (language === 'th' ? 'เปิดใช้งาน' : 'Enabled')
                            : (language === 'th' ? 'ปิดใช้งาน' : 'Disabled')
                          }
                        </span>
                      </label>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editingSettings[setting.key] !== undefined ? editingSettings[setting.key] : setting.value}
                          onChange={(e) => setEditingSettings(prev => ({ ...prev, [setting.key]: e.target.value }))}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 w-48"
                          min="0"
                        />
                        <button
                          onClick={() => {
                            const newValue = parseInt(editingSettings[setting.key] || setting.value)
                            updateSystemSetting(setting.key, newValue)
                            setEditingSettings(prev => {
                              const updated = { ...prev }
                              delete updated[setting.key]
                              return updated
                            })
                          }}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                        >
                          {language === 'th' ? 'บันทึก' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Other settings categories can be added here */}
              <div className="text-sm text-gray-500 italic">
                {language === 'th' 
                  ? '* การตั้งค่าเหล่านี้มีผลทันทีกับผู้ใช้ทั้งหมด' 
                  : '* These settings take effect immediately for all users'
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Credits Tab */}
      {activeTab === 'add-credits' && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {language === 'th' ? 'เพิ่มเครดิตให้ลูกค้า' : 'Add Credits to Customer'}
          </h2>
          
          <div className="max-w-2xl">
            <form onSubmit={async (e) => {
              e.preventDefault()
              
              if (!addCreditsForm.username || !addCreditsForm.credits || !addCreditsForm.reason) {
                setToast({
                  show: true,
                  message: language === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : 'Please fill in all fields',
                  type: 'error'
                })
                return
              }

              const credits = parseFloat(addCreditsForm.credits)
              if (isNaN(credits) || credits === 0) {
                setToast({
                  show: true,
                  message: language === 'th' ? 'จำนวนเครดิตไม่ถูกต้อง' : 'Invalid credit amount',
                  type: 'error'
                })
                return
              }

              setAddingCredits(true)
              
              try {
                const response = await fetch('/api/admin/add-credits', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    username: addCreditsForm.username,
                    credits: credits,
                    reason: addCreditsForm.reason
                  })
                })

                const data = await response.json()

                if (!response.ok) {
                  throw new Error(data.error || 'Failed to add credits')
                }

                setToast({
                  show: true,
                  message: language === 'th' 
                    ? `เพิ่มเครดิต ${credits > 0 ? credits : credits} ให้ ${data.data.username} สำเร็จ (ยอดใหม่: ${data.data.newBalance})`
                    : `Successfully ${credits > 0 ? 'added' : 'deducted'} ${Math.abs(credits)} credits ${credits > 0 ? 'to' : 'from'} ${data.data.username} (New balance: ${data.data.newBalance})`,
                  type: 'success'
                })

                // Reset form
                setAddCreditsForm({ username: '', credits: '', reason: '' })

              } catch (error) {
                console.error('Error adding credits:', error)
                setToast({
                  show: true,
                  message: error.message || (language === 'th' ? 'เกิดข้อผิดพลาด' : 'An error occurred'),
                  type: 'error'
                })
              } finally {
                setAddingCredits(false)
              }
            }}>
              
              {/* Username/Email Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'th' ? 'ชื่อผู้ใช้ หรือ อีเมล' : 'Username or Email'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={addCreditsForm.username}
                  onChange={(e) => setAddCreditsForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder={language === 'th' ? 'กรอกชื่อผู้ใช้ หรือ อีเมล' : 'Enter username or email'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  disabled={addingCredits}
                />
                <p className="mt-2 text-sm text-gray-500">
                  {language === 'th' 
                    ? 'สามารถระบุเป็นชื่อผู้ใช้หรืออีเมลก็ได้' 
                    : 'You can specify either username or email address'}
                </p>
              </div>

              {/* Credits Amount Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'th' ? 'จำนวนเครดิต' : 'Credits Amount'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={addCreditsForm.credits}
                  onChange={(e) => setAddCreditsForm(prev => ({ ...prev, credits: e.target.value }))}
                  placeholder={language === 'th' ? 'กรอกจำนวน (+ เพิ่ม / - ลด)' : 'Enter amount (+ add / - deduct)'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  disabled={addingCredits}
                />
                <p className="mt-2 text-sm text-gray-500">
                  {language === 'th' 
                    ? 'ใช้ตัวเลขบวก (+) เพื่อเพิ่มเครดิต หรือตัวเลขลบ (-) เพื่อหักเครดิต' 
                    : 'Use positive numbers to add credits, negative to deduct credits'}
                </p>
              </div>

              {/* Reason Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'th' ? 'เหตุผล' : 'Reason'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={addCreditsForm.reason}
                  onChange={(e) => setAddCreditsForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder={language === 'th' ? 'ระบุเหตุผลในการปรับยอด (เช่น คืนเงิน, โปรโมชั่น, แก้ไขข้อผิดพลาด)' : 'Specify reason for adjustment (e.g., refund, promotion, error correction)'}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                  disabled={addingCredits}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addingCredits}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingCredits ? (
                    <>
                      <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {language === 'th' ? 'กำลังดำเนินการ...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      {language === 'th' ? 'เพิ่มเครดิต' : 'Add Credits'}
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Information Box */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-2">
                    {language === 'th' ? 'ข้อมูลสำคัญ:' : 'Important Information:'}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      {language === 'th' 
                        ? 'การเพิ่ม/ลดเครดิตจะมีผลทันที และจะส่งการแจ้งเตือนแบบเรียลไทม์ให้ผู้ใช้' 
                        : 'Credit adjustments take effect immediately and send real-time notifications to users'}
                    </li>
                    <li>
                      {language === 'th' 
                        ? 'ระบบจะบันทึกประวัติการทำธุรกรรมทั้งหมดพร้อมเหตุผล' 
                        : 'All transactions are recorded with reasons for audit trail'}
                    </li>
                    <li>
                      {language === 'th' 
                        ? 'ไม่สามารถทำให้ยอดเครดิตติดลบได้' 
                        : 'Cannot set negative credit balance'}
                    </li>
                    <li>
                      {language === 'th' 
                        ? '1 เครดิต = 1 วันของใบอนุญาต' 
                        : '1 credit = 1 day of license'}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg border-l-4 ${
              toast.type === 'success'
                ? 'bg-green-500 border-green-600 text-white'
                : toast.type === 'error'
                  ? 'bg-red-500 border-red-600 text-white'
                  : 'bg-blue-500 border-blue-600 text-white'
            } ${toast.targetTab ? 'cursor-pointer hover:brightness-110 transition' : ''}`}
            onClick={() => {
              if (toast.targetTab) {
                setActiveTab(toast.targetTab)
                setToast({ show: false, message: '', type: 'success' })
              }
            }}
          >
            <div className="flex items-center">
              {toast.type === 'success' && (
                <svg
                  className="w-5 h-5 mr-3"
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
              )}
              {toast.type === 'error' && (
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              )}
              <p className="font-medium">{toast.message}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setToast({ show: false, message: '', type: 'success' })
                }}
                className="ml-4 text-white hover:text-gray-200"
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
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
