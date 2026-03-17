'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ background: '#faf9f7', color: '#1a1a1a', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e5e7eb', maxWidth: '28rem', width: '100%', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🦞</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>出了点问题</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {error.message || '页面加载时遇到了错误'}
            </p>
            <button
              onClick={reset}
              style={{ padding: '0.625rem 1.5rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#fff', background: 'linear-gradient(to right, #6366f1, #6c3fc4)', border: 'none', cursor: 'pointer' }}
            >
              重试
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
