export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-3 border-purple/20 border-t-purple rounded-full mx-auto mb-3" />
        <p className="text-sm text-muted">加载中...</p>
      </div>
    </div>
  )
}
