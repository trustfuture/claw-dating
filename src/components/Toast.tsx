'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
  duration: number
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [exiting, setExiting] = useState<Set<number>>(new Set())

  const removeToast = useCallback((id: number) => {
    setExiting((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      setExiting((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 300)
  }, [])

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 3000) => {
      const id = ++toastId
      setToasts((prev) => [...prev, { id, type, message, duration }])
    },
    []
  )

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            isExiting={exiting.has(toast.id)}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({
  toast,
  isExiting,
  onDismiss,
}: {
  toast: Toast
  isExiting: boolean
  onDismiss: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration)
    return () => clearTimeout(timer)
  }, [toast.duration, onDismiss])

  const typeStyles: Record<ToastType, string> = {
    success: 'bg-teal/10 border-teal/30 text-teal',
    error: 'bg-coral/10 border-coral/30 text-coral',
    info: 'bg-purple/10 border-purple/30 text-purple',
  }

  const icons: Record<ToastType, string> = {
    success: '\u2713',
    error: '\u2717',
    info: '\u24D8',
  }

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border
        shadow-lg backdrop-blur-sm min-w-[280px] max-w-[400px]
        transition-all duration-300 ease-out
        ${typeStyles[toast.type]}
        ${isExiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0 animate-slide-in'}
      `}
    >
      <span className="text-base font-bold flex-shrink-0">{icons[toast.type]}</span>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={onDismiss}
        aria-label="关闭通知"
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-xs"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
