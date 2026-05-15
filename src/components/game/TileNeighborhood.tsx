'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { TilePreview } from '@/components/game/TilePreview'
import type { TileResponse } from '@/types/api'

interface TileNeighborhoodProps {
  imageUrl?: string
  tiles: TileResponse[]
  gridColumns: number
  gridRows: number
  row: number
  col: number
  /** Radius — 1 means a 3×3 view, 2 means 5×5, etc. */
  radius?: number
  className?: string
  /** Prompt mode shows a "work in progress" placeholder in the center cell. */
  promptMode?: boolean
}

/**
 * Target tile sharp in the centre, surrounded by a blurry halo of neighbours
 * so the user can match colours and edges with adjacent drawings while they
 * work. Drawn neighbours show the actual submission; undrawn neighbours fall
 * back to the reference photo (photo mode) or a muted placeholder (prompt
 * mode); out-of-bounds cells are dimmed.
 */
export function TileNeighborhood({
  imageUrl,
  tiles,
  gridColumns,
  gridRows,
  row,
  col,
  radius = 1,
  className = '',
  promptMode = false,
}: TileNeighborhoodProps) {
  const { t } = useTranslation()
  const byPos = new Map<string, TileResponse>()
  for (const t of tiles) byPos.set(`${t.row},${t.col}`, t)
  const side = 2 * radius + 1

  const cells: Array<{
    r: number
    c: number
    isCenter: boolean
    tile?: TileResponse
  }> = []
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const r = row + dr
      const c = col + dc
      cells.push({
        r,
        c,
        isCenter: dr === 0 && dc === 0,
        tile: byPos.get(`${r},${c}`),
      })
    }
  }

  return (
    <div
      className={`grid select-none ${className}`}
      style={{ gridTemplateColumns: `repeat(${side}, 1fr)` }}
    >
      {cells.map(({ r, c, isCenter, tile }, i) => {
        const inBounds = r >= 0 && r < gridRows && c >= 0 && c < gridColumns
        const drawn = tile?.status === 'drawn' && tile?.image_url
        return (
          <div
            key={i}
            className={`relative aspect-square overflow-hidden ${
              isCenter
                ? 'border-foreground z-10 border-2'
                : 'border-foreground/15 border opacity-65'
            }`}
          >
            {!inBounds ? (
              <div className="bg-foreground/5 absolute inset-0" />
            ) : isCenter ? (
              promptMode ? (
                <WorkInProgressCell label={t('upload.work_in_progress')} />
              ) : imageUrl ? (
                <div className="absolute inset-0">
                  <TilePreview
                    imageUrl={imageUrl}
                    gridColumns={gridColumns}
                    gridRows={gridRows}
                    row={r}
                    col={c}
                    className="h-full w-full"
                  />
                </div>
              ) : (
                <div className="bg-background absolute inset-0" />
              )
            ) : drawn && tile?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tile.image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
            ) : imageUrl ? (
              <div className="absolute inset-0">
                <TilePreview
                  imageUrl={imageUrl}
                  gridColumns={gridColumns}
                  gridRows={gridRows}
                  row={r}
                  col={c}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="bg-foreground/5 absolute inset-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Long, tangled scribble paths. Each one rolls/unrolls differently because the
// curves chain in their own direction, so picking a random one each mount keeps
// repeat viewings from feeling mechanical.
const SCRIBBLE_PATHS = [
  // 0 — dense central knot that spirals outward then back in
  'M 30 8 C 16 8, 8 22, 18 30 S 44 30, 44 16 S 22 6, 12 18 S 8 44, 30 48 S 52 38, 50 18 S 30 2, 14 14 S 6 40, 22 46 S 48 46, 50 28 S 38 6, 20 14 S 10 34, 26 40 S 44 36, 42 22 S 28 12, 22 22 S 26 36, 36 34 S 44 22, 36 16',
  // 1 — flatter loops, more horizontal sway
  'M 8 30 C 14 18, 28 14, 34 24 S 50 32, 46 18 S 24 8, 16 22 S 18 44, 36 42 S 52 28, 44 16 S 22 12, 14 26 S 12 46, 32 48 S 52 42, 50 24 S 36 8, 20 16 S 8 32, 24 40 S 46 38, 44 24 S 32 16, 22 24 S 22 34, 34 34',
  // 2 — vertical-leaning oval coils
  'M 30 6 C 22 8, 14 16, 18 26 S 38 32, 40 20 S 24 12, 18 22 S 16 38, 30 42 S 48 36, 46 22 S 30 8, 16 18 S 10 38, 26 46 S 48 42, 48 26 S 36 10, 22 18 S 14 32, 28 36 S 42 30, 38 20 S 24 16, 22 26 S 30 36, 38 32 S 40 22, 32 18',
  // 3 — looser figure-eight with extra wandering
  'M 12 24 C 18 12, 32 12, 36 22 S 52 30, 46 18 S 22 12, 16 24 S 18 42, 36 40 S 50 28, 42 18 S 22 18, 18 30 S 26 46, 42 42 S 52 32, 46 20 S 28 8, 18 20 S 12 38, 28 44 S 46 40, 42 26 S 28 18, 22 28 S 32 38, 38 32',
]

function WorkInProgressCell({ label }: { label: string }) {
  // Pick a path once per mount. Re-mounting (e.g. closing/reopening the
  // upload sheet) shuffles it, so the user sees variety without it twitching
  // mid-animation.
  const [pathIndex] = useState(() => Math.floor(Math.random() * SCRIBBLE_PATHS.length))
  const [duration] = useState(() => 5 + Math.random() * 2.5)
  const [direction] = useState(() => (Math.random() < 0.5 ? 1 : -1))

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-300">
      <svg
        viewBox="0 0 60 60"
        className="h-12 w-12 text-zinc-800 sm:h-14 sm:w-14"
        aria-hidden="true"
        style={{ transform: `scaleX(${direction})` }}
      >
        <motion.path
          d={SCRIBBLE_PATHS[pathIndex]}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 1, 0] }}
          transition={{
            duration,
            times: [0, 0.45, 0.55, 1],
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </svg>
      <span className="text-xs text-zinc-700 sm:text-sm">{label}</span>
    </div>
  )
}
