'use client'

import { I18nextProvider } from 'react-i18next'
import { createClientI18n } from '@/lib/i18n/client'
import type { Locale } from '@/lib/i18n/config'
import { useMemo } from 'react'

interface I18nProviderProps {
  locale: Locale
  resources: Record<string, Record<string, unknown>>
  children: React.ReactNode
}

export function I18nProvider({ locale, resources, children }: I18nProviderProps) {
  const instance = useMemo(() => createClientI18n(locale, resources), [locale, resources])
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>
}
