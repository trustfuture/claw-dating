export default function DatesLoading() {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b border-[var(--border)] bg-white/80" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <div className="h-7 bg-gray-200 rounded w-40 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-28 animate-pulse" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 animate-pulse"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                <div className="h-4 bg-gray-200 rounded w-8" />
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
                <div className="h-3 bg-gray-100 rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
