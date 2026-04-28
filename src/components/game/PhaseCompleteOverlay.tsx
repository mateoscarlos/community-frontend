'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface PhaseCompleteOverlayProps {
  visible: boolean
  completedPhase: number
  nextPhase: number
  periodCompleted: boolean
}

export function PhaseCompleteOverlay({
  visible,
  completedPhase,
  nextPhase,
  periodCompleted,
}: PhaseCompleteOverlayProps) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="bg-background fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.div
              key={i}
              className="bg-foreground absolute h-1 w-1"
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
                x: Math.cos((i / 16) * Math.PI * 2) * (120 + Math.random() * 80),
                y: Math.sin((i / 16) * Math.PI * 2) * (120 + Math.random() * 80),
              }}
              transition={{
                duration: 1.6,
                delay: 0.2 + i * 0.04,
                ease: 'easeOut',
              }}
            />
          ))}

          <motion.div
            className="relative z-10 flex flex-col items-center gap-6 px-8 text-center"
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.15 }}
          >
            <motion.p
              className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.3em]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {periodCompleted ? 'Period' : `Phase ${completedPhase}`}
            </motion.p>

            <motion.h2
              className="text-foreground text-5xl font-black uppercase tracking-tight"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {periodCompleted ? t('phase.completed_title') : t('phase.advance_title')}
            </motion.h2>

            <motion.p
              className="text-muted-foreground max-w-xs text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              {periodCompleted
                ? t('phase.completed_subtitle')
                : t('phase.advance_subtitle', { phase: nextPhase })}
            </motion.p>

            <motion.div
              className="flex items-center gap-3 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {[1, 2, 3].map((phase) => (
                <motion.div
                  key={phase}
                  className={`h-3 w-3 ${
                    phase <= completedPhase
                      ? 'bg-foreground'
                      : 'border-foreground/30 border'
                  }`}
                  initial={phase === completedPhase ? { scale: 0 } : undefined}
                  animate={phase === completedPhase ? { scale: [0, 1.5, 1] } : undefined}
                  transition={
                    phase === completedPhase
                      ? { delay: 0.8, duration: 0.4, ease: 'easeOut' }
                      : undefined
                  }
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
