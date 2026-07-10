'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SketchyBox } from '@/components/ui/SketchyBox'
import { FloatingEmojis } from '@/components/layout/FloatingEmojis'
import { useLockBodyScroll } from '@/lib/hooks/useLockBodyScroll'

export function LandingView({ locale }: { locale: string }) {
  useLockBodyScroll()
  const { t, i18n } = useTranslation()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setNow(new Date()))
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => {
      cancelAnimationFrame(rafId)
      clearInterval(id)
    }
  }, [])

  const dateLabel = now
    ? now.toLocaleDateString(i18n.language || locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''
  const timeLabel = now
    ? now.toLocaleTimeString(i18n.language || locale, { hour12: false })
    : ''

  return (
    <div className="bg-background relative flex h-svh flex-col items-center justify-between overflow-hidden px-6 pt-6 pb-4 sm:pt-12 sm:pb-8">
      <FloatingEmojis />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
        <CurvedTitle text={t('landing.title')} />

        <p className="text-foreground font-handwritten mt-1 max-w-xl text-center text-base leading-snug sm:mt-2 sm:text-xl md:text-2xl">
          {t('landing.description')}
        </p>

        <div className="mt-5 flex flex-col items-center gap-4 sm:mt-10 sm:gap-6">
          <PlayButton href={`/${locale}/play`} label={t('landing.play')} />
        </div>
      </div>

      <div className="text-foreground/80 relative z-10 mt-4 flex flex-col items-center gap-1 font-mono text-sm sm:mt-10">
        <span>{dateLabel}</span>
        <span className="tabular-nums">{timeLabel}</span>
      </div>
    </div>
  )
}

function CurvedTitle({ text }: { text: string }) {
  // Comic-logo treatment: a chunky rounded display font bent along an arc,
  // with a stacked 3D extrusion built from offset copies of the glyphs. The
  // front face is filled with the page background and outlined in the
  // foreground, so the whole thing inverts cleanly between light/dark.
  const EXTRUDE_LAYERS = 9
  const STEP_X = 0.9
  const STEP_Y = 1.5
  const fontStyle = { fontSize: 116 } as const
  // Lock the rendered word to a fixed run along the arc so the chunky display
  // font can't overflow and clip the first/last glyphs, regardless of its
  // metrics. spacingAndGlyphs lets it scale glyph widths too, not just gaps.
  const TEXT_LENGTH = 660

  const renderWord = (extraProps: React.SVGProps<SVGTextPathElement> = {}) => (
    <textPath
      href="#community-arc"
      startOffset="50%"
      textAnchor="middle"
      textLength={TEXT_LENGTH}
      lengthAdjust="spacingAndGlyphs"
      {...extraProps}
    >
      {text}
    </textPath>
  )

  return (
    <svg viewBox="0 0 760 250" className="w-full max-w-3xl" aria-label={text} role="img">
      <defs>
        <path id="community-arc" d="M 30 215 Q 380 -25 730 215" fill="none" />
      </defs>

      {/* 3D side extrusion — farthest layer first so nearer ones paint on top. */}
      {Array.from({ length: EXTRUDE_LAYERS }, (_, idx) => {
        const i = EXTRUDE_LAYERS - idx
        return (
          <text
            key={i}
            className="fill-foreground font-logo"
            style={fontStyle}
            transform={`translate(${i * STEP_X}, ${i * STEP_Y})`}
          >
            {renderWord()}
          </text>
        )
      })}

      {/* Front face: background fill, foreground outline. */}
      <text
        className="font-logo"
        style={{
          ...fontStyle,
          fill: 'var(--background)',
          stroke: 'var(--foreground)',
          strokeWidth: 3,
          paintOrder: 'stroke',
          strokeLinejoin: 'round',
        }}
      >
        {renderWord()}
      </text>
    </svg>
  )
}

function PlayButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-foreground group relative inline-flex h-20 w-52 items-center justify-center"
    >
      <motion.span
        className="absolute inset-0"
        initial={{ scale: 0.94, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      >
        <SketchyBox variant={3} />
      </motion.span>
      <span className="font-handwritten relative z-10 text-3xl leading-none">
        {label}
      </span>
    </Link>
  )
}
