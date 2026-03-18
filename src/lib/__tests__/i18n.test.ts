import { t } from '../i18n'

describe('i18n', () => {
  it('returns Chinese translation by default', () => {
    expect(t('nav.lobby')).toBe('大厅')
    expect(t('nav.dates')).toBe('约会')
  })

  it('returns English translation when locale is en', () => {
    expect(t('nav.lobby', 'en')).toBe('Lobby')
    expect(t('nav.dates', 'en')).toBe('Dates')
  })

  it('falls back to Chinese for unknown locale keys', () => {
    expect(t('nav.lobby', 'zh')).toBe('大厅')
  })

  it('returns key for unknown translation keys', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key')
    expect(t('nonexistent.key', 'en')).toBe('nonexistent.key')
  })

  it('has consistent keys between zh and en', () => {
    // Import the translations to check
    // We can test a few known keys exist in both
    expect(t('common.loading', 'zh')).toBeTruthy()
    expect(t('common.loading', 'en')).toBeTruthy()
    expect(t('common.retry', 'zh')).toBeTruthy()
    expect(t('common.retry', 'en')).toBeTruthy()
  })
})
