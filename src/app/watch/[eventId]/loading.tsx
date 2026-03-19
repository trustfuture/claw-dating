import { Navbar } from '@/components/Navbar'

export default function WatchLoading() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="h-8 w-48 bg-[var(--border)] rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-[var(--bg-elevated)] rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden animate-pulse">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--border)] rounded-full" />
                <div className="h-4 bg-[var(--border)] rounded w-20" />
                <div className="w-4 h-4 bg-[var(--bg-elevated)] rounded" />
                <div className="h-4 bg-[var(--border)] rounded w-20" />
                <div className="w-8 h-8 bg-[var(--border)] rounded-full" />
              </div>
              <div className="px-6 py-8">
                <div className="h-4 bg-[var(--bg-elevated)] rounded w-2/3 mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
