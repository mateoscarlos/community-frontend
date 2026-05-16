// All locales that resolve & have translations. Spanish stays here so
// existing /es URLs keep working and the es bundle is still served — it's
// just intentionally not offered in the language picker (see uiLocales).
export const locales = ['en', 'es', 'da'] as const
export type Locale = (typeof locales)[number]

// Locales actually offered in the UI language switcher.
export const uiLocales = ['en', 'da'] as const

export const defaultLocale: Locale = 'en'
export const defaultNS = 'common'
export const namespaces = ['common'] as const

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
