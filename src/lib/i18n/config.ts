export const locales = ['en', 'es', 'da'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'
export const defaultNS = 'common'
export const namespaces = ['common'] as const

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
