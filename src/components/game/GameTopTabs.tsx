'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { SketchyBox } from '@/components/ui/SketchyBox'
import { InfoModal } from '@/components/game/InfoModal'

interface GameTopTabsProps {
  locale: string
  gameType: 'photo' | 'prompt'
  /** Highlight a tab as the current page (filled, like the mock). */
  activeTab?: 'museum'
}

export function GameTopTabs({ locale, gameType, activeTab }: GameTopTabsProps) {
  const { t } = useTranslation()
  const [infoOpen, setInfoOpen] = useState(false)
  return (
    <>
      {/* pt-16 on mobile drops the centred tab row below the fixed Back/Home
          button band (top-3 + ~44px ≈ 56px) so they never overlap on narrow
          screens. Desktop has the horizontal room, so it stays compact. */}
      <div className="relative flex items-end justify-center gap-2 pt-16 sm:gap-5 sm:pt-8">
        <SketchyTab
          href={`/${locale}/archive?game=${gameType}`}
          variant={0}
          active={activeTab === 'museum'}
        >
          {t('nav.archive')}
        </SketchyTab>
        <SketchyTab variant={1} onClick={() => setInfoOpen(true)}>
          {t('nav.info')}
        </SketchyTab>
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
  active = false,
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant: number
  active?: boolean
}) {
  const className =
    'group text-foreground relative inline-flex h-10 min-w-[84px] items-center justify-center px-3 sm:h-14 sm:min-w-[120px] sm:px-6'
  const inner = (
    <>
      {/* When active the wobbly shape itself is filled, so the highlight
          follows the hand-drawn outline (no mismatched rectangle). */}
      <SketchyBox variant={variant} filled={active} />
      <span
        className={`relative z-10 text-lg leading-none sm:text-2xl ${
          active ? 'text-background' : ''
        }`}
        style={{ fontFamily: 'var(--font-handwritten)' }}
      >
        {children}
      </span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className} aria-current={active ? 'page' : undefined}>
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
