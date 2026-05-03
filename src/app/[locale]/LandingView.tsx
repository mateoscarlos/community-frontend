'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export function LandingView({ locale }: { locale: string }) {
  const { t } = useTranslation()

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-10 text-center">
        <h1 className="text-foreground text-5xl font-black tracking-tight uppercase md:text-6xl">
          {t('landing.title')}
        </h1>

        <p className="text-muted-foreground text-sm tracking-[0.05em] md:text-base">
          {t('landing.description')}
        </p>

        <Link
          href={`/${locale}/play`}
          className="bg-foreground text-background hover:bg-foreground/90 flex h-16 w-full items-center justify-center text-base font-bold tracking-[0.25em] uppercase transition-all"
        >
          {t('landing.play')}
        </Link>

        <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
          {t('landing.tagline')}
        </p>
      </div>
    </div>
  )
}
