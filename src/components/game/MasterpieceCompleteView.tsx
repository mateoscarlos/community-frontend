'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AppNav } from '@/components/layout/AppNav'
import { useCountdown } from '@/lib/hooks/useCountdown'

interface MasterpieceCompleteViewProps {
  /** URL of the composed final mosaic. Empty string renders the copy-only fallback. */
  imageUrl: string
  /** ISO timestamp of the next scheduled period start. */
  nextStartsAt?: string | null
  /** Called when the countdown reaches zero — parent should refetch. */
  onCountdownDone?: () => void
}

/**
 * The resting state that shows once the day's masterpiece is complete: the
 * composed mosaic full-bleed with a small overlay card counting down to the
 * next scheduled period. Fires `onCountdownDone` when the countdown hits
 * zero so the parent can refetch and swap in the new period's grid.
 */
export function MasterpieceCompleteView({
  imageUrl,
  nextStartsAt,
  onCountdownDone,
}: MasterpieceCompleteViewProps) {
  const { t } = useTranslation()
  const secondsLeft = useCountdown(nextStartsAt ?? null)

  useEffect(() => {
    if (!nextStartsAt) return
    if (secondsLeft === 0) onCountdownDone?.()
  }, [nextStartsAt, secondsLeft, onCountdownDone])

  return (
    <div className="bg-background flex min-h-svh flex-col items-center px-4 pb-6 sm:px-6 sm:pb-10">
      <AppNav />

      <div className="mt-6 flex w-full max-w-2xl flex-1 flex-col items-center gap-6 sm:mt-10 sm:gap-8">
        <div className="text-center">
          <p className="text-muted-foreground text-[10px] font-bold tracking-[0.3em] uppercase">
            {t('game.masterpiece_complete_title')}
          </p>
          <p className="text-foreground/80 font-handwritten mt-2 text-xl sm:text-2xl">
            {t('game.masterpiece_complete_body')}
          </p>
        </div>

        <motion.div
          className="border-foreground bg-background relative aspect-square w-full max-w-md overflow-hidden border sm:max-w-lg"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="bg-foreground/10 absolute inset-0" />
          )}
        </motion.div>

        {nextStartsAt && (
          <motion.div
            className="border-foreground bg-background/95 flex flex-col items-center gap-1 border px-6 py-4 text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <p className="text-muted-foreground text-[10px] font-bold tracking-[0.25em] uppercase">
              {t('game.next_picture_in')}
            </p>
            <p className="text-foreground mt-1 text-3xl leading-none font-black tracking-tight tabular-nums sm:text-4xl">
              {formatHms(secondsLeft)}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

/** HH:MM:SS formatter for the next-picture countdown (up to ~24h). */
function formatHms(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
