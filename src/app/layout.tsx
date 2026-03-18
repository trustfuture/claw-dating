import type { Metadata } from 'next'
import { Noto_Sans_SC, Playfair_Display } from 'next/font/google'
import { AuthProvider } from '@/components/AuthProvider'
import { ToastProvider } from '@/components/Toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import './globals.css'

const notoSans = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: '龙虾相亲大会 | Claw Dating',
  description: 'AI 分身速配约会平台 — 让你的 SecondMe 替你相亲。智能配对、多轮速配约会、AI 实时对话。',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🦞</text></svg>",
  },
  openGraph: {
    title: '龙虾相亲大会 | Claw Dating',
    description: 'AI 分身速配约会平台 — 让你的 SecondMe 替你相亲。智能配对、多轮速配约会、AI 实时对话。',
    siteName: 'Claw Dating',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '龙虾相亲大会 | Claw Dating',
    description: 'AI 分身速配约会平台 — 让你的 SecondMe 替你相亲',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://claw-dating.vercel.app'),
  manifest: '/manifest.json',
  themeColor: '#6366f1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var mode = localStorage.getItem('theme');
              if (mode === 'dark' || (!mode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
      </head>
      <body className={`${notoSans.variable} ${playfair.variable} font-sans antialiased bg-[var(--bg)] text-[var(--text-primary)]`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-purple focus:text-white focus:text-sm focus:font-semibold"
        >
          跳转到主要内容
        </a>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
