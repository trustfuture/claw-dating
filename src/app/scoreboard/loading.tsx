export default function ScoreboardLoading() {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b border-[var(--border)] bg-white/80" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2 animate-pulse">🏆</div>
          <div className="h-7 bg-gray-200 rounded w-40 mx-auto mb-2 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-28 mx-auto animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-5 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="w-10 h-10 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
