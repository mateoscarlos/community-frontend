'use client'

import i18next, { type Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { defaultLocale, defaultNS, type Locale } from './config'

export function createClientI18n(
  locale: Locale,
  resources: Record<string, Record<string, unknown>>
) {
  const instance = i18next.createInstance()
  instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: defaultLocale,
    ns: [defaultNS],
    defaultNS,
    resources: { [locale]: resources } as Resource,
    interpolation: { escapeValue: false },
  })
  return instance
}
