import { useState, useCallback } from 'react'
import { encryptedFetch, isWebCryptoAvailable } from '@/lib/clientEncryption'

/**
 * Custom hook for making encrypted API requests
 * 
 * @example
 * const { data, loading, error, fetchData } = useEncryptedFetch()
 * 
 * const handleSubmit = async () => {
 *   await fetchData('/api/admin/add-credits', {
 *     method: 'POST',
 *     body: { username: 'john', credits: 100 }
 *   })
 * }
 */
export function useEncryptedFetch() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async (url, options = {}) => {
    setLoading(true)
    setError(null)

    try {
      // Check if Web Crypto is available
      if (!isWebCryptoAvailable()) {
        throw new Error('Web Crypto API not available. Please use HTTPS.')
      }

      const response = await encryptedFetch(url, options)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Request failed')
      }

      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    data,
    loading,
    error,
    fetchData,
    reset
  }
}

/**
 * Hook for checking if encryption is available
 */
export function useEncryptionSupport() {
  const [isSupported, setIsSupported] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useState(() => {
    try {
      const supported = isWebCryptoAvailable()
      setIsSupported(supported)
    } catch (error) {
      setIsSupported(false)
    } finally {
      setIsChecking(false)
    }
  }, [])

  return { isSupported, isChecking }
}

/**
 * Higher-order component to wrap components that require encryption
 */
export function withEncryptionSupport(Component) {
  return function EncryptedComponent(props) {
    const { isSupported, isChecking } = useEncryptionSupport()

    if (isChecking) {
      return <div>Checking security support...</div>
    }

    if (!isSupported) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium mb-2">Security Not Supported</h3>
          <p className="text-red-600 text-sm">
            Your browser or connection does not support required security features.
            Please use HTTPS and a modern browser.
          </p>
        </div>
      )
    }

    return <Component {...props} />
  }
}
