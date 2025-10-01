// Test file to verify generateLicenseKey module works
import {
  generateLicenseKey,
  validateLicenseKeyFormat
} from '@/lib/generateLicenseKey'

console.log('Testing generateLicenseKey module...')

const key = generateLicenseKey()
console.log('Generated key:', key)
console.log('Key is valid format:', validateLicenseKeyFormat(key))

export default function testLicenseKey() {
  return {
    key: generateLicenseKey(),
    isValid: validateLicenseKeyFormat(generateLicenseKey())
  }
}
