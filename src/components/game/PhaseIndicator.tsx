'use client'

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface PhaseIndicatorProps {
  phase: number
  columns: number
  rows: number
}

const ROMAN = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
]

/**
 * Persistent header caption that tells the player which refinement phase the
 * current period is in. Uses the same square-pip language as the phase-advance
 * overlay so the transition and the resting state read as one system.
 *
 * Pips always show three slots — matching the seeded phase 1/2/3 grid tiers.
 * When the period runs past phase 3 (rare, but the model allows it) the last
 * pip fills solid and the label carries the exact number.
 */
export function PhaseIndicator({ phase, columns, rows }: PhaseIndicatorProps) {
  const { t } = useTranslation()
  const pipCount = 3
  const label = phase <= ROMAN.length ? ROMAN[phase - 1] : String(phase)

  return (
    <motion.div
      key={phase}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="text-muted-foreground flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.25em] uppercase"
      aria-label={t('phase.current_aria', { phase, columns, rows })}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: pipCount }).map((_, i) => {
          const slot = i + 1
          const done = slot < Math.min(phase, pipCount)
          const active = slot === Math.min(phase, pipCount)
          return (
            <motion.span
              key={i}
              className={`h-2 w-2 ${
                done
                  ? 'bg-foreground/60'
                  : active
                    ? 'bg-foreground'
                    : 'border-foreground/30 border'
              }`}
              initial={active ? { scale: 0.6 } : false}
              animate={active ? { scale: [0.6, 1.25, 1] } : undefined}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          )
        })}
      </span>
      <span className="text-foreground">
        {t('phase.current_label', { phase: label })}
      </span>
      <span className="text-muted-foreground/70">
        · {columns}×{rows}
      </span>
    </motion.div>
  )
}
