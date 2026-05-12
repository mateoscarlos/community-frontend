'use client'

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
}: TileNeighborhoodProps) {
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
              isCenter ? 'border-foreground z-10 border-2' : 'border-foreground/15 border'
            }`}
          >
            {!inBounds ? (
              <div className="bg-foreground/5 absolute inset-0" />
            ) : isCenter ? (
              imageUrl ? (
                <TilePreview
                  imageUrl={imageUrl}
                  gridColumns={gridColumns}
                  gridRows={gridRows}
                  row={r}
                  col={c}
                  className="absolute inset-0"
                />
              ) : (
                <div className="bg-background absolute inset-0" />
              )
            ) : drawn && tile?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tile.image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: 'blur(3px) brightness(0.85)' }}
                draggable={false}
              />
            ) : imageUrl ? (
              <div
                className="absolute inset-0"
                style={{ filter: 'blur(4px) brightness(0.55)' }}
              >
                <TilePreview
                  imageUrl={imageUrl}
                  gridColumns={gridColumns}
                  gridRows={gridRows}
                  row={r}
                  col={c}
                  className="absolute inset-0"
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
