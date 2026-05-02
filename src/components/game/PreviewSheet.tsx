'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { TilePreview } from '@/components/game/TilePreview'
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
 * First step of the two-stage claim flow: shows the user the tile they're
 * about to claim and asks them to confirm before the timer starts ticking.
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

  return (
    <AnimatePresence>
      {tile && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="border-foreground bg-background fixed inset-x-0 bottom-0 z-50 flex max-h-[95svh] flex-col overflow-y-auto border-t px-6 pt-6 pb-8 md:inset-x-auto md:bottom-4 md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:border"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground absolute top-4 right-4 z-10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                {t('preview.title')}
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-foreground font-mono text-xl font-black">
                  {tile.row + 1},{tile.col + 1}
                </p>
                <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                  {t('preview.ttl')}
                </p>
              </div>
            </div>

            <TilePreview
              imageUrl={imageUrl}
              gridColumns={gridColumns}
              gridRows={gridRows}
              row={tile.row}
              col={tile.col}
              className="border-foreground mb-6 aspect-square w-full border"
            />

            {blocked ? (
              <div className="border-foreground border border-dashed p-4 text-center">
                <p className="text-foreground text-xs tracking-[0.15em] uppercase">
                  {t('preview.blocked')}
                </p>
              </div>
            ) : (
              <button
                onClick={onClaim}
                disabled={claiming}
                className="bg-foreground text-background hover:bg-foreground/90 flex h-14 w-full items-center justify-center text-sm font-bold tracking-[0.2em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-30"
              >
                {claiming ? '...' : t('preview.claim')}
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
