/**
 * EXAMPLE: Admin Panel with Encrypted Requests
 * 
 * This shows how to update the admin panel to use encrypted fetch
 * Replace the existing fetch calls with encryptedFetch
 */

import { useEncryptedFetch } from '@/hooks/useEncryptedFetch'
import { encryptedFetch } from '@/lib/clientEncryption'

// Example 1: Using the hook (Recommended for React components)
function AddCreditsFormWithHook() {
  const { fetchData, loading, error } = useEncryptedFetch()
  const [form, setForm] = useState({ username: '', credits: '', reason: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const result = await fetchData('/api/admin/add-credits', {
        method: 'POST',
        body: form // Automatically encrypted
      })
      
      console.log('Success:', result)
      // Reset form, show success message, etc.
    } catch (error) {
      console.error('Error:', error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Add Credits'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  )
}

// Example 2: Using encryptedFetch directly (for existing code)
async function addCreditsDirectly(formData) {
  try {
    const response = await encryptedFetch('/api/admin/add-credits', {
      method: 'POST',
      body: formData // Object will be automatically encrypted
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add credits')
    }

    const data = await response.json() // Automatically decrypted
    return data
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

// Example 3: Update existing admin panel code
// In your admin page.js, replace:

// OLD CODE:
/*
const response = await fetch('/api/admin/add-credits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: addCreditsForm.username,
    credits: credits,
    reason: addCreditsForm.reason
  })
})
*/

// NEW CODE (with encryption):
/*
import { encryptedFetch } from '@/lib/clientEncryption'

const response = await encryptedFetch('/api/admin/add-credits', {
  method: 'POST',
  body: {
    username: addCreditsForm.username,
    credits: credits,
    reason: addCreditsForm.reason
  }
})
*/

// Example 4: Batch convert multiple fetch calls
const convertedFunctions = {
  // Top-up approval
  approveTopUp: async (requestId) => {
    const response = await encryptedFetch('/api/admin/topup', {
      method: 'PUT',
      body: { id: requestId, action: 'approve' }
    })
    return response.json()
  },

  // Create customer account
  createAccount: async (accountData) => {
    const response = await encryptedFetch('/api/admin/create-account', {
      method: 'POST',
      body: accountData
    })
    return response.json()
  },

  // Extend license
  extendLicense: async (licenseData) => {
    const response = await encryptedFetch('/api/admin/extend-license', {
      method: 'POST',
      body: licenseData
    })
    return response.json()
  }
}

// Example 5: Error handling with encryption
async function robustEncryptedRequest(url, options) {
  try {
    const response = await encryptedFetch(url, options)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Request failed')
    }
    
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    if (error.message.includes('decrypt')) {
      console.error('Decryption failed - key mismatch?')
      return { success: false, error: 'Security error - please try again' }
    } else if (error.message.includes('encrypt')) {
      console.error('Encryption failed - crypto not available?')
      return { success: false, error: 'Security not available - use HTTPS' }
    } else {
      console.error('Request failed:', error)
      return { success: false, error: error.message }
    }
  }
}

// Example 6: Progressive enhancement (fallback to plain fetch)
async function smartFetch(url, options) {
  const { isWebCryptoAvailable } = await import('@/lib/clientEncryption')
  
  if (isWebCryptoAvailable()) {
    // Use encrypted fetch if available
    const { encryptedFetch } = await import('@/lib/clientEncryption')
    return encryptedFetch(url, options)
  } else {
    // Fallback to plain fetch
    console.warn('Web Crypto not available, using plain fetch')
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options.body)
    })
  }
}

export { 
  AddCreditsFormWithHook,
  addCreditsDirectly,
  convertedFunctions,
  robustEncryptedRequest,
  smartFetch
}
