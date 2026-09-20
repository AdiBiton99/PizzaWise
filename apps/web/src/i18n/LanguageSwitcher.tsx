import { useLocale } from './LocaleProvider'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()

  return (
    <div className="language-switcher" role="group" aria-label={t('language.label')}>
      <button
        type="button"
        aria-pressed={locale === 'en'}
        onClick={() => setLocale('en')}
      >
        {t('language.en')}
      </button>
      <button
        type="button"
        aria-pressed={locale === 'he'}
        onClick={() => setLocale('he')}
      >
        {t('language.he')}
      </button>
    </div>
  )
}
