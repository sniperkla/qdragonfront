// Production debugging logger
export const debugLogger = {
  log: (message, data = {}) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      message,
      data,
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    }
    
    console.log('🔍 DEBUG:', logEntry)
    
    // In production, you might want to send this to an external logging service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Store in localStorage for debugging
        const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]')
        logs.push(logEntry)
        // Keep only last 50 logs
        if (logs.length > 50) logs.shift()
        localStorage.setItem('debug_logs', JSON.stringify(logs))
      } catch (error) {
        console.warn('Failed to store debug log:', error)
      }
    }
  },
  
  error: (message, error = {}) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level: 'ERROR',
      message,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    }
    
    console.error('❌ ERROR:', logEntry)
    
    if (process.env.NODE_ENV === 'production') {
      try {
        const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]')
        logs.push(logEntry)
        if (logs.length > 50) logs.shift()
        localStorage.setItem('debug_logs', JSON.stringify(logs))
      } catch (err) {
        console.warn('Failed to store error log:', err)
      }
    }
  },
  
  getLogs: () => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem('debug_logs') || '[]')
    } catch (error) {
      console.warn('Failed to retrieve debug logs:', error)
      return []
    }
  },
  
  clearLogs: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('debug_logs')
    }
  }
}