import React, { createContext, useContext, useState, useMemo, useCallback } from 'react'
import type { Locale, TranslationDictionary } from './types'
import { pt } from './locales/pt'
import { en } from './locales/en'

const dictionaries: Record<Locale, TranslationDictionary> = { pt, en }

export interface I18nContextType {
  locale: Locale
  setLocale: (loc: Locale) => void
  toggleLocale: () => void
  t: (keyPath: string, vars?: Record<string, string | number>) => string
  dict: TranslationDictionary
}

const STORAGE_KEY = 'masterdex_locale'

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'pt'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'pt' || saved === 'en') return saved
    if (typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase().startsWith('en')) {
      return 'en'
    }
  } catch {}
  return 'pt'
}

function resolveTranslation(
  dict: TranslationDictionary,
  fallbackDict: TranslationDictionary,
  keyPath: string,
  vars?: Record<string, string | number>
): string {
  const parts = keyPath.split('.')
  let curr: any = dict
  for (const p of parts) {
    if (curr && typeof curr === 'object' && p in curr) {
      curr = curr[p]
    } else {
      let fallback: any = fallbackDict
      for (const fb of parts) {
        if (fallback && typeof fallback === 'object' && fb in fallback) {
          fallback = fallback[fb]
        } else {
          fallback = keyPath
          break
        }
      }
      curr = fallback
      break
    }
  }

  if (typeof curr !== 'string') return keyPath

  if (vars) {
    return curr.replace(/{(\w+)}/g, (_, name) => {
      return name in vars ? String(vars[name]) : `{${name}}`
    })
  }
  return curr
}

const defaultContextValue: I18nContextType = {
  locale: 'pt',
  setLocale: () => {},
  toggleLocale: () => {},
  t: (keyPath: string, vars?: Record<string, string | number>) =>
    resolveTranslation(dictionaries.pt, dictionaries.en, keyPath, vars),
  dict: dictionaries.pt,
}

const I18nContext = createContext<I18nContextType>(defaultContextValue)

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {}
  }, [])

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'pt' ? 'en' : 'pt')
  }, [locale, setLocale])

  const dict = useMemo(() => dictionaries[locale], [locale])
  const fallbackDict = useMemo(() => (locale === 'pt' ? dictionaries.en : dictionaries.pt), [locale])

  const t = useCallback(
    (keyPath: string, vars?: Record<string, string | number>): string => {
      return resolveTranslation(dict, fallbackDict, keyPath, vars)
    },
    [dict, fallbackDict]
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      dict,
    }),
    [locale, setLocale, toggleLocale, t, dict]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  return useContext(I18nContext)
}

export * from './types'
