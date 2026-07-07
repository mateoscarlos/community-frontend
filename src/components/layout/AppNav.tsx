'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { SketchyBox } from '@/components/ui/SketchyBox'
import { InfoModal } from '@/components/game/InfoModal'
import { useGameStore } from '@/lib/store/game.store'

/**
 * Global top navigation. Sits at the top of every content page and gives
 * players a persistent way back to the game — the previous chrome-only pattern
 * left users on Blog/Feedback/Upload with no discoverable route to Play.
 *
 * Play routes to whichever mode the user last opened (photo default). Museum
 * carries the same mode through so a prompt player lands on the prompt
 * archive. Info opens the shared how-it-works modal.
 *
 * Self-hides on the landing (its own full-screen Play CTA covers the same
 * ground) and on the phone upload flow (single-purpose entry from a QR code —
 * navigation would be confusing there).
 */
export function AppNav() {
  const { t } = useTranslation()
  const params = useParams()
  const pathname = usePathname() ?? ''
  const locale = (params?.locale as string) ?? 'en'
  const lastGameType = useGameStore((s) => s.lastGameType)
  const [infoOpen, setInfoOpen] = useState(false)

  if (shouldHide(pathname, locale)) return null

  const activePlay = pathname.startsWith(`/${locale}/play`)
  const activeMuseum = pathname.startsWith(`/${locale}/archive`)
  const activeBlog = pathname.startsWith(`/${locale}/blog`)

  return (
    <>
      {/* pt-16 on mobile drops the tab row below the fixed Back/Home button
          band; sm+ has room so it stays compact. */}
      <div className="relative flex flex-wrap items-end justify-center gap-1.5 pt-16 sm:gap-5 sm:pt-8">
        <NavTab
          href={`/${locale}/play/${lastGameType}`}
          variant={2}
          active={activePlay}
        >
          {t('nav.game')}
        </NavTab>
        <NavTab
          href={`/${locale}/archive?game=${lastGameType}`}
          variant={0}
          active={activeMuseum}
        >
          {t('nav.archive')}
        </NavTab>
        <NavTab href={`/${locale}/blog`} variant={3} active={activeBlog}>
          {t('nav.blog')}
        </NavTab>
        <NavTab variant={1} onClick={() => setInfoOpen(true)}>
          {t('nav.info')}
        </NavTab>
      </div>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  )
}

function shouldHide(pathname: string, locale: string): boolean {
  // Landing has its own centred Play CTA — a nav bar above it would compete
  // for attention. Upload flow is a phone hand-off with no supported detour.
  if (pathname === `/${locale}` || pathname === `/${locale}/`) return true
  if (pathname.startsWith(`/${locale}/upload`)) return true
  return false
}

function NavTab({
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
    'group text-foreground relative inline-flex h-10 min-w-[72px] items-center justify-center px-2.5 sm:h-14 sm:min-w-[120px] sm:px-6'
  const inner = (
    <>
      {/* When active the wobbly shape itself fills, so the highlight follows
          the hand-drawn outline instead of a mismatched rectangle behind it. */}
      <SketchyBox variant={variant} filled={active} />
      <span
        className={`font-handwritten relative z-10 text-base leading-none sm:text-2xl ${
          active ? 'text-background' : ''
        }`}
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
