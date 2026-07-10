'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Lock, Check, Pencil } from 'lucide-react'
import { useCurrentPeriodQuery } from '@/lib/query/period.queries'
import { useTileEvents } from '@/lib/hooks/useTileEvents'
import { PhaseCompleteOverlay } from '@/components/game/PhaseCompleteOverlay'
import { PhaseIndicator } from '@/components/game/PhaseIndicator'
import { MasterpieceCompleteView } from '@/components/game/MasterpieceCompleteView'
import { useGameStore } from '@/lib/store/game.store'
import { Skeleton } from '@/components/ui/skeleton'
import { UploadSheet } from '@/components/game/UploadSheet'
import { PreviewSheet } from '@/components/game/PreviewSheet'
import { IdlePrompt } from '@/components/game/IdlePrompt'
import { CanvasZoom } from '@/components/game/CanvasZoom'
import { AppNav } from '@/components/layout/AppNav'
import { DateTimeFooter } from '@/components/layout/DateTimeFooter'
import { useLockBodyScroll } from '@/lib/hooks/useLockBodyScroll'
import {
  useClaimTileMutation,
  isClaimConflict,
  useReleaseClaimMutation,
} from '@/lib/query/claim.queries'
import { useClaimHeartbeat } from '@/lib/hooks/useClaimHeartbeat'
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
  useLockBodyScroll()
  const { t } = useTranslation()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'
  const { data, isLoading, isError, refetch } = useCurrentPeriodQuery(initialData)
  const [phaseInfo, setPhaseInfo] = useState<{
    completedPhase: number
    nextPhase: number
    periodCompleted: boolean
  } | null>(null)
  const claimedTiles = useGameStore((s) => s.claimedTiles)
  const unclaimTile = useGameStore((s) => s.unclaimTile)
  const clearAllClaims = useGameStore((s) => s.clearAllClaims)
  const sessionId = useGameStore((s) => s.sessionId)
  const claimTileLocal = useGameStore((s) => s.claimTile)
  const claimMutation = useClaimTileMutation()
  const [claimError, setClaimError] = useState<string | null>(null)
  useTileEvents((info) => {
    setPhaseInfo(info)
    clearAllClaims()
    setTimeout(() => {
      setPhaseInfo(null)
      refetch()
    }, 3500)
  })
  const [imageReady, setImageReady] = useState(false)

  const myTileIds = new Set(claimedTiles.map((c) => c.tileId))

  useEffect(() => {
    if (!data?.grid?.tiles) return
    const now = Date.now()
    const tileById = new Map(data.grid.tiles.map((t) => [t.id, t]))
    // Grace window so a freshly-claimed tile isn't dropped before the period
    // query has a chance to refetch and report status='locked'.
    const RECENT_CLAIM_MS = 15_000

    for (const claim of claimedTiles) {
      if (new Date(claim.expiresAt).getTime() < now) {
        unclaimTile(claim.tileId)
        continue
      }
      const ageMs = claim.claimedAt
        ? now - new Date(claim.claimedAt).getTime()
        : RECENT_CLAIM_MS + 1
      if (ageMs < RECENT_CLAIM_MS) continue

      const tile = tileById.get(claim.tileId)
      // Tile not in current period (period rolled over) or backend disagrees
      // → drop the local claim so the user isn't stuck.
      if (!tile || tile.status !== 'locked') {
        unclaimTile(claim.tileId)
      }
    }
  }, [claimedTiles, data, unclaimTile])

  const [previewTile, setPreviewTile] = useState<TileResponse | null>(null)
  const [uploadTile, setUploadTile] = useState<TileResponse | null>(null)
  const hasActiveClaim = claimedTiles.length > 0
  const uploadClaim = claimedTiles.find((c) => c.tileId === uploadTile?.id)

  const activeClaim = claimedTiles[0]
  const releaseMutation = useReleaseClaimMutation()
  const { isIdle, dismissIdle } = useClaimHeartbeat(
    activeClaim?.tileId ?? null,
    sessionId,
    !!activeClaim
  )

  const setImgRef = (node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setImageReady(true)
  }

  const grid = data?.grid
  const cols = grid?.columns ?? 3
  const rows = grid?.rows ?? 3
  const allTiles = grid?.tiles ?? []
  const imageUrl = data?.period?.image?.image_url
  const drawnCount = grid?.drawn_count ?? 0
  const currentPhase = data?.period?.phase ?? 0
  const finalGridSize = data?.period?.final_grid_size ?? cols
  const phaseGridSize = data?.period?.phase_grid_size ?? cols
  const phaseGridSizes = data?.period?.phase_grid_sizes ?? []
  const outerDisplay = grid?.outer_tile_display ?? 'blocked'
  const isHidden = outerDisplay === 'hidden'

  // In "hidden" mode the viewport shrinks to just the currently-unlocked
  // window, so future_locked tiles are dropped and the grid re-centers.
  // Earlier phases' drawings still sit at their absolute (row, col) — we
  // subtract `windowOffset` so they land at the right cell of the smaller
  // grid.
  const windowOffset = isHidden ? Math.floor((finalGridSize - phaseGridSize) / 2) : 0
  const renderCols = isHidden ? phaseGridSize : cols
  const renderRows = isHidden ? phaseGridSize : rows
  const tiles = isHidden ? allTiles.filter((t) => t.status !== 'future_locked') : allTiles
  // Score line uses the wire-format total, which the backend scopes to the
  // currently-playable window (matches drawn_count).
  const totalTiles = grid?.total_tiles ?? 0

  // In hidden mode the reference photo has to be zoomed so its center
  // `phaseGridSize / finalGridSize` fraction fills the viewport, otherwise
  // each visible tile would show the wrong crop.
  const imageZoom = isHidden && phaseGridSize > 0 ? finalGridSize / phaseGridSize : 1

  const imageLoaded = imageReady

  const periodStatus = data?.period?.status
  const nextPeriodStartsAt = data?.period?.next_period_starts_at
  const phaseMosaics = data?.period?.phase_mosaics ?? []
  // Latest phase mosaic = the composed masterpiece for a completed period.
  const masterpieceUrl = phaseMosaics.length
    ? (phaseMosaics[phaseMosaics.length - 1].image_url ?? '')
    : ''

  if (periodStatus === 'completed') {
    return (
      <MasterpieceCompleteView
        imageUrl={masterpieceUrl}
        nextStartsAt={nextPeriodStartsAt}
        onCountdownDone={() => refetch()}
      />
    )
  }

  const handleTileClick = (tile: TileResponse) => {
    // Already-mine tile → straight to upload sheet (resume drawing).
    if (myTileIds.has(tile.id) && tile.status === 'locked') {
      setUploadTile(tile)
      return
    }
    // Free tile → open preview first; the timer doesn't start until they
    // explicitly click Claim inside the preview sheet.
    if (tile.status === 'free') {
      setPreviewTile(tile)
    }
  }

  const handleClaim = () => {
    if (!previewTile) return
    setClaimError(null)
    const tile = previewTile
    claimMutation.mutate(
      { tileId: tile.id, sessionId },
      {
        onSuccess: (claim) => {
          claimTileLocal(tile.id, claim.expires_at)
          setPreviewTile(null)
          setUploadTile({ ...tile, status: 'locked' })
        },
        onError: (err) => {
          setPreviewTile(null)
          if (isClaimConflict(err)) {
            setClaimError(t('claim.conflict'))
          } else {
            setClaimError(t('claim.error'))
          }
          setTimeout(() => setClaimError(null), 2500)
        },
      }
    )
  }

  return (
    <div className="bg-background flex h-svh flex-col items-center overflow-hidden px-4 pb-3 sm:px-6 sm:pb-8">
      <AppNav />

      <div className="flex w-full max-w-md flex-1 flex-col items-center sm:max-w-lg">
        <div className="mt-2 mb-2 flex flex-col items-center gap-2 text-center sm:mt-8 sm:mb-6">
          {currentPhase > 0 && (
            <PhaseIndicator
              phase={currentPhase}
              phaseGridSize={phaseGridSize}
              finalGridSize={finalGridSize}
              phaseGridSizes={phaseGridSizes}
            />
          )}
          {totalTiles > 0 && (
            <motion.p
              key={drawnCount}
              className="text-foreground/90 font-handwritten text-lg sm:text-xl"
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              {drawnCount}/{totalTiles} {t('game.complete')}
            </motion.p>
          )}
        </div>

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
                  style={{ gridTemplateColumns: `repeat(${renderCols}, 1fr)` }}
                >
                  {Array.from({ length: renderCols * renderRows }, (_, i) => (
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
              <p className="text-foreground text-sm font-bold tracking-[0.2em] uppercase">
                {t('game.error')}
              </p>
              <button
                onClick={() => refetch()}
                className="border-foreground hover:bg-foreground hover:text-background border px-4 py-2 text-xs font-bold tracking-[0.2em] uppercase transition-all"
              >
                {t('common.retry')}
              </button>
            </motion.div>
          )}

          <CanvasZoom>
            {imageUrl && (
              <motion.img
                key={imageUrl}
                ref={setImgRef}
                src={imageUrl}
                alt={t('nav.game')}
                className="absolute h-full w-full object-cover"
                style={{
                  // In "blocked" mode imageZoom=1 and the photo covers the
                  // whole viewport. In "hidden" mode it's scaled up and
                  // centered so only the currently-unlocked crop shows.
                  width: `${100 * imageZoom}%`,
                  height: `${100 * imageZoom}%`,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                onLoad={() => setImageReady(true)}
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
                  style={{ gridTemplateColumns: `repeat(${renderCols}, 1fr)` }}
                  variants={gridVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {tiles.map((tile) => (
                    <TileCell
                      key={tile.id}
                      tile={tile}
                      isMine={myTileIds.has(tile.id)}
                      // Place tiles by absolute (row, col) minus the offset
                      // so hidden-mode's smaller grid re-centers correctly.
                      style={{
                        gridColumnStart: tile.col - windowOffset + 1,
                        gridRowStart: tile.row - windowOffset + 1,
                      }}
                      disabled={
                        tile.status === 'free' &&
                        (hasActiveClaim || claimMutation.isPending)
                      }
                      onClick={() => handleTileClick(tile)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </CanvasZoom>
        </div>

        <AnimatePresence>
          {imageLoaded && (
            <motion.p
              className="text-muted-foreground font-handwritten mt-3 text-center text-base leading-none tracking-wide uppercase sm:mt-6 sm:text-xl"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              {t('game.claim_tile')}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-1 sm:pt-8">
        <DateTimeFooter locale={locale} />
      </div>

      <AnimatePresence>
        {claimError && (
          <motion.div
            key="claim-error"
            className="border-foreground bg-background fixed inset-x-6 bottom-24 z-40 mx-auto max-w-sm border p-4 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <p className="text-foreground text-xs font-bold tracking-[0.15em] uppercase">
              {claimError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <PhaseCompleteOverlay
        visible={phaseInfo !== null}
        completedPhase={phaseInfo?.completedPhase ?? 0}
        nextPhase={phaseInfo?.nextPhase ?? 0}
        periodCompleted={phaseInfo?.periodCompleted ?? false}
      />

      <IdlePrompt
        open={isIdle && !!activeClaim}
        onStillHere={dismissIdle}
        onTimeout={() => {
          if (!activeClaim) return
          const tileId = activeClaim.tileId
          unclaimTile(tileId)
          releaseMutation.mutate({ tileId, sessionId })
          if (uploadTile?.id === tileId) setUploadTile(null)
          dismissIdle()
        }}
      />

      <PreviewSheet
        tile={previewTile}
        imageUrl={imageUrl}
        gridColumns={cols}
        gridRows={rows}
        claiming={claimMutation.isPending}
        blocked={hasActiveClaim && !myTileIds.has(previewTile?.id ?? '')}
        onClose={() => setPreviewTile(null)}
        onClaim={handleClaim}
      />

      <UploadSheet
        key={uploadTile?.id ?? 'closed'}
        tile={uploadTile}
        imageUrl={imageUrl}
        gridColumns={cols}
        gridRows={rows}
        tiles={tiles}
        expiresAt={uploadClaim?.expiresAt ?? null}
        onClose={() => setUploadTile(null)}
        onSubmitted={() => refetch()}
      />
    </div>
  )
}

function TileCell({
  tile,
  isMine,
  disabled = false,
  onClick,
  style,
}: {
  tile: TileResponse
  isMine: boolean
  disabled?: boolean
  onClick: () => void
  style?: React.CSSProperties
}) {
  const isFree = tile.status === 'free'
  const isLocked = tile.status === 'locked'
  const isDrawn = tile.status === 'drawn'
  const isFutureLocked = tile.status === 'future_locked'
  const clickable = (isFree && !disabled) || (isMine && isLocked)

  const cursorClass = isFree
    ? disabled
      ? 'cur-no-pencil'
      : 'cur-pencil'
    : isMine && isLocked
      ? 'cur-pencil'
      : isLocked
        ? 'cur-lock'
        : ''

  let baseBg = ''
  if (isFutureLocked) baseBg = 'bg-foreground/60'
  else if (!isDrawn) {
    if (isMine && isLocked) baseBg = 'bg-foreground/20'
    else if (isLocked) baseBg = 'bg-background/40'
  }

  const borderClass = isFutureLocked
    ? 'border-foreground/20 border'
    : isFree
      ? disabled
        ? 'border-foreground/10 border'
        : 'border-foreground/20 border'
      : isMine && isLocked
        ? 'border-foreground border-2'
        : isLocked
          ? 'border-foreground/40 border'
          : 'border-foreground/30 border'

  return (
    <motion.button
      className={`relative overflow-hidden transition-colors focus:outline-none ${baseBg} ${borderClass} ${cursorClass} ${
        clickable ? 'hover:bg-foreground/15' : ''
      }`}
      style={style}
      variants={tileVariants}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      whileHover={
        clickable
          ? { scale: 1.03, zIndex: 10, transition: { duration: 0.12 } }
          : undefined
      }
      whileTap={clickable ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={isFutureLocked || (!isFree && !isMine) || (isFree && disabled)}
      aria-label={`Tile ${tile.row + 1},${tile.col + 1} — ${isMine ? 'yours' : tile.status}`}
    >
      {isMine && isLocked && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Pencil className="text-foreground h-4 w-4 drop-shadow-md" />
        </motion.div>
      )}

      {isLocked && !isMine && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
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
            <Check className="text-foreground h-3 w-3 drop-shadow-md" />
          )}
        </motion.div>
      )}
    </motion.button>
  )
}
