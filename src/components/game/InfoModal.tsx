'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ModalCloseButton } from '@/components/ui/ModalCloseButton'

interface InfoModalProps {
  open: boolean
  onClose: () => void
}

export function InfoModal({ open, onClose }: InfoModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            key="info-backdrop"
            onClick={onClose}
            className="absolute inset-0"
            style={{
              background: 'rgba(0, 0, 0, 0.78)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              key="info-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="info-modal-title"
              className="pointer-events-auto relative w-full max-w-lg"
              style={{
                background: '#e6e6e6',
                color: '#111',
                boxShadow:
                  '0 30px 60px -20px rgba(0,0,0,0.7), 0 18px 36px -18px rgba(0,0,0,0.45)',
              }}
              initial={{ opacity: 0, scale: 0.88, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            >
              <ModalCloseButton onClick={onClose} ariaLabel={t('info.close')} />

              <h2 id="info-modal-title" className="sr-only">
                {t('nav.info')}
              </h2>

              <div className="space-y-5 px-6 pt-14 pb-8 text-[15px] leading-relaxed sm:px-10 sm:pt-16 sm:pb-10 sm:text-base">
                <p>{t('info.p1')}</p>
                <p>{t('info.p2')}</p>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
