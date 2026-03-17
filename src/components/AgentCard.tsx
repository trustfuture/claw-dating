'use client'

interface AgentCardProps {
  agent: {
    id: string
    name: string
    avatarEmoji: string
    personalityType: string
    interests: string[]
    catchphrase: string
    status: string
    user: { name: string; avatarUrl: string }
  }
  isMe?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function AgentCard({ agent, isMe, onEdit, onDelete }: AgentCardProps) {
  return (
    <div
      className={`
        relative bg-white rounded-2xl border p-4 sm:p-5 transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5
        ${isMe ? 'border-purple/30 ring-1 ring-purple/10' : 'border-[var(--border)]'}
      `}
    >
      {isMe && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-purple text-white text-[10px] font-bold">
          我
        </span>
      )}

      <div className="flex items-start gap-3 sm:gap-4 mb-3">
        <div className="text-3xl sm:text-4xl leading-none">{agent.avatarEmoji}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base truncate">{agent.name}</h3>
          {agent.personalityType && (
            <p className="text-xs text-purple font-medium mt-0.5">
              {agent.personalityType}
            </p>
          )}
        </div>
        <div
          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
            agent.status === 'online' ? 'bg-teal' : 'bg-gray-300'
          }`}
        />
      </div>

      {agent.catchphrase && (
        <p className="text-[11px] sm:text-sm text-secondary italic mb-3 line-clamp-2">
          &ldquo;{agent.catchphrase}&rdquo;
        </p>
      )}

      {agent.interests.length > 0 && (
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {agent.interests.slice(0, 5).map((interest, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-xs font-medium text-secondary"
            >
              {interest}
            </span>
          ))}
          {agent.interests.length > 5 && (
            <span className="px-2 py-0.5 text-xs text-muted">
              +{agent.interests.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Edit / Delete buttons for own agent */}
      {isMe && (onEdit || onDelete) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-purple border border-purple/20 hover:bg-purple/5 transition-colors"
            >
              编辑
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-coral border border-coral/20 hover:bg-coral/5 transition-colors"
            >
              删除
            </button>
          )}
        </div>
      )}
    </div>
  )
}
