'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { locales, type Locale } from '@/lib/i18n/config'
import { useUiStore } from '@/lib/store/ui.store'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale } = useUiStore()

  function switchLocale(next: Locale) {
    setLocale(next)
    // Replace the current locale prefix in the path
    const segments = pathname.split('/')
    segments[1] = next
    router.push(segments.join('/') || `/${next}`)
  }

  return (
    <div className="flex items-center gap-1">
      <Globe className="text-muted-foreground h-4 w-4" />
      {locales.map((l) => (
        <Button
          key={l}
          variant={locale === l ? 'default' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs uppercase"
          onClick={() => switchLocale(l)}
          aria-label={t(`language.${l}`)}
        >
          {l}
        </Button>
      ))}
    </div>
  )
}
