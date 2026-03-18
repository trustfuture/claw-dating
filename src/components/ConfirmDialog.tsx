'use client'

import { useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  confirming: boolean
  icon: string
  titleId: string
  title: string
  description: string
  confirmLabel: string
  confirmingLabel: string
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  confirming,
  icon,
  titleId,
  title,
  description,
  confirmLabel,
  confirmingLabel,
  children,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(e) => e.key === 'Escape' && !confirming && onClose()}>
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !confirming && onClose()}
      />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 sm:p-8">
        <div className="text-center">
          <div className="text-4xl mb-3">{icon}</div>
          <h3 id={titleId} className="font-display text-lg font-bold mb-2">{title}</h3>
          <p className="text-secondary text-sm mb-6">
            {description}
          </p>
          {children}
          <div className="flex gap-3">
            <button
              ref={cancelRef}
              autoFocus
              onClick={onClose}
              disabled={confirming}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border)] text-secondary hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={confirming}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-coral to-[#c43a2f] shadow-md shadow-coral/20 disabled:opacity-50 transition-all"
            >
              {confirming ? confirmingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
