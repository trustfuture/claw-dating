export default function LobbyLoading() {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b border-[var(--border)] bg-white/80" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <div className="h-7 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-24 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-5 animate-pulse"
            >
              <div className="flex items-start gap-3 sm:gap-4 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-full mb-3" />
              <div className="flex gap-1.5">
                <div className="h-5 bg-gray-100 rounded-full w-12" />
                <div className="h-5 bg-gray-100 rounded-full w-16" />
                <div className="h-5 bg-gray-100 rounded-full w-10" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
