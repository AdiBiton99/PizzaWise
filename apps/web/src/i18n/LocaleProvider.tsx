import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import {
  applyDocumentLocale,
  createTranslate,
  DEFAULT_LOCALE,
  localeDirection,
  readStoredLocale,
  writeStoredLocale,
  type AppDirection,
  type AppLocale,
  type Translate
} from './locale'
import type { MessageKey } from './messages'

export interface LocaleContextValue {
  readonly locale: AppLocale
  readonly dir: AppDirection
  readonly setLocale: (locale: AppLocale) => void
  readonly t: Translate
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  dir: 'ltr',
  setLocale: () => {},
  t: createTranslate(DEFAULT_LOCALE)
})

export function LocaleProvider({ children }: { readonly children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(readStoredLocale)

  useEffect(() => {
    applyDocumentLocale(locale)
    writeStoredLocale(locale)
  }, [locale])

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next)
  }, [])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: localeDirection(locale),
      setLocale,
      t: createTranslate(locale)
    }),
    [locale, setLocale]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale (): LocaleContextValue {
  return useContext(LocaleContext)
}

export function useTranslate (): Translate {
  return useLocale().t
}

export function optionLabel (
  t: Translate,
  tag: string
): string {
  return t(`option.${tag}` as MessageKey)
}
