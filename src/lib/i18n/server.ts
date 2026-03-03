import 'server-only'
import { createInstance } from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { defaultLocale, defaultNS, namespaces, type Locale } from './config'

async function initI18next(locale: Locale) {
  const instance = createInstance()
  await instance
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`../../../public/locales/${language}/${namespace}.json`)
      )
    )
    .init({
      lng: locale,
      fallbackLng: defaultLocale,
      ns: namespaces,
      defaultNS,
      interpolation: { escapeValue: false },
    })
  return instance
}

export async function getTranslations(locale: Locale, ns: string = defaultNS) {
  const instance = await initI18next(locale)
  return {
    t: instance.getFixedT(locale, ns),
    i18n: instance,
  }
}
