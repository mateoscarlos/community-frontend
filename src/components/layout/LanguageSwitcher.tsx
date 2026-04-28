'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { locales, type Locale } from '@/lib/i18n/config'
import { useUiStore } from '@/lib/store/ui.store'

export function LanguageSwitcher() {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale } = useUiStore()

  function switchLocale(next: Locale) {
    setLocale(next)
    const segments = pathname.split('/')
    segments[1] = next
    router.push(segments.join('/') || `/${next}`)
  }

  return (
    <div className="flex items-center gap-px">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          aria-label={t(`language.${l}`)}
          className={`h-7 w-7 text-[10px] font-bold uppercase tracking-widest transition-colors ${
            locale === l
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
