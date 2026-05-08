'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Lock, Check, Pencil, Archive } from 'lucide-react'
import { useCurrentPeriodQuery } from '@/lib/query/period.queries'
import { useTileEvents } from '@/lib/hooks/useTileEvents'
import { PhaseCompleteOverlay } from '@/components/game/PhaseCompleteOverlay'
import { useGameStore } from '@/lib/store/game.store'
import { Skeleton } from '@/components/ui/skeleton'
import { UploadSheet } from '@/components/game/UploadSheet'
import { PreviewSheet } from '@/components/game/PreviewSheet'
import { IdlePrompt } from '@/components/game/IdlePrompt'
import {
  useClaimTileMutation,
  isClaimConflict,
  useReleaseClaimMutation,
} from '@/lib/query/claim.queries'
import { useClaimHeartbeat } from '@/lib/hooks/useClaimHeartbeat'
import type { CurrentPeriodResponse, GameType, TileResponse } from '@/types/api'

interface DailyImageGridProps {
  gameType?: GameType
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

export function DailyImageGrid({ gameType = 'photo', initialData }: DailyImageGridProps) {
  const { t, i18n } = useTranslation()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'
  const { data, isLoading, isError, refetch } = useCurrentPeriodQuery(
    gameType,
    initialData
  )
  const [phaseInfo, setPhaseInfo] = useState<{
    completedPhase: number
    nextPhase: number
    periodCompleted: boolean
  } | null>(null)
  const allClaimedTiles = useGameStore((s) => s.claimedTiles)
  const claimedTiles = allClaimedTiles.filter((c) => c.gameType === gameType)
  const unclaimTile = useGameStore((s) => s.unclaimTile)
  const clearAllClaims = useGameStore((s) => s.clearAllClaims)
  const sessionId = useGameStore((s) => s.sessionId)
  const claimTileLocal = useGameStore((s) => s.claimTile)
  const claimMutation = useClaimTileMutation()
  const [claimError, setClaimError] = useState<string | null>(null)
  useTileEvents(gameType, (info) => {
    setPhaseInfo(info)
    clearAllClaims(gameType)
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
      // legacy local entries may not have claimedAt — assume "old" so cleanup runs
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

  // Page-level heartbeat: runs as long as the user holds a claim, regardless
  // of whether the upload sheet is open. If they go idle for IDLE_PROMPT_MS
  // we surface the "are you still there?" modal; failing to respond stops
  // heartbeats and the backend sweeps the tile.
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
  const tiles = grid?.tiles ?? []
  const imageUrl = data?.period?.image?.image_url
  const promptText = data?.period?.prompt ?? ''
  const isPromptGame = gameType === 'prompt'
  const drawnCount = grid?.drawn_count ?? 0
  const totalTiles = grid?.total_tiles ?? 0

  // Prompt game has no source image, so the canvas-load gate doesn't apply.
  // Derive the gate as truthy whenever there's no image to wait for —
  // sidestepping a setState-in-effect lint violation.
  const imageLoaded = isPromptGame || imageReady

  const today = new Date().toLocaleDateString(i18n.language, {
    month: 'long',
    day: 'numeric',
  })

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
          claimTileLocal(tile.id, claim.expires_at, gameType)
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
    <div className="mx-auto flex w-full max-w-xl flex-col">
      {/* Header strip */}
      <div className="border-foreground flex items-end justify-between gap-4 border-b px-6 py-5">
        <div>
          <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
            {t('game.today')}
          </p>
          <p className="text-foreground mt-1 text-2xl font-black tracking-tight">
            {today}
          </p>
        </div>
        <div className="flex items-end gap-3">
          {totalTiles > 0 && (
            <div className="text-right">
              <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                Drawn
              </p>
              <p className="text-foreground mt-1 font-mono text-2xl font-black tracking-tight">
                {drawnCount}/{totalTiles}
              </p>
            </div>
          )}
          <Link
            href={`/${locale}/archive?game=${gameType}`}
            aria-label={t('nav.archive')}
            className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-10 w-10 shrink-0 items-center justify-center border transition-colors"
          >
            <Archive className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* Prompt callout — only for the prompt game. */}
      {isPromptGame && promptText && (
        <div className="border-foreground/40 mx-6 mt-6 border-2 border-dashed p-5 text-center">
          <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
            Today&apos;s prompt
          </p>
          <p className="text-foreground mt-2 text-xl font-bold tracking-tight">
            “{promptText}”
          </p>
        </div>
      )}

      {/* Image + grid */}
      <div className="px-6 pt-6">
        <div
          className={`border-foreground relative aspect-square w-full overflow-hidden border ${
            isPromptGame ? 'bg-background' : ''
          }`}
        >
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

          {imageUrl && (
            <motion.img
              key={imageUrl}
              ref={setImgRef}
              src={imageUrl}
              alt={t('game.today')}
              className="absolute inset-0 h-full w-full object-cover"
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
        </div>
      </div>

      {/* Hint */}
      <AnimatePresence>
        {imageLoaded && (
          <motion.p
            className="text-muted-foreground px-6 pt-4 text-center text-[10px] font-bold tracking-[0.2em] uppercase"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {t('game.claim_tile')}
          </motion.p>
        )}
      </AnimatePresence>

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
          // Drop the local claim immediately; the network call frees the
          // tile on the backend a touch later.
          const tileId = activeClaim.tileId
          unclaimTile(tileId)
          releaseMutation.mutate({ tileId, sessionId })
          // If the upload sheet was open, close it — the user no longer owns this tile.
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
        prompt={promptText}
        gameType={gameType}
        gridColumns={cols}
        gridRows={rows}
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
}: {
  tile: TileResponse
  isMine: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const isFree = tile.status === 'free'
  const isLocked = tile.status === 'locked'
  const isDrawn = tile.status === 'drawn'
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

  return (
    <motion.button
      className={`relative border transition-colors focus:outline-none ${cursorClass} ${
        isFree
          ? disabled
            ? 'border-foreground/10'
            : 'border-foreground/20'
          : isMine && isLocked
            ? 'border-foreground border-2'
            : isLocked
              ? 'border-foreground/40'
              : 'border-foreground/30'
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
      disabled={(!isFree && !isMine) || (isFree && disabled)}
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
