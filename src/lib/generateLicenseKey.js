/**
 * Generate unique license keys for user accounts
 */

/**
 * Generate a random license key
 * Format: XXXX-XXXX-XXXX-XXXX (16 characters, 4 groups of 4)
 */
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  const generateGroup = () => {
    let group = ''
    for (let i = 0; i < 4; i++) {
      group += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return group
  }

  return `${generateGroup()}-${generateGroup()}-${generateGroup()}-${generateGroup()}`
}

/**
 * Generate a license key with timestamp prefix for uniqueness
 * Format: TXXXXXXX-XXXX-XXXX-XXXX (T + 7 chars timestamp + 3 groups of 4)
 */
function generateTimestampedLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const timestamp = Date.now().toString(36).toUpperCase().slice(-7) // Last 7 chars of timestamp in base36

  const generateGroup = () => {
    let group = ''
    for (let i = 0; i < 4; i++) {
      group += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return group
  }

  return `T${timestamp}-${generateGroup()}-${generateGroup()}-${generateGroup()}`
}

/**
 * Validate license key format
 */
function validateLicenseKeyFormat(key) {
  if (!key || typeof key !== 'string') return false

  // Standard format: XXXX-XXXX-XXXX-XXXX
  const standardPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

  // Timestamped format: TXXXXXXX-XXXX-XXXX-XXXX
  const timestampedPattern =
    /^T[A-Z0-9]{7}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

  return standardPattern.test(key) || timestampedPattern.test(key)
}

// ES module exports
export {
  generateLicenseKey,
  generateTimestampedLicenseKey,
  validateLicenseKeyFormat
}

export default generateLicenseKey
