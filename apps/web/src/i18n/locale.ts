import { en, he, type MessageKey } from './messages'

export const LOCALE_STORAGE_KEY = 'pizzawise.locale'
export const DEFAULT_LOCALE = 'en'

export type AppLocale = 'en' | 'he'
export type AppDirection = 'ltr' | 'rtl'
export type MessageVars = Record<string, string | number>

const dictionaries: Record<AppLocale, Record<MessageKey, string>> = {
  en,
  he
}

export type Translate = (
  key: MessageKey,
  vars?: MessageVars
) => string

export function isAppLocale (value: string | null): value is AppLocale {
  return value === 'en' || value === 'he'
}

export function localeDirection (locale: AppLocale): AppDirection {
  return locale === 'he' ? 'rtl' : 'ltr'
}

export function interpolate (
  template: string,
  vars: MessageVars | undefined
): string {
  if (vars === undefined) {
    return template
  }

  return template.replaceAll(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name]
    return value === undefined ? match : String(value)
  })
}

export function translate (
  locale: AppLocale,
  key: MessageKey,
  vars?: MessageVars
): string {
  return interpolate(dictionaries[locale][key], vars)
}

export function createTranslate (locale: AppLocale): Translate {
  return (key, vars) => translate(locale, key, vars)
}

export const translateEn: Translate = createTranslate('en')

export function readStoredLocale (
  storage: Pick<Storage, 'getItem'> | null = defaultStorage()
): AppLocale {
  if (storage === null) {
    return DEFAULT_LOCALE
  }

  try {
    const stored = storage.getItem(LOCALE_STORAGE_KEY)
    return isAppLocale(stored) ? stored : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

export function writeStoredLocale (
  locale: AppLocale,
  storage: Pick<Storage, 'setItem'> | null = defaultStorage()
): void {
  if (storage === null) {
    return
  }

  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

export function applyDocumentLocale (
  locale: AppLocale,
  root: Pick<HTMLElement, 'lang' | 'dir'> = document.documentElement
): void {
  root.lang = locale === 'he' ? 'he' : 'en'
  root.dir = localeDirection(locale)
}

function defaultStorage (): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}
