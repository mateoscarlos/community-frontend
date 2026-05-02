'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface IdlePromptProps {
  open: boolean
  /** How long the user has to respond before we assume they walked away (ms). */
  graceMs?: number
  onStillHere: () => void
  onTimeout: () => void
}

/**
 * Shown when no real interaction has been detected in a while. Gives the user
 * a brief window to confirm they're still working on their tile; if they
 * don't, the parent stops heartbeats and the backend sweeps the claim.
 *
 * The countdown lives in IdleContent which only mounts while open is true —
 * keeps the new react-hooks rules happy (no synchronous setState inside the
 * effect body; refs/Date.now never read during render).
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
    <>
      <motion.div
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        role="alertdialog"
        aria-live="assertive"
        className="border-foreground bg-background fixed inset-x-6 top-1/2 z-[60] mx-auto max-w-sm -translate-y-1/2 border-2 px-6 pt-6 pb-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      >
        <p className="text-foreground text-center text-lg font-black tracking-tight uppercase">
          {t('idle.title')}
        </p>
        <p className="text-muted-foreground mt-3 text-center text-[11px] tracking-[0.15em] uppercase">
          {t('idle.body', { count: secondsLeft })}
        </p>
        <button
          autoFocus
          onClick={onStillHere}
          className="bg-foreground text-background hover:bg-foreground/90 mt-6 flex h-14 w-full items-center justify-center text-sm font-bold tracking-[0.2em] uppercase transition-all"
        >
          {t('idle.still_here')}
        </button>
      </motion.div>
    </>
  )
}
