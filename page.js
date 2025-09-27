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
  const router = useRouter()

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
//   useEffect(() => {
//     let interval

//     if (isAuthenticated && autoRefresh) {
//       interval = setInterval(async () => {
//         try {
//           // Silently fetch updated data
//           const [codesResponse, customersResponse] = await Promise.all([
//             fetch('/api/admin/codes', { credentials: 'include' }),
//             fetch('/api/admin/customers', { credentials: 'include' })
//           ])

//           if (codesResponse.ok && customersResponse.ok) {
//             const codesData = await codesResponse.json()
//             const customersData = await customersResponse.json()

//             // Check for new codes
//             if (
//               codesData.codes &&
//               codesData.codes.length > lastCodeCount &&
//               lastCodeCount > 0
//             ) {
//               const newCodesCount = codesData.codes.length - lastCodeCount
//               showNotification(
//                 `🆕 ${newCodesCount} new trading code${
//                   newCodesCount > 1 ? 's' : ''
//                 } generated!`
//               )
//               // Play notification sound
//               playNotificationSound()
//             }

//             // Check for new customers
//             if (
//               customersData.accounts &&
//               customersData.accounts.length > lastCustomerCount &&
//               lastCustomerCount > 0
//             ) {
//               const newCustomersCount =
//                 customersData.accounts.length - lastCustomerCount
//               showNotification(
//                 `🎉 ${newCustomersCount} new customer account${
//                   newCustomersCount > 1 ? 's' : ''
//                 } activated!`
//               )
//               // Play notification sound
//               playNotificationSound()
//             }

//             // Update state
//             setCodes(codesData.codes || [])
//             setCustomers(customersData.accounts || [])
//             setLastCodeCount(codesData.codes?.length || 0)
//             setLastCustomerCount(customersData.accounts?.length || 0)
//           }
//         } catch (error) {
//           console.error('Auto-refresh error:', error)
//         }
//       }, 10000) // Check every 10 seconds (reduced server load)
//     }

//     return () => {
//       if (interval) clearInterval(interval)
//     }
//   }, [isAuthenticated, autoRefresh, lastCodeCount, lastCustomerCount])

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
      } else {
        alert('Invalid admin key')
      }
    } catch (error) {
      console.error('Admin login error:', error)
      alert('Login failed')
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

        alert(`Code status updated to ${newStatus}`)
      } else {
        alert('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Update failed')
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
        alert(
          `Customer account ${
            newStatus === 'suspended' ? 'suspended' : 'reactivated'
          }`
        )
      } else {
        alert('Failed to update customer status')
      }
    } catch (error) {
      console.error('Error updating customer status:', error)
      alert('Update failed')
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
      alert('Please type "DELETE" to confirm')
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
          alert('Trading code deleted successfully')
        } else {
          setCustomers((prev) => prev.filter((customer) => customer._id !== id))
          alert('Customer account deleted successfully')
        }
        setDeleteConfirmation({ show: false, type: '', id: '', name: '' })
        setConfirmText('')
      } else {
        alert('Failed to delete')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Delete failed')
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }))
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, type: '', id: '', name: '' })
    setConfirmText('')
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoRefresh ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoRefresh ? 'translate-x-6' : 'translate-x-1'
                    }`}
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
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              code.status
                            )}`}
                          >
                            {code.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(code.createdAt).toLocaleDateString()}
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
                            {customer.expireDate}
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
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(
                              customer.activatedAt
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
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
      </div>

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
    </div>
  )
}
