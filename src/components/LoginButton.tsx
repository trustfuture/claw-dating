'use client'

interface LoginButtonProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoginButton({ size = 'md', className = '' }: LoginButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-10 py-4 text-base',
  }

  return (
    <a
      href="/api/auth/login"
      className={`
        inline-flex items-center gap-3 rounded-2xl font-semibold
        bg-gradient-to-r from-purple to-[#8b5cf6] text-white
        shadow-lg shadow-purple/25 hover:shadow-xl hover:shadow-purple/30
        hover:-translate-y-0.5 active:translate-y-0
        transition-all duration-200
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold">
        S
      </span>
      <span>使用 SecondMe 登录</span>
    </a>
  )
}
