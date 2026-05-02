'use client'

interface TilePreviewProps {
  imageUrl?: string
  gridColumns: number
  gridRows: number
  row: number
  col: number
  className?: string
}

/**
 * Renders the user's specific tile crop of the daily image.
 *
 * Implementation: a square viewport with the full image positioned inside,
 * scaled up by the grid factor and offset so only the (row, col) cell is
 * visible. No image manipulation or extra HTTP requests — just CSS.
 */
export function TilePreview({
  imageUrl,
  gridColumns,
  gridRows,
  row,
  col,
  className = '',
}: TilePreviewProps) {
  if (!imageUrl) {
    return <div className={`bg-foreground/10 ${className}`} />
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="absolute"
        style={{
          width: `${gridColumns * 100}%`,
          height: `${gridRows * 100}%`,
          left: `-${col * 100}%`,
          top: `-${row * 100}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
    </div>
  )
}
