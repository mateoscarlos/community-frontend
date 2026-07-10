'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { TilePreview } from '@/components/game/TilePreview'
import { SketchyBox } from '@/components/ui/SketchyBox'
import { ModalCloseButton } from '@/components/ui/ModalCloseButton'
import type { TileResponse } from '@/types/api'

interface PreviewSheetProps {
  tile: TileResponse | null
  imageUrl?: string
  gridColumns: number
  gridRows: number
  /** True while the parent's claim mutation is in flight. */
  claiming?: boolean
  /** True when the user already holds another claim — disables the button. */
  blocked?: boolean
  onClose: () => void
  onClaim: () => void
}

/**
 * Confirm-claim modal. Shows the tile crop the user is about to draw, the
 * shared intro copy, and a single sketchy "Claim tile" CTA.
 */
export function PreviewSheet({
  tile,
  imageUrl,
  gridColumns,
  gridRows,
  claiming = false,
  blocked = false,
  onClose,
  onClaim,
}: PreviewSheetProps) {
  const { t } = useTranslation()
  const open = !!tile

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
      {open && tile && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            key="preview-backdrop"
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
              key="preview-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="preview-modal-title"
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

              <h2 id="preview-modal-title" className="sr-only">
                {t('preview.title')}
              </h2>

              <div className="flex flex-col items-center gap-6 px-6 pt-14 pb-8 sm:px-10 sm:pt-16 sm:pb-10">
                <p className="text-center text-[15px] leading-relaxed sm:text-base">
                  {t('preview.intro')}
                </p>

                {imageUrl && (
                  <TilePreview
                    imageUrl={imageUrl}
                    gridColumns={gridColumns}
                    gridRows={gridRows}
                    row={tile.row}
                    col={tile.col}
                    className="aspect-square w-40 border border-zinc-900/30 sm:w-48"
                  />
                )}

                {blocked ? (
                  <div className="border border-dashed border-zinc-900/40 px-4 py-3 text-center text-xs tracking-[0.15em] uppercase">
                    {t('preview.blocked')}
                  </div>
                ) : (
                  <ClaimButton
                    onClick={onClaim}
                    disabled={claiming}
                    label={claiming ? '…' : t('preview.claim')}
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

function ClaimButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative inline-flex h-14 w-44 items-center justify-center text-zinc-900 disabled:opacity-40 sm:h-16 sm:w-52"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <SketchyBox variant={2} />
      <span className="font-handwritten relative z-10 text-2xl leading-none sm:text-3xl">
        {label}
      </span>
    </button>
  )
}
