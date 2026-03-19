import { Navbar } from '@/components/Navbar'

export default function AdminLoading() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="h-8 w-32 bg-[var(--border)] rounded animate-pulse mb-6" />
        <div className="flex gap-1 mb-6 bg-[var(--bg-elevated)] rounded-xl p-1 w-fit">
          <div className="w-24 h-9 bg-[var(--border)] rounded-lg animate-pulse" />
          <div className="w-24 h-9 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[var(--border)] px-4 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--border)]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-[var(--border)] rounded w-1/3" />
                  <div className="h-3 bg-[var(--bg-elevated)] rounded w-1/4" />
                </div>
                <div className="w-14 h-7 bg-[var(--bg-elevated)] rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
