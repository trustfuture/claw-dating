'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const EMOJI_OPTIONS = ['🦞', '🐙', '🦊', '🐱', '🐶', '🦄', '🐼', '🦋', '🌸', '🔮', '🎭', '🎪']
const PERSONALITY_TYPES: { label: string; desc: string }[] = [
  { label: '浪漫美食家', desc: '用美食表达爱意' },
  { label: '冒险旅行者', desc: '向往远方和未知' },
  { label: '文艺书虫', desc: '沉浸在文字世界' },
  { label: '科技极客', desc: '热爱技术和创新' },
  { label: '运动达人', desc: '活力满满的生活' },
  { label: '音乐灵魂', desc: '用旋律感受世界' },
  { label: '哲学思考者', desc: '追问生命的意义' },
  { label: '幽默大师', desc: '让快乐感染他人' },
]

const INTEREST_SUGGESTIONS = ['美食', '旅行', '音乐', '电影', '健身', '读书', '游戏', '摄影', '烹饪', '绘画']

const DRAFT_KEY = 'claw-agent-draft'

interface AgentDefaults {
  id: string
  name: string
  avatarEmoji: string
  personalityType: string
  interests: string[]
  catchphrase: string
}

interface CreateAgentFormProps {
  onCreated: () => void
  editAgent?: AgentDefaults
  onCancel?: () => void
}

interface FormErrors {
  name?: string
  personalityType?: string
  avatarEmoji?: string
}

interface TouchedFields {
  name: boolean
  personalityType: boolean
  avatarEmoji: boolean
}

export function CreateAgentForm({ onCreated, editAgent, onCancel }: CreateAgentFormProps) {
  const isEditMode = Boolean(editAgent)

  const [name, setName] = useState(editAgent?.name ?? '')
  const [avatarEmoji, setAvatarEmoji] = useState(editAgent?.avatarEmoji ?? '')
  const [personalityType, setPersonalityType] = useState(editAgent?.personalityType ?? '')
  const [interests, setInterests] = useState<string[]>(editAgent?.interests ?? [])
  const [interestInput, setInterestInput] = useState('')
  const [catchphrase, setCatchphrase] = useState(editAgent?.catchphrase ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [touched, setTouched] = useState<TouchedFields>({
    name: isEditMode,
    personalityType: isEditMode,
    avatarEmoji: isEditMode,
  })

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasMounted = useRef(false)

  // Restore draft on mount (only in create mode)
  useEffect(() => {
    if (isEditMode) {
      hasMounted.current = true
      return
    }
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) {
        const parsed = JSON.parse(draft)
        if (parsed.name) setName(parsed.name)
        if (parsed.avatarEmoji) setAvatarEmoji(parsed.avatarEmoji)
        if (parsed.personalityType) setPersonalityType(parsed.personalityType)
        if (parsed.catchphrase) setCatchphrase(parsed.catchphrase)
        if (Array.isArray(parsed.interests)) setInterests(parsed.interests)
      }
    } catch {
      // ignore
    }
    hasMounted.current = true
  }, [isEditMode])

  // Auto-save draft every 2s (only in create mode)
  useEffect(() => {
    if (!hasMounted.current || isEditMode) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, avatarEmoji, personalityType, catchphrase, interests }))
      } catch {
        // ignore
      }
    }, 2000)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [name, avatarEmoji, personalityType, catchphrase, interests, isEditMode])

  // Cleanup success timer
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const validate = useCallback((): FormErrors => {
    const errors: FormErrors = {}
    if (!name.trim()) {
      errors.name = '请输入昵称'
    } else if (name.trim().length < 2) {
      errors.name = '昵称至少2个字符'
    } else if (name.trim().length > 20) {
      errors.name = '昵称最多20个字符'
    }
    if (!personalityType) {
      errors.personalityType = '请选择人格类型'
    }
    if (!avatarEmoji) {
      errors.avatarEmoji = '请选择头像'
    }
    return errors
  }, [name, personalityType, avatarEmoji])

  const errors = validate()
  const hasErrors = Object.keys(errors).length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all as touched on submit
    setTouched({ name: true, personalityType: true, avatarEmoji: true })

    if (hasErrors) return

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const payload = {
        name: name.trim(),
        avatarEmoji,
        personalityType,
        catchphrase: catchphrase.trim(),
        interests,
      }

      const url = isEditMode ? `/api/agents/${editAgent!.id}` : '/api/agents'
      const method = isEditMode ? 'PUT' : 'POST'

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json()

      if (resp.ok) {
        if (!isEditMode) {
          // Clear draft
          try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
        }
        setSuccess(true)
        successTimerRef.current = setTimeout(() => setSuccess(false), 3000)
        onCreated()
      } else {
        setError(data.error || (isEditMode ? '更新失败' : '创建失败'))
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误'
      setError(`网络错误: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Success banner */}
      {success && (
        <div className="px-4 py-3 rounded-xl bg-teal/10 border border-teal/20 text-teal text-sm font-medium animate-slide-in">
          {isEditMode ? '更新成功！' : '创建成功！正在进入大厅...'}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-coral/10 border border-coral/20 text-coral text-sm">
          {error}
        </div>
      )}

      {/* Emoji Selector */}
      <div>
        <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
          选择头像
        </label>
        <div className="flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { setAvatarEmoji(emoji); setTouched(t => ({ ...t, avatarEmoji: true })) }}
              className={`
                w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all
                ${avatarEmoji === emoji
                  ? 'bg-purple/10 ring-2 ring-purple scale-110'
                  : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80'
                }
              `}
            >
              {emoji}
            </button>
          ))}
        </div>
        {touched.avatarEmoji && errors.avatarEmoji && (
          <p className="text-xs text-coral mt-1.5">{errors.avatarEmoji}</p>
        )}
      </div>

      {/* Name */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
            约会昵称
          </label>
          <span className="text-[10px] text-muted">{name.length}/20</span>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, name: true }))}
          placeholder="给你的 AI 分身起个名字"
          maxLength={20}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple/50 transition-all"
        />
        {touched.name && errors.name && (
          <p className="text-xs text-coral mt-1.5">{errors.name}</p>
        )}
      </div>

      {/* Personality Type */}
      <div>
        <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
          人格类型
        </label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {PERSONALITY_TYPES.map(({ label, desc }) => (
            <button
              key={label}
              type="button"
              onClick={() => { setPersonalityType(label); setTouched(t => ({ ...t, personalityType: true })) }}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all group relative
                ${personalityType === label
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'bg-[var(--bg-elevated)] text-secondary border border-transparent hover:border-[var(--border)]'
                }
              `}
              title={desc}
            >
              {label}
            </button>
          ))}
        </div>
        {touched.personalityType && errors.personalityType && (
          <p className="text-xs text-coral mt-1.5">{errors.personalityType}</p>
        )}
      </div>

      {/* Interests */}
      <div>
        <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
          兴趣标签
        </label>
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {interests.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal/10 text-teal border border-teal/20"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setInterests((prev) => prev.filter((t) => t !== tag))}
                  className="hover:text-coral transition-colors"
                >
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={interestInput}
            onChange={(e) => setInterestInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ',') && interestInput.trim()) {
                e.preventDefault()
                const tag = interestInput.trim().replace(/,/g, '')
                if (tag && !interests.includes(tag) && interests.length < 10) {
                  setInterests((prev) => [...prev, tag])
                }
                setInterestInput('')
              }
            }}
            placeholder="输入兴趣后按回车添加"
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple/50 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {INTEREST_SUGGESTIONS.filter((s) => !interests.includes(s)).slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (interests.length < 10) {
                  setInterests((prev) => [...prev, s])
                }
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--bg-elevated)] text-muted hover:text-secondary hover:border-[var(--border)] border border-transparent transition-all"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      {/* Catchphrase */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
            口头禅
          </label>
          <span className="text-[10px] text-muted">{catchphrase.length}/50</span>
        </div>
        <input
          type="text"
          value={catchphrase}
          onChange={(e) => setCatchphrase(e.target.value)}
          placeholder="一句话介绍你的约会风格"
          maxLength={50}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple/50 transition-all"
        />
      </div>

      <div className={`flex gap-3 ${onCancel ? '' : ''}`}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="
              flex-1 py-3.5 rounded-xl font-semibold text-sm
              border border-[var(--border)] text-secondary
              hover:bg-[var(--bg-elevated)] transition-all duration-200
            "
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`
            ${onCancel ? 'flex-1' : 'w-full'} py-3.5 rounded-xl font-semibold text-white text-sm
            bg-gradient-to-r from-purple to-[#8b5cf6]
            shadow-lg shadow-purple/20 hover:shadow-xl hover:shadow-purple/25
            disabled:opacity-50 transition-all duration-200
            flex items-center justify-center gap-2
          `}
        >
          {loading && (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {loading
            ? (isEditMode ? '保存中...' : '创建中...')
            : (isEditMode ? '保存修改' : '入场参加相亲大会')
          }
        </button>
      </div>
    </form>
  )
}
