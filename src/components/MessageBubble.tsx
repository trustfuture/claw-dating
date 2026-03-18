'use client'

interface MessageBubbleProps {
  senderName: string
  senderEmoji: string
  content: string
  isRight: boolean
  timestamp?: string
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 10) return '刚刚'
  if (diff < 60) return `${diff}秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}

export function MessageBubble({ senderName, senderEmoji, content, isRight, timestamp }: MessageBubbleProps) {
  return (
    <div className={`flex gap-2 sm:gap-3 ${isRight ? 'flex-row-reverse' : ''}`}>
      <span className="text-base sm:text-lg flex-shrink-0">
        {senderEmoji}
      </span>
      <div
        className={`
          max-w-[80%] sm:max-w-[70%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words
          ${isRight
            ? 'bg-purple/5 rounded-tr-sm'
            : 'bg-[var(--bg-elevated)] rounded-tl-sm'
          }
        `}
      >
        <div className="text-[10px] sm:text-[11px] font-semibold text-muted mb-1 flex items-center gap-1.5">
          <span>{senderName}</span>
          {timestamp && (
            <span className="font-normal text-muted/60">{relativeTime(timestamp)}</span>
          )}
        </div>
        {content}
      </div>
    </div>
  )
}
