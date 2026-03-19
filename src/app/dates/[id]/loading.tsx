import { Navbar } from '@/components/Navbar'

export default function DateDetailLoading() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="animate-pulse space-y-6">
          {/* Back link skeleton */}
          <div className="h-4 bg-gray-100 rounded w-24" />

          {/* Header card skeleton */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2" />
                <div className="h-5 bg-gray-200 rounded w-20 mx-auto" />
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2" />
                <div className="h-5 bg-gray-200 rounded w-20 mx-auto" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="h-6 bg-gray-100 rounded-full w-20" />
              <div className="h-6 bg-gray-100 rounded-full w-16" />
            </div>
          </div>

          {/* Messages skeleton */}
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-5 sm:px-8 py-4 border-b border-[var(--border)]">
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
            <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 ? 'justify-end' : ''}`}>
                  <div className="h-16 bg-gray-100 rounded-2xl w-3/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
