export type Locale = 'zh' | 'en'

const translations: Record<Locale, Record<string, string>> = {
  zh: {
    'nav.lobby': '大厅',
    'nav.dates': '约会',
    'nav.scoreboard': '排行榜',
    'nav.admin': '管理',
    'nav.logout': '退出',
    'lobby.title': '嘉宾大厅',
    'lobby.search': '搜索 Agent（名字、性格、兴趣...）',
    'lobby.createTitle': '创建你的约会人格',
    'lobby.noAgents': '还没有嘉宾入场',
    'lobby.startEvent': '开始相亲大会',
    'dates.title': '约会进行中',
    'dates.noDates': '还没有约会',
    'dates.goToLobby': '前往大厅',
    'dates.startAll': '开始全部约会',
    'dates.retryFailed': '重试失败约会',
    'dates.nextRound': '下一轮',
    'dates.endEvent': '结束活动',
    'scoreboard.title': '排行榜',
    'scoreboard.export': '导出 CSV',
    'scoreboard.search': '搜索嘉宾...',
    'common.loading': '加载中...',
    'common.retry': '重试',
    'common.cancel': '取消',
    'common.confirm': '确定',
    'common.delete': '删除',
    'common.networkError': '网络错误，请重试',
    'theme.toggle': '切换深色模式',
    'error.pageNotFound': '找不到页面',
    'error.pageError': '页面出错了',
    'error.refresh': '刷新页面',
  },
  en: {
    'nav.lobby': 'Lobby',
    'nav.dates': 'Dates',
    'nav.scoreboard': 'Scoreboard',
    'nav.admin': 'Admin',
    'nav.logout': 'Logout',
    'lobby.title': 'Guest Hall',
    'lobby.search': 'Search agents (name, personality, interests...)',
    'lobby.createTitle': 'Create Your Dating Persona',
    'lobby.noAgents': 'No guests yet',
    'lobby.startEvent': 'Start Dating Event',
    'dates.title': 'Dates in Progress',
    'dates.noDates': 'No dates yet',
    'dates.goToLobby': 'Go to Lobby',
    'dates.startAll': 'Start All Dates',
    'dates.retryFailed': 'Retry Failed',
    'dates.nextRound': 'Next Round',
    'dates.endEvent': 'End Event',
    'scoreboard.title': 'Scoreboard',
    'scoreboard.export': 'Export CSV',
    'scoreboard.search': 'Search guests...',
    'common.loading': 'Loading...',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.networkError': 'Network error, please retry',
    'theme.toggle': 'Toggle dark mode',
    'error.pageNotFound': 'Page not found',
    'error.pageError': 'Something went wrong',
    'error.refresh': 'Refresh page',
  },
}

export function t(key: string, locale: Locale = 'zh'): string {
  return translations[locale]?.[key] ?? translations.zh[key] ?? key
}

export function getDefaultLocale(): Locale {
  if (typeof window === 'undefined') return 'zh'
  const stored = localStorage.getItem('locale')
  if (stored === 'en' || stored === 'zh') return stored
  return navigator.language.startsWith('en') ? 'en' : 'zh'
}
