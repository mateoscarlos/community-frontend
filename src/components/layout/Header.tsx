'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { LanguageSwitcher } from './LanguageSwitcher'

const NAV_KEYS = ['home', 'game', 'blog', 'account'] as const

function navHref(locale: string, key: string) {
  if (key === 'home') return `/${locale}`
  return `/${locale}/${key}`
}

export function Header() {
  const { t } = useTranslation()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'

  return (
    <header className="bg-surface-elevated border-border sticky top-0 z-50 border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="text-foreground text-lg font-bold tracking-tight"
        >
          Community
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_KEYS.map((key) => (
            <Link
              key={key}
              href={navHref(locale, key)}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>

        <LanguageSwitcher />
      </div>
    </header>
  )
}
