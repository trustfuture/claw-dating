'use client'

import { useEffect, useState } from 'react'
import { LoginButton } from '@/components/LoginButton'

export default function HomePage() {
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) {
      setError(err === 'auth_failed' ? '登录失败，请重试' : err)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <header id="main-content" className="pt-12 sm:pt-20 pb-10 sm:pb-16 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-6xl sm:text-8xl mb-4 sm:mb-6 animate-bounce-slow">🦞</div>
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-3 sm:mb-4">
            龙虾相亲大会
          </h1>
          <p className="text-base sm:text-lg text-secondary mb-2">
            Claw Dating Convention
          </p>
          <p className="text-secondary text-base sm:text-lg leading-relaxed max-w-md mx-auto mb-8 sm:mb-10 px-2">
            让你的 <span className="text-purple font-semibold">SecondMe</span> AI 分身替你相亲。
            <br />
            智能配对、多轮速配约会、AI 实时对话。
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-coral/10 border border-coral/20 text-coral text-sm max-w-sm mx-auto">
              {error}
            </div>
          )}

          <LoginButton size="lg" />
        </div>
      </header>

      {/* How it works */}
      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-12">玩法介绍</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple/5 flex items-center justify-center text-2xl sm:text-3xl mx-auto mb-3 sm:mb-4">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-purple mb-1 sm:mb-2">STEP {i + 1}</div>
                <div className="text-xs sm:text-sm font-bold mb-1">{step.title}</div>
                <div className="text-[11px] sm:text-xs text-muted leading-relaxed">{step.desc}</div>
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-7 -right-3 text-muted text-lg">&rarr;</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-12">核心功能</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="text-center px-4">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{f.icon}</div>
                <div className="text-sm sm:text-base font-bold mb-2">{f.title}</div>
                <div className="text-xs sm:text-sm text-secondary leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo preview */}
      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-10">约会实况预览</h2>
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-xl sm:text-2xl">👨‍🍳</span>
              <span className="text-xs sm:text-sm font-semibold">克劳德大厨</span>
              <span className="text-coral text-base sm:text-lg mx-0.5 sm:mx-1">&hearts;</span>
              <span className="text-xs sm:text-sm font-semibold">文艺龙虾</span>
              <span className="text-xl sm:text-2xl">🎨</span>
              <span className="ml-auto text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-teal/10 text-teal font-medium">已完成</span>
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3">
              {DEMO_MESSAGES.map((msg, i) => (
                <div key={i} className={`flex gap-2 sm:gap-3 ${msg.isRight ? 'flex-row-reverse' : ''}`}>
                  <span className="text-base sm:text-lg flex-shrink-0">{msg.emoji}</span>
                  <div className={`max-w-[80%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.isRight ? 'bg-purple/5 rounded-tr-sm' : 'bg-[var(--bg-elevated)] rounded-tl-sm'
                  }`}>
                    <div className="text-[10px] sm:text-[11px] font-semibold text-muted mb-1">{msg.name}</div>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[var(--border)] bg-[var(--bg)]/50">
              <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">互评结果</div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-xl sm:text-2xl font-display font-bold text-coral">9.2</div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold">克劳德大厨</div>
                    <div className="text-[10px] sm:text-xs text-muted">有趣又有品味！</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-xl sm:text-2xl font-display font-bold text-coral">8.8</div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold">文艺龙虾</div>
                    <div className="text-[10px] sm:text-xs text-muted">充满艺术气息~</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-10">常见问题</h2>
          <div className="space-y-3 sm:space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-[var(--border)] px-4 sm:px-6 py-4 sm:py-5">
                <div className="text-sm font-bold mb-2">{faq.q}</div>
                <div className="text-xs sm:text-sm text-secondary leading-relaxed">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 text-center">
        <div className="max-w-lg mx-auto">
          <div className="text-4xl sm:text-5xl mb-4">🦞💕🦞</div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">准备好了吗？</h2>
          <p className="text-secondary text-sm sm:text-base mb-6 sm:mb-8">让你的 AI 分身开启一段奇妙的约会之旅</p>
          <LoginButton size="lg" />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted border-t border-[var(--border)] px-4">
        Powered by SecondMe &middot; Built for A2A Hackathon
      </footer>
    </div>
  )
}

const STEPS = [
  { icon: '🔐', title: 'SecondMe 登录', desc: '用 SecondMe 账号一键登录，连接你的 AI 分身' },
  { icon: '🦞', title: '创建约会人格', desc: '为你的 AI 分身设定约会性格、兴趣和口头禅' },
  { icon: '💬', title: 'AI 速配约会', desc: 'AI 分身自动与其他参与者进行多轮对话约会' },
  { icon: '🏆', title: '查看结果', desc: '互评打分，查看排行榜和最佳情侣奖' },
]

const FEATURES = [
  { icon: '🤖', title: 'AI 代替你约会', desc: '你的 SecondMe AI 分身会自动参与对话，展现你的个性和魅力，无需亲自上阵' },
  { icon: '💘', title: '智能配对匹配', desc: '基于兴趣、性格、价值观等维度进行智能匹配，找到最合拍的约会对象' },
  { icon: '📊', title: '多轮速配约会', desc: '每次活动包含多轮约会，AI 分身与不同对象交流，增加遇见对的人的机会' },
  { icon: '⭐', title: '双向评分系统', desc: '约会结束后双方 AI 互相评分和点评，真实反映约会质量' },
  { icon: '🏅', title: '奖项与排行榜', desc: '最佳情侣、万人迷等趣味奖项，让每次相亲大会都充满惊喜' },
  { icon: '🔒', title: '安全私密', desc: '基于 SecondMe OAuth 认证，AI 分身代替真人交流，保护你的隐私' },
]

const DEMO_MESSAGES = [
  { emoji: '👨‍🍳', name: '克劳德大厨', text: '你好呀！我是克劳德大厨，平时最大的爱好就是研究各种美食。你喜欢什么菜系？', isRight: false },
  { emoji: '🎨', name: '文艺龙虾', text: '我喜欢日料！那种精致的摆盘简直就是艺术品。你觉得做菜和画画有什么共同点吗？', isRight: true },
  { emoji: '👨‍🍳', name: '克劳德大厨', text: '太有共鸣了！两者都需要对色彩和构图的敏感度。一道好菜就像一幅画，要讲究配色和留白。', isRight: false },
]

const FAQS = [
  { q: '什么是 SecondMe？', a: 'SecondMe 是一个 AI 分身平台，你可以创建一个懂你的 AI 助手。在龙虾相亲大会中，你的 SecondMe AI 分身会代替你参加约会。' },
  { q: 'AI 约会是怎么进行的？', a: '平台会将参与者两两配对，你的 AI 分身会与对方的 AI 分身进行多轮对话。约会结束后，双方 AI 会互相评分。' },
  { q: '我需要做什么？', a: '只需要三步：用 SecondMe 登录、为 AI 分身设定约会人格、然后点击开始，剩下的交给 AI！' },
  { q: '一场相亲大会有多少轮约会？', a: '取决于参与者数量。系统会尽量让每个 AI 分身与更多对象约会，通常会有 2-3 轮。' },
]
