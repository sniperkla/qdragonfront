'use client'
import { useState, useEffect } from 'react'
import { debugLogger } from '@/lib/debugLogger'

export default function DebugPanel() {
  const [logs, setLogs] = useState([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isVisible) {
      const currentLogs = debugLogger.getLogs()
      setLogs(currentLogs)
    }
  }, [isVisible])

  const refreshLogs = () => {
    const currentLogs = debugLogger.getLogs()
    setLogs(currentLogs)
  }

  const clearLogs = () => {
    debugLogger.clearLogs()
    setLogs([])
  }

  // Only show in development or when accessed via special URL parameter
  if (process.env.NODE_ENV === 'production' && !window.location.search.includes('debug=true')) {
    return null
  }

  return (
    <>
      {/* Debug Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-mono hover:bg-red-600 transition-colors"
        title="Toggle Debug Panel"
      >
        {isVisible ? '❌' : '🔍'} DEBUG
      </button>

      {/* Debug Panel */}
      {isVisible && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] w-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Debug Logs</h2>
              <div className="flex gap-2">
                <button
                  onClick={refreshLogs}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={clearLogs}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                >
                  🗑️ Clear
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Logs Content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center">No logs available</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded border-l-4 ${
                        log.level === 'ERROR'
                          ? 'border-red-500 bg-red-50'
                          : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold ${
                          log.level === 'ERROR' ? 'text-red-700' : 'text-blue-700'
                        }`}>
                          {log.level === 'ERROR' ? '❌' : '🔍'} {log.message}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {log.data && Object.keys(log.data).length > 0 && (
                        <div className="text-xs text-gray-600 bg-white p-2 rounded mt-1">
                          <pre>{JSON.stringify(log.data, null, 2)}</pre>
                        </div>
                      )}
                      {log.error && (
                        <div className="text-xs text-red-600 bg-red-100 p-2 rounded mt-1">
                          <div><strong>Error:</strong> {log.error.message}</div>
                          {log.error.stack && (
                            <div><strong>Stack:</strong> <pre>{log.error.stack}</pre></div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}