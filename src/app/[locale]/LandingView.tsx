'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SketchyBox } from '@/components/ui/SketchyBox'
import { useLockBodyScroll } from '@/lib/hooks/useLockBodyScroll'

type Mode = 'photo' | 'prompt'

export function LandingView({ locale }: { locale: string }) {
  useLockBodyScroll()
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState<Mode>('photo')
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
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <CurvedTitle text={t('landing.title')} />

        <p
          className="text-foreground mt-1 max-w-xl text-center text-base leading-snug sm:mt-2 sm:text-xl md:text-2xl"
          style={{ fontFamily: 'var(--font-handwritten)' }}
        >
          {t('landing.description')}
        </p>

        <div className="mt-5 flex flex-col items-center gap-4 sm:mt-10 sm:gap-6">
          <ModeToggle
            mode={mode}
            onChange={setMode}
            pictureLabel={t('landing.mode_picture')}
            promptLabel={t('landing.mode_prompt')}
          />
          <PlayButton
            href={`/${locale}/play/${mode}`}
            label={t('landing.play')}
            mode={mode}
          />
        </div>
      </div>

      <div className="text-foreground/80 mt-4 flex flex-col items-center gap-1 font-mono text-sm sm:mt-10">
        <span>{dateLabel}</span>
        <span className="tabular-nums">{timeLabel}</span>
      </div>
    </div>
  )
}

function CurvedTitle({ text }: { text: string }) {
  // textPath bends the glyphs along the arc. Width is responsive via viewBox.
  return (
    <svg viewBox="0 0 600 220" className="w-full max-w-2xl" aria-label={text} role="img">
      <defs>
        <path id="community-arc" d="M 40 200 Q 300 -40 560 200" fill="none" />
      </defs>
      <text
        className="fill-foreground"
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: 130,
          fontWeight: 700,
          paintOrder: 'stroke',
          stroke: 'var(--foreground)',
          strokeWidth: 2,
        }}
      >
        <textPath href="#community-arc" startOffset="50%" textAnchor="middle">
          {text}
        </textPath>
      </text>
    </svg>
  )
}

function ModeToggle({
  mode,
  onChange,
  pictureLabel,
  promptLabel,
}: {
  mode: Mode
  onChange: (m: Mode) => void
  pictureLabel: string
  promptLabel: string
}) {
  const options: { value: Mode; label: string }[] = [
    { value: 'photo', label: pictureLabel },
    { value: 'prompt', label: promptLabel },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="Game mode"
      className="border-foreground/60 inline-flex border"
    >
      {options.map((opt) => {
        const active = opt.value === mode
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`relative px-5 py-1 text-xl leading-none sm:text-2xl ${
              active ? 'text-background' : 'text-foreground hover:bg-foreground/10'
            }`}
            style={{ fontFamily: 'var(--font-handwritten)' }}
          >
            {active && (
              <motion.span
                layoutId="mode-toggle-pill"
                className="bg-foreground absolute inset-0 z-0"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function PlayButton({ href, label, mode }: { href: string; label: string; mode: Mode }) {
  // Pulse + tiny rotation each time the mode flips, so the button itself
  // confirms the change visually even though its label stays the same.
  return (
    <Link
      href={href}
      className="text-foreground group relative inline-flex h-20 w-52 items-center justify-center"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={mode}
          className="absolute inset-0"
          initial={{ scale: 0.94, rotate: -2, opacity: 0.6 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        >
          <SketchyBox variant={mode === 'photo' ? 3 : 0} />
        </motion.span>
      </AnimatePresence>
      <motion.span
        key={`flash-${mode}`}
        className="bg-foreground/30 pointer-events-none absolute inset-0"
        initial={{ opacity: 0.55 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        aria-hidden="true"
      />
      <span
        className="relative z-10 text-3xl leading-none"
        style={{ fontFamily: 'var(--font-handwritten)' }}
      >
        {label}
      </span>
    </Link>
  )
}
