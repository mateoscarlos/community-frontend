'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SketchyBox } from '@/components/ui/SketchyBox'

interface IdlePromptProps {
  open: boolean
  /** How long the user has to respond before we assume they walked away (ms). */
  graceMs?: number
  onStillHere: () => void
  onTimeout: () => void
}

/**
 * Friendly nudge when the user has been inactive — gives them a chance to
 * keep their claim instead of silently losing it. Mounting `IdleContent` only
 * while open keeps timers from running in the background.
 */
export function IdlePrompt({
  open,
  graceMs = 30_000,
  onStillHere,
  onTimeout,
}: IdlePromptProps) {
  return (
    <AnimatePresence>
      {open && (
        <IdleContent
          key="idle-prompt"
          graceMs={graceMs}
          onStillHere={onStillHere}
          onTimeout={onTimeout}
        />
      )}
    </AnimatePresence>
  )
}

function IdleContent({
  graceMs,
  onStillHere,
  onTimeout,
}: {
  graceMs: number
  onStillHere: () => void
  onTimeout: () => void
}) {
  const { t } = useTranslation()
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t - startedAt >= graceMs) {
        clearInterval(id)
        onTimeout()
      }
    }, 250)
    return () => clearInterval(id)
  }, [startedAt, graceMs, onTimeout])

  const secondsLeft = Math.max(0, Math.ceil((graceMs - (now - startedAt)) / 1000))

  return (
    <div className="fixed inset-0 z-[60]">
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          role="alertdialog"
          aria-live="polite"
          className="pointer-events-auto relative w-full max-w-md"
          style={{
            background: '#e6e6e6',
            color: '#111',
            boxShadow:
              '0 30px 60px -20px rgba(0,0,0,0.7), 0 18px 36px -18px rgba(0,0,0,0.45)',
          }}
          initial={{ opacity: 0, scale: 0.92, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        >
          <div className="flex flex-col items-center gap-5 px-6 pt-8 pb-7 text-center sm:px-10 sm:pt-10 sm:pb-9">
            <WavingHand />
            <h2 className="font-handwritten text-3xl leading-none sm:text-4xl">
              {t('idle.title')}
            </h2>
            <p className="text-[15px] leading-relaxed text-zinc-700 sm:text-base">
              {t('idle.body', { count: secondsLeft })}
            </p>
            <StillHereButton onClick={onStillHere} label={t('idle.still_here')} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function WavingHand() {
  // Hand-drawn waving hand to soften the prompt — gentle wave on a loop so
  // it reads as a friendly check-in rather than a warning.
  return (
    <motion.svg
      viewBox="0 0 48 48"
      className="h-12 w-12 text-zinc-800"
      aria-hidden="true"
      initial={{ rotate: -12 }}
      animate={{ rotate: [-12, 14, -12] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '50% 80%' }}
    >
      <path
        d="M 18 8 C 16 8, 15 10, 16 12 L 20 22 L 18 22 C 16 22, 14 22, 13 24 L 12 27 C 11 30, 12 34, 16 38 C 20 42, 28 42, 32 38 C 36 34, 36 28, 34 24 L 30 16 C 29 14, 27 14, 26 15 L 28 19 L 23 9 C 22 7, 20 7, 19 8 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 36 8 L 40 6 M 38 14 L 43 14 M 36 20 L 40 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </motion.svg>
  )
}

function StillHereButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      autoFocus
      onClick={onClick}
      className="relative inline-flex h-14 w-40 items-center justify-center text-zinc-900 sm:h-16 sm:w-48"
    >
      <SketchyBox variant={3} />
      <span className="font-handwritten relative z-10 text-2xl leading-none sm:text-3xl">
        {label}
      </span>
    </button>
  )
}
