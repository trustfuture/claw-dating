import { Navbar } from '@/components/Navbar'

export default function ScoreboardLoading() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center mb-8">
          <div className="text-4xl sm:text-5xl mb-3">🏆</div>
          <div className="h-8 w-32 bg-[var(--border)] rounded mx-auto animate-pulse mb-2" />
          <div className="h-4 w-48 bg-[var(--bg-elevated)] rounded mx-auto animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[var(--border)] px-5 py-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-8 h-6 bg-[var(--border)] rounded" />
                <div className="w-8 h-8 bg-[var(--border)] rounded-full" />
                <div className="h-4 bg-[var(--border)] rounded flex-1" />
                <div className="w-14 h-6 bg-[var(--border)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
