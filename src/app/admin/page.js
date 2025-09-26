'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminKey, setAdminKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [codes, setCodes] = useState([])
  const [loadingCodes, setLoadingCodes] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [updating, setUpdating] = useState({})
  const [activeTab, setActiveTab] = useState('codes')
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerFilter, setCustomerFilter] = useState('all')
  const [customerSearch, setCustomerSearch] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    type: '',
    id: '',
    name: ''
  })
  const [confirmText, setConfirmText] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastCodeCount, setLastCodeCount] = useState(0)
  const [lastCustomerCount, setLastCustomerCount] = useState(0)
  const [newItemNotification, setNewItemNotification] = useState({
    show: false,
    message: ''
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
    extendDays: ''
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
          fetchAllCodes()
          fetchAllCustomers()
          fetchExtensionRequests()
        }
      } catch (error) {
        console.error('Admin auth check failed:', error)
      } finally {
        setLoading(false)
      }
    }
    checkAdminAuth()
  }, [])

  // Notification functions
  const showNotification = (message) => {
    setNewItemNotification({ show: true, message })
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNewItemNotification({ show: false, message: '' })
    }, 5000)
  }

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' })
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
      console.log('Could not play notification sound:', error)
    }
  }

  // Auto-refresh functionality for real-time updates
  useEffect(() => {
    let interval

    if (isAuthenticated && autoRefresh) {
      interval = setInterval(async () => {
        try {
          // Silently fetch updated data
          const [codesResponse, customersResponse] = await Promise.all([
            fetch('/api/admin/codes', { credentials: 'include' }),
            fetch('/api/admin/customers', { credentials: 'include' })
          ])

          if (codesResponse.ok && customersResponse.ok) {
            const codesData = await codesResponse.json()
            const customersData = await customersResponse.json()

            // Check for new codes
            if (
              codesData.codes &&
              codesData.codes.length > lastCodeCount &&
              lastCodeCount > 0
            ) {
              const newCodesCount = codesData.codes.length - lastCodeCount
              showNotification(
                `🆕 ${newCodesCount} new trading code${newCodesCount > 1 ? 's' : ''} generated!`
              )
              // Play notification sound
              playNotificationSound()
            }

            // Check for new customers
            if (
              customersData.accounts &&
              customersData.accounts.length > lastCustomerCount &&
              lastCustomerCount > 0
            ) {
              const newCustomersCount =
                customersData.accounts.length - lastCustomerCount
              showNotification(
                `🎉 ${newCustomersCount} new customer account${newCustomersCount > 1 ? 's' : ''} activated!`
              )
              // Play notification sound
              playNotificationSound()
            }

            // Update state
            setCodes(codesData.codes || [])
            setCustomers(customersData.accounts || [])
            setLastCodeCount(codesData.codes?.length || 0)
            setLastCustomerCount(customersData.accounts?.length || 0)
          }
        } catch (error) {
          console.error('Auto-refresh error:', error)
        }
      }, 10000) // Check every 10 seconds (reduced server load)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isAuthenticated, autoRefresh, lastCodeCount, lastCustomerCount])

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
        fetchAllCodes()
        fetchAllCustomers()
        fetchExtensionRequests()
      } else {
        showToast('Invalid admin key', 'error')
      }
    } catch (error) {
      console.error('Admin login error:', error)
      showToast('Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllCodes = async () => {
    setLoadingCodes(true)
    try {
      const response = await fetch('/api/admin/codes', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCodes(data.codes)
        setLastCodeCount(data.codes?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching codes:', error)
    } finally {
      setLoadingCodes(false)
    }
  }

  const fetchAllCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const response = await fetch('/api/admin/customers', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.accounts)
        setLastCustomerCount(data.accounts?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
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
          console.log(
            'Adding new customer account to state:',
            data.customerAccount
          )

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
      console.error('Error updating status:', error)
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
        showToast(
          `Customer account ${newStatus === 'suspended' ? 'suspended' : newStatus === 'valid' ? 'reactivated' : newStatus}`,
          'success'
        )
      } else {
        showToast('Failed to update customer status', 'error')
      }
    } catch (error) {
      console.error('Error updating customer status:', error)
      showToast('Update failed', 'error')
    } finally {
      setUpdating((prev) => ({ ...prev, [accountId]: false }))
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
      console.error('Error deleting:', error)
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
      console.error('Error fetching extension requests:', error)
    } finally {
      setLoadingExtensions(false)
    }
  }

  const approveExtension = async (requestId) => {
    setProcessingExtension(prev => ({ ...prev, [requestId]: true }))
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
        showToast(`Extension approved! ${data.licenseCode} extended by ${data.extendedDays} days`, 'success')
        fetchExtensionRequests()
        fetchAllCustomers() // Refresh customer list
      } else {
        showToast(data.error || 'Failed to approve extension', 'error')
      }
    } catch (error) {
      console.error('Error approving extension:', error)
      showToast('Failed to approve extension', 'error')
    } finally {
      setProcessingExtension(prev => ({ ...prev, [requestId]: false }))
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

    setProcessingExtension(prev => ({ ...prev, [rejectionModal.requestId]: true }))
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
        setRejectionModal({ show: false, requestId: '', licenseCode: '', reason: '' })
        fetchExtensionRequests()
      } else {
        showToast(data.error || 'Failed to reject extension', 'error')
      }
    } catch (error) {
      console.error('Error rejecting extension:', error)
      showToast('Failed to reject extension', 'error')
    } finally {
      setProcessingExtension(prev => ({ ...prev, [rejectionModal.requestId]: false }))
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

    setExtendModal(prev => ({ ...prev, extendingCode: true }))

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
        showToast(`License ${extendModal.licenseCode} extended by ${daysToExtend} days (${extendType})! New expiry: ${data.newExpiry}`, 'success')
        setExtendModal({ show: false, customerId: '', licenseCode: '', currentExpiry: '', selectedPlan: '30', customDays: '', extendingCode: false })
        
        // Refresh customer list
        fetchAllCustomers()
      } else {
        showToast(data.error || 'Failed to extend license', 'error')
      }
    } catch (error) {
      console.error('Error extending license:', error)
      showToast('Network error. Please try again.', 'error')
    } finally {
      setExtendModal(prev => ({ ...prev, extendingCode: false }))
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
          extendDays: ''
        })

        // Refresh customer list
        fetchAllCustomers()

        // Switch to customers tab to show the new license
        setActiveTab('customers')
      } else {
        showToast(data.error || 'Failed to generate license', 'error')
      }
    } catch (error) {
      console.error('Error generating license:', error)
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
              Q-DRAGON Admin
            </h1>
            <p className="text-gray-600">
              Enter admin key to access payment management
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label
                htmlFor="adminKey"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Admin Key
              </label>
              <input
                type="password"
                id="adminKey"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter admin key"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
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
                Q-DRAGON Admin Panel
              </h1>
              <p className="text-gray-600">
                Manage trading code payments and activations
              </p>
              {autoRefresh && (
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm text-green-600">
                    Live updates active
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoRefresh ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </div>
                <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
              </label>
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
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('codes')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'codes'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Trading Codes ({codes.length})
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'customers'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Customer Accounts ({customers.length})
              </button>
              <button
                onClick={() => setActiveTab('create-account')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'create-account'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Generate License
              </button>
              <button
                onClick={() => setActiveTab('extension-requests')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'extension-requests'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Extension Requests ({extensionRequests.filter(r => r.status === 'pending').length})
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'codes' && (
          <>
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <button
                    onClick={fetchAllCodes}
                    disabled={loadingCodes}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center"
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
                    Refresh
                  </button>

                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending_payment">Pending Payment</option>
                    <option value="paid">Paid</option>
                    <option value="activated">Activated</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Search by code, username, or account..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 min-w-64"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              {['all', 'pending_payment', 'paid', 'activated', 'expired'].map(
                (status) => {
                  const count =
                    status === 'all'
                      ? codes.length
                      : codes.filter((c) => c.status === status).length
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
                          ? 'Total Codes'
                          : status.replace('_', ' ')}
                      </div>
                    </div>
                  )
                }
              )}
            </div>

            {/* Codes Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Code
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Account
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Platform
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Plan
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Price
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Created
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCodes.map((code) => (
                      <tr key={code._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-sm text-blue-600 font-bold">
                          {code.code}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {code.username}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {code.accountNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                          {code.platform}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {code.plan} days
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          ${code.price}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(code.status)}`}
                          >
                            {code.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatThaiDateTime(code.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {code.status === 'pending_payment' && (
                              <button
                                onClick={() =>
                                  updateCodeStatus(code._id, 'paid')
                                }
                                disabled={updating[code._id]}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                              >
                                {updating[code._id] ? '...' : 'Confirm Payment'}
                              </button>
                            )}
                            {code.status === 'paid' && (
                              <button
                                onClick={() =>
                                  updateCodeStatus(code._id, 'activated')
                                }
                                disabled={updating[code._id]}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                              >
                                {updating[code._id] ? '...' : 'Activate'}
                              </button>
                            )}
                            {code.status !== 'cancelled' &&
                              code.status !== 'expired' && (
                                <button
                                  onClick={() =>
                                    updateCodeStatus(code._id, 'cancelled')
                                  }
                                  disabled={updating[code._id]}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                >
                                  {updating[code._id] ? '...' : 'Cancel'}
                                </button>
                              )}
                            {code.status === 'cancelled' && (
                              <button
                                onClick={() =>
                                  handleDeleteClick('code', code._id, code.code)
                                }
                                disabled={updating[code._id]}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                              >
                                {updating[code._id] ? '...' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCodes.length === 0 && (
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  <p className="text-lg font-medium">No codes found</p>
                  <p className="text-sm">
                    No trading codes match your current filter
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
                    Refresh
                  </button>

                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="all">All Status</option>
                    <option value="valid">Valid</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Search by username or license..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 min-w-64"
                />
              </div>
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
                      {status === 'all' ? 'Total Customers' : status}
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
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        License
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Platform
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Account
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Plan
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Expire Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Source
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Activated
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Actions
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
                            .includes(customerSearch.toLowerCase())
                        return matchesFilter && matchesSearch
                      })
                      .map((customer) => (
                        <tr key={customer._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {customer.user}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-blue-600 font-bold">
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
                            {customer.plan === 999999 ? 'Lifetime' : customer.expireDate}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                customer.status === 'valid'
                                  ? 'bg-green-100 text-green-800'
                                  : customer.status === 'expired'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {customer.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                customer.adminGenerated || customer.createdBy === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {customer.adminGenerated || customer.createdBy === 'admin' ? 'ADMIN' : 'USER'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatThaiDateTime(customer.activatedAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {(customer.status === 'valid' || customer.status === 'expired') && (
                                <button
                                  onClick={() => showExtendModal(customer)}
                                  disabled={updating[customer._id]}
                                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                >
                                  {updating[customer._id] ? '...' : 'Extend'}
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
                                  {updating[customer._id] ? '...' : 'Suspend'}
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
                                    : 'Reactivate'}
                                </button>
                              )}
                              {customer.status === 'expired' && (
                                <button
                                  onClick={() =>
                                    updateCustomerStatus(customer._id, 'valid')
                                  }
                                  disabled={updating[customer._id]}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                >
                                  {updating[customer._id] ? '...' : 'Renew'}
                                </button>
                              )}
                              {customer.status === 'suspended' && (
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
                                  {updating[customer._id] ? '...' : 'Delete'}
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
                Generate License Key
              </h2>
              <p className="text-gray-600">
                Create a trading license directly for existing customers
              </p>
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
                    Username *
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={manualAccountForm.username}
                    onChange={(e) =>
                      handleFormChange('username', e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="accountNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Account Number *
                  </label>
                  <input
                    type="text"
                    id="accountNumber"
                    value={manualAccountForm.accountNumber}
                    onChange={(e) =>
                      handleFormChange('accountNumber', e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Enter account number"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="platform"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Trading Platform *
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
                    Plan Duration (Days) *
                  </label>
                  <select
                    id="plan"
                    value={manualAccountForm.plan}
                    onChange={(e) => handleFormChange('plan', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
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
                    Extend Days (Optional)
                  </label>
                  <input
                    type="number"
                    id="extendDays"
                    value={manualAccountForm.extendDays}
                    onChange={(e) =>
                      handleFormChange('extendDays', e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Additional days (e.g., 15)"
                    min="0"
                    max="9999"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Add extra days on top of the selected plan duration
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
                      License Generation Notice
                    </h3>
                    <div className="text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          A unique license key will be generated automatically
                        </li>
                        <li>
                          License will be <strong>immediately activated</strong>{' '}
                          with the selected plan
                        </li>
                        <li>
                          Expiry date will be calculated from today + plan
                          duration + extend days (if specified)
                        </li>
                        <li>
                          No user account creation required - license only
                        </li>
                        <li>
                          Customer can use the license key directly for trading
                          access
                        </li>
                        <li>
                          <strong>Extend Days:</strong> Optionally add extra days on top of the selected plan
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
                      Generating License...
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
                      Generate License
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

        {activeTab === 'extension-requests' && (
          <>
            {/* Extension Request Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <button
                    onClick={fetchExtensionRequests}
                    disabled={loadingExtensions}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center"
                  >
                    {loadingExtensions ? (
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

                  <select
                    value={extensionFilter}
                    onChange={(e) => setExtensionFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Extension Request Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {['all', 'pending', 'approved', 'rejected'].map((status) => {
                const count = status === 'all' 
                  ? extensionRequests.length 
                  : extensionRequests.filter(r => r.status === status).length
                return (
                  <div key={status} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {status === 'all' ? 'Total Requests' : status}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Extension Requests Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">User</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">License</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Current Expiry</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Requested Extension</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Requested</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {extensionRequests
                      .filter(request => extensionFilter === 'all' || request.status === extensionFilter)
                      .map((request) => (
                        <tr key={request._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {request.username}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-blue-600 font-bold">
                            {request.licenseCode}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {request.currentExpiry}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {request.requestedDays} days ({request.requestedPlan} plan)
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : request.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {request.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatThaiDateTime(request.requestedAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => approveExtension(request._id)}
                                    disabled={processingExtension[request._id]}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                  >
                                    {processingExtension[request._id] ? '...' : 'Approve'}
                                  </button>
                                  <button
                                    onClick={() => showRejectModal(request._id, request.licenseCode)}
                                    disabled={processingExtension[request._id]}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                  >
                                    {processingExtension[request._id] ? '...' : 'Reject'}
                                  </button>
                                </>
                              )}
                              {request.status === 'rejected' && request.rejectionReason && (
                                <span className="text-xs text-red-600" title={request.rejectionReason}>
                                  Reason: {request.rejectionReason.substring(0, 20)}...
                                </span>
                              )}
                              {request.status === 'approved' && (
                                <span className="text-xs text-green-600">
                                  Processed by {request.processedBy}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {extensionRequests.filter(request => extensionFilter === 'all' || request.status === extensionFilter).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  <p className="text-lg font-medium">No extension requests found</p>
                  <p className="text-sm">No extension requests match your current filter</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectionModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Extension Request</h3>
              <p className="text-gray-600 mb-4">
                License: <span className="font-mono font-bold text-red-600">{rejectionModal.licenseCode}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionModal.reason}
                  onChange={(e) => setRejectionModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Please provide a reason for rejection..."
                  rows="3"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setRejectionModal({ show: false, requestId: '', licenseCode: '', reason: '' })}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={rejectExtension}
                  disabled={processingExtension[rejectionModal.requestId] || !rejectionModal.reason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {processingExtension[rejectionModal.requestId] ? (
                    <>
                      <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Rejecting...
                    </>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 mb-4">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Extend License</h3>
              <p className="text-gray-600 mb-2">
                License: <span className="font-mono font-bold text-purple-600">{extendModal.licenseCode}</span>
              </p>
              <p className="text-sm text-gray-500">
                Current Expiry: {extendModal.currentExpiry}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="extensionPlan" className="block text-sm font-medium text-gray-700 mb-2">
                  Preset Extension Plans
                </label>
                <select
                  id="extensionPlan"
                  value={extendModal.selectedPlan}
                  onChange={(e) => setExtendModal(prev => ({ ...prev, selectedPlan: e.target.value, customDays: '' }))}
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
                <label htmlFor="customDays" className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Extension Days
                </label>
                <input
                  type="number"
                  id="customDays"
                  value={extendModal.customDays}
                  onChange={(e) => setExtendModal(prev => ({ ...prev, customDays: e.target.value, selectedPlan: '' }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter custom days (e.g., 45)"
                  min="1"
                  max="9999"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter any number of days for custom extension. This will clear the preset selection above.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-purple-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-purple-800 mb-1">Admin Extension Options</h3>
                    <div className="text-sm text-purple-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Preset Plans:</strong> Choose from predefined extension periods</li>
                        <li><strong>Custom Days:</strong> Enter any specific number of days (1-9999)</li>
                        <li>License will be extended immediately - no approval needed</li>
                        <li>New expiry date calculated from current expiry (or today if expired)</li>
                        <li>Automatically reactivates expired licenses to valid status</li>
                        <li>No payment required - admin override with audit trail</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setExtendModal({ show: false, customerId: '', licenseCode: '', currentExpiry: '', selectedPlan: '', customDays: '', extendingCode: false })}
                  disabled={extendModal.extendingCode}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdminExtendCode}
                  disabled={extendModal.extendingCode || (!extendModal.selectedPlan && !extendModal.customDays)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {extendModal.extendingCode ? (
                    <>
                      <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Extending...
                    </>
                  ) : (
                    (() => {
                      const days = extendModal.customDays && extendModal.customDays.trim() !== '' 
                        ? extendModal.customDays 
                        : extendModal.selectedPlan
                      const type = extendModal.customDays && extendModal.customDays.trim() !== '' 
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg border-l-4 border-green-600 animate-bounce">
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
                  Check the tables below for details
                </p>
              </div>
              <button
                onClick={() =>
                  setNewItemNotification({ show: false, message: '' })
                }
                className="ml-4 text-white hover:text-gray-200"
              >
                <svg
                  className="w-5 h-5"
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
            }`}
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
                onClick={() =>
                  setToast({ show: false, message: '', type: 'success' })
                }
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
