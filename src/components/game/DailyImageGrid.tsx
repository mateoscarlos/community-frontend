'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Lock, Check, Pencil } from 'lucide-react'
import { useCurrentPeriodQuery } from '@/lib/query/period.queries'
import { useTileEvents } from '@/lib/hooks/useTileEvents'
import { PhaseCompleteOverlay } from '@/components/game/PhaseCompleteOverlay'
import { useGameStore } from '@/lib/store/game.store'
import { Skeleton } from '@/components/ui/skeleton'
import { ClaimSheet } from '@/components/game/ClaimSheet'
import { UploadSheet } from '@/components/game/UploadSheet'
import type { CurrentPeriodResponse, TileResponse } from '@/types/api'

interface DailyImageGridProps {
  initialData?: CurrentPeriodResponse & { isMock?: boolean }
}

const tileVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1 },
}

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
}

export function DailyImageGrid({ initialData }: DailyImageGridProps) {
  const { t, i18n } = useTranslation()
  const { data, isLoading, isError, refetch } = useCurrentPeriodQuery(initialData)
  const [phaseInfo, setPhaseInfo] = useState<{
    completedPhase: number
    nextPhase: number
    periodCompleted: boolean
  } | null>(null)
  const claimedTiles = useGameStore((s) => s.claimedTiles)
  const unclaimTile = useGameStore((s) => s.unclaimTile)
  const clearAllClaims = useGameStore((s) => s.clearAllClaims)
  useTileEvents((info) => {
    setPhaseInfo(info)
    clearAllClaims()
    setTimeout(() => {
      setPhaseInfo(null)
      refetch()
    }, 3500)
  })
  const [imageLoaded, setImageLoaded] = useState(false)

  const myTileIds = new Set(claimedTiles.map((c) => c.tileId))

  useEffect(() => {
    const now = new Date()
    for (const claim of claimedTiles) {
      if (new Date(claim.expiresAt) < now) {
        unclaimTile(claim.tileId)
        continue
      }
      const tile = data?.grid?.tiles?.find((t) => t.id === claim.tileId)
      if (tile && tile.status !== 'locked') {
        unclaimTile(claim.tileId)
      }
    }
  }, [claimedTiles, data, unclaimTile])

  const [selectedTile, setSelectedTile] = useState<TileResponse | null>(null)
  const [uploadTile, setUploadTile] = useState<TileResponse | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (imgRef.current?.complete) setImageLoaded(true)
  }, [data?.period?.image?.image_url])

  const grid = data?.grid
  const cols = grid?.columns ?? 3
  const rows = grid?.rows ?? 3
  const tiles = grid?.tiles ?? []
  const imageUrl = data?.period?.image?.image_url
  const drawnCount = grid?.drawn_count ?? 0
  const totalTiles = grid?.total_tiles ?? 0

  const today = new Date().toLocaleDateString(i18n.language, { month: 'long', day: 'numeric' })

  const handleTileClick = (tile: TileResponse) => {
    if (tile.status === 'free') {
      setSelectedTile(tile)
    } else if (myTileIds.has(tile.id) && tile.status === 'locked') {
      setUploadTile(tile)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col">
      {/* Header strip */}
      <div className="border-foreground flex items-end justify-between border-b px-6 py-5">
        <div>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
            {t('game.today')}
          </p>
          <p className="text-foreground mt-1 text-2xl font-black tracking-tight">{today}</p>
        </div>
        {totalTiles > 0 && (
          <div className="text-right">
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
              Drawn
            </p>
            <p className="text-foreground mt-1 font-mono text-2xl font-black tracking-tight">
              {drawnCount}/{totalTiles}
            </p>
          </div>
        )}
      </div>

      {/* Image + grid */}
      <div className="px-6 pt-6">
        <div className="border-foreground relative aspect-square w-full overflow-hidden border">
          <AnimatePresence>
            {(!imageLoaded || isLoading) && !isError && (
              <motion.div
                key="skeleton"
                className="absolute inset-0"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Skeleton className="h-full w-full rounded-none" />
                <div
                  className="absolute inset-0 grid"
                  style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                >
                  {Array.from({ length: cols * rows }, (_, i) => (
                    <div key={i} className="border-foreground/10 border" />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isError && !data && (
            <motion.div
              className="bg-background absolute inset-0 flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-foreground text-sm font-bold uppercase tracking-[0.2em]">
                {t('game.error')}
              </p>
              <button
                onClick={() => refetch()}
                className="border-foreground hover:bg-foreground hover:text-background border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all"
              >
                {t('common.retry')}
              </button>
            </motion.div>
          )}

          {imageUrl && (
            <motion.img
              ref={imgRef}
              src={imageUrl}
              alt={t('game.today')}
              className="absolute inset-0 h-full w-full object-cover"
              onLoad={() => setImageLoaded(true)}
              animate={{ opacity: imageLoaded ? 1 : 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              draggable={false}
            />
          )}

          <AnimatePresence>
            {imageLoaded && (
              <motion.div
                key="grid"
                className="absolute inset-0 grid"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                variants={gridVariants}
                initial="hidden"
                animate="visible"
              >
                {tiles.map((tile) => (
                  <TileCell
                    key={tile.id}
                    tile={tile}
                    isMine={myTileIds.has(tile.id)}
                    onClick={() => handleTileClick(tile)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hint */}
      <AnimatePresence>
        {imageLoaded && (
          <motion.p
            className="text-muted-foreground px-6 pt-4 text-center text-[10px] font-bold uppercase tracking-[0.2em]"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {t('game.claim_tile')}
          </motion.p>
        )}
      </AnimatePresence>

      <ClaimSheet
        tile={selectedTile}
        imageUrl={imageUrl}
        gridColumns={cols}
        gridRows={rows}
        onClose={() => setSelectedTile(null)}
      />

      <PhaseCompleteOverlay
        visible={phaseInfo !== null}
        completedPhase={phaseInfo?.completedPhase ?? 0}
        nextPhase={phaseInfo?.nextPhase ?? 0}
        periodCompleted={phaseInfo?.periodCompleted ?? false}
      />

      <UploadSheet
        tile={uploadTile}
        imageUrl={imageUrl}
        gridColumns={cols}
        gridRows={rows}
        onClose={() => setUploadTile(null)}
        onSubmitted={() => refetch()}
      />
    </div>
  )
}

function TileCell({
  tile,
  isMine,
  onClick,
}: {
  tile: TileResponse
  isMine: boolean
  onClick: () => void
}) {
  const isFree = tile.status === 'free'
  const isLocked = tile.status === 'locked'
  const isDrawn = tile.status === 'drawn'
  const clickable = isFree || (isMine && isLocked)

  return (
    <motion.button
      className={`relative border transition-colors focus:outline-none ${
        isFree
          ? 'border-foreground/20 cursor-pointer'
          : isMine && isLocked
            ? 'border-foreground cursor-pointer border-2'
            : isLocked
              ? 'border-foreground/40 cursor-default'
              : 'border-foreground/30 cursor-default'
      }`}
      variants={tileVariants}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      whileHover={
        clickable
          ? {
              backgroundColor: 'rgba(255,255,255,0.15)',
              scale: 1.03,
              zIndex: 10,
              transition: { duration: 0.12 },
            }
          : undefined
      }
      whileTap={clickable ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={!isFree && !isMine}
      aria-label={`Tile ${tile.row + 1},${tile.col + 1} — ${isMine ? 'yours' : tile.status}`}
    >
      {isMine && isLocked && (
        <motion.div
          className="bg-foreground/20 absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Pencil className="text-foreground h-4 w-4 drop-shadow-md" />
        </motion.div>
      )}

      {isLocked && !isMine && (
        <motion.div
          className="bg-background/40 absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Lock className="text-foreground/80 h-3 w-3 drop-shadow-md" />
        </motion.div>
      )}

      {isDrawn && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {tile.image_url ? (
            <img
              src={tile.image_url}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <Check className="text-foreground/70 h-3 w-3 drop-shadow-md" />
          )}
        </motion.div>
      )}
    </motion.button>
  )
}
