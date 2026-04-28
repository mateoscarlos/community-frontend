'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useGameStore } from '@/lib/store/game.store'
import { useClaimTileMutation, isClaimConflict } from '@/lib/query/claim.queries'
import type { TileResponse } from '@/types/api'

interface ClaimSheetProps {
  tile: TileResponse | null
  imageUrl?: string
  gridColumns: number
  gridRows: number
  onClose: () => void
}

export function ClaimSheet({ tile, imageUrl, gridColumns, gridRows, onClose }: ClaimSheetProps) {
  const { t } = useTranslation()
  const { sessionId, nickname, setNickname, claimTile } = useGameStore()
  const [localNickname, setLocalNickname] = useState(nickname)
  const claimMutation = useClaimTileMutation()

  useEffect(() => {
    setLocalNickname(nickname)
  }, [nickname])

  useEffect(() => {
    claimMutation.reset()
  }, [tile?.id])

  useEffect(() => {
    if (claimMutation.isError && isClaimConflict(claimMutation.error)) {
      const timer = setTimeout(onClose, 2000)
      return () => clearTimeout(timer)
    }
  }, [claimMutation.isError, claimMutation.error, onClose])

  if (!tile) return null

  const isConflict = claimMutation.isError && isClaimConflict(claimMutation.error)

  const handleClaim = () => {
    const name = localNickname.trim()
    if (!name) return
    setNickname(name)
    claimMutation.mutate(
      { tileId: tile.id, nickname: name, sessionId },
      {
        onSuccess: (data) => {
          claimTile(tile.id, data.expires_at)
          onClose()
        },
      }
    )
  }

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
            className="border-foreground bg-background fixed inset-x-0 bottom-0 z-50 border-t px-6 pb-8 pt-6 md:inset-x-auto md:bottom-8 md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:border"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground absolute right-4 top-4 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 flex items-start gap-4">
              {imageUrl && (
                <div className="border-foreground relative h-20 w-20 flex-shrink-0 overflow-hidden border">
                  <div
                    className="absolute"
                    style={{
                      width: `${gridColumns * 100}%`,
                      height: `${gridRows * 100}%`,
                      left: `-${tile.col * 100}%`,
                      top: `-${tile.row * 100}%`,
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                </div>
              )}
              <div className="flex-1 pt-1">
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
                  {t('claim.title')}
                </p>
                <p className="text-foreground mt-1 font-mono text-2xl font-black">
                  {tile.row + 1},{tile.col + 1}
                </p>
                <p className="text-muted-foreground mt-2 text-[10px] uppercase tracking-[0.15em]">
                  {t('claim.ttl')}
                </p>
              </div>
            </div>

            {isConflict ? (
              <div className="border-foreground border border-dashed p-4 text-center">
                <p className="text-foreground text-sm font-bold uppercase tracking-[0.15em]">
                  {t('claim.conflict')}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">{t('claim.conflict_hint')}</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-muted-foreground mb-2 block text-[10px] font-bold uppercase tracking-[0.2em]">
                    {t('claim.nickname_label')}
                  </label>
                  <input
                    type="text"
                    value={localNickname}
                    onChange={(e) => setLocalNickname(e.target.value)}
                    placeholder={t('claim.nickname_placeholder')}
                    className="bg-background border-foreground text-foreground placeholder:text-muted-foreground focus:ring-foreground w-full border px-4 py-3 text-base focus:outline-none focus:ring-1"
                    maxLength={30}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleClaim()
                    }}
                  />
                </div>

                <button
                  onClick={handleClaim}
                  disabled={!localNickname.trim() || claimMutation.isPending}
                  className="bg-foreground text-background hover:bg-foreground/90 flex h-14 w-full items-center justify-center text-sm font-bold uppercase tracking-[0.2em] transition-all disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {claimMutation.isPending ? '...' : t('claim.button')}
                </button>

                {claimMutation.isError && !isConflict && (
                  <p className="text-foreground mt-3 text-center text-xs uppercase tracking-[0.15em]">
                    {t('claim.error')}
                  </p>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
