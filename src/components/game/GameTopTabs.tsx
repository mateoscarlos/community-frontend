'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { SketchyBox } from '@/components/ui/SketchyBox'
import { InfoModal } from '@/components/game/InfoModal'

interface GameTopTabsProps {
  locale: string
  gameType: 'photo' | 'prompt'
}

export function GameTopTabs({ locale, gameType }: GameTopTabsProps) {
  const { t } = useTranslation()
  const [infoOpen, setInfoOpen] = useState(false)
  return (
    <>
      <div className="relative flex items-end justify-center gap-2 pt-3 sm:gap-5 sm:pt-8">
        <SketchyTab href={`/${locale}/archive?game=${gameType}`} variant={0}>
          {t('nav.archive')}
        </SketchyTab>
        <SketchyTab variant={1} onClick={() => setInfoOpen(true)}>
          {t('nav.info')}
        </SketchyTab>
        <SketchyTab variant={2}>{t('nav.settings')}</SketchyTab>
      </div>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  )
}

function SketchyTab({
  children,
  href,
  onClick,
  variant,
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant: number
}) {
  const className =
    'text-foreground group relative inline-flex h-10 min-w-[84px] items-center justify-center px-3 sm:h-14 sm:min-w-[120px] sm:px-6'
  const inner = (
    <>
      <SketchyBox variant={variant} />
      <span
        className="relative z-10 text-lg leading-none sm:text-2xl"
        style={{ fontFamily: 'var(--font-handwritten)' }}
      >
        {children}
      </span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  )
}
