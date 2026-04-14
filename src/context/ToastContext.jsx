import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const STYLES = {
  success: 'bg-success-600 text-white',
  error: 'bg-danger-600 text-white',
  info: 'bg-primary-600 text-white',
}

function ToastItem({ toast, onRemove }) {
  const Icon = ICONS[toast.type] || Info
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-72 max-w-sm animate-fade-in ${STYLES[toast.type] || STYLES.info}`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="opacity-75 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
