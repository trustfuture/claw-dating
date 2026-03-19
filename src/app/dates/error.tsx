'use client'

import Link from 'next/link'

export default function DatesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">💔</div>
        <h2 className="font-display text-xl font-bold mb-2">约会出了点问题</h2>
        <p className="text-secondary text-sm mb-6">
          {error.message || '加载约会页面时遇到了错误，请重试'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple to-[#6c3fc4] shadow-md hover:shadow-lg transition-all duration-200"
          >
            重试
          </button>
          <Link
            href="/lobby"
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-secondary border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            返回大厅
          </Link>
        </div>
      </div>
    </div>
  )
}
