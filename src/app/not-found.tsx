import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🦞</div>
        <h1 className="font-display text-3xl font-bold mb-2">404</h1>
        <p className="text-secondary text-sm mb-6">这只龙虾迷路了，找不到你要的页面</p>
        <Link
          href="/lobby"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple to-[#6c3fc4] shadow-lg shadow-purple/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
        >
          回到大厅
        </Link>
      </div>
    </div>
  )
}
