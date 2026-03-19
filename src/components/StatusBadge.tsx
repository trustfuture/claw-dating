'use client'

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string; dotCls: string }> = {
    pending: { label: '等待中', cls: 'bg-[var(--bg-elevated)] text-muted', dotCls: 'bg-[var(--border)]' },
    in_progress: { label: '进行中', cls: 'bg-purple/10 text-purple', dotCls: 'bg-purple' },
    completed: { label: '已完成', cls: 'bg-teal/10 text-teal', dotCls: 'bg-teal' },
    cancelled: { label: '已取消', cls: 'bg-[var(--bg-elevated)] text-muted', dotCls: 'bg-[var(--border)]' },
    error: { label: '失败', cls: 'bg-coral/10 text-coral', dotCls: 'bg-coral' },
    failed: { label: '失败', cls: 'bg-coral/10 text-coral', dotCls: 'bg-coral' },
  }
  const c = config[status] || config.pending
  return (
    <span role="status" className={`text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium inline-flex items-center gap-1 ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dotCls}`} aria-label={c.label} />
      {c.label}
    </span>
  )
}
