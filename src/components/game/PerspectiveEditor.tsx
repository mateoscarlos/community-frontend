'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { warpPerspective, type Quad } from '@/lib/perspective'
import { TilePreview } from '@/components/game/TilePreview'

interface PerspectiveEditorProps {
  imageSrc: string
  imageUrl?: string
  gridColumns: number
  gridRows: number
  row: number
  col: number
  /** "Apply" returns a flattened, square JPEG Blob. */
  onConfirm: (blob: Blob) => void
  onSkip: () => void
  onCancel: () => void
  busy?: boolean
}

const HANDLE_HALF = 14 // half the visible handle size in CSS pixels
const OUTPUT_SIZE = 1024 // square px of the warped output

/**
 * Drag the four corners to outline the actual edges of the drawing in the
 * photo. On apply we compute a homography that flattens that quadrilateral
 * into a square — useful when the photo was taken at an angle.
 *
 * Coords: handles are stored as percentages of the displayed image area
 * (0..1 each axis). On apply we scale them to the source image's natural
 * pixel dimensions and feed them to warpPerspective.
 */
export function PerspectiveEditor({
  imageSrc,
  imageUrl,
  gridColumns,
  gridRows,
  row,
  col,
  onConfirm,
  onSkip,
  onCancel,
  busy = false,
}: PerspectiveEditorProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgRect, setImgRect] = useState<DOMRect | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  // Corner positions as fractions of the displayed image (TL, TR, BR, BL).
  // Initialized after the image loads.
  const [pts, setPts] = useState<Quad | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [working, setWorking] = useState(false)

  // Track image load + size to position handles correctly.
  const handleImgLoad = () => {
    const img = imgRef.current
    const container = containerRef.current
    if (!img || !container) return
    setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    setImgRect(img.getBoundingClientRect())
    // Default: a small inset square so handles are visible and easy to grab.
    const inset = 0.08
    setPts([
      { x: inset, y: inset },
      { x: 1 - inset, y: inset },
      { x: 1 - inset, y: 1 - inset },
      { x: inset, y: 1 - inset },
    ])
  }

  // Recompute image rect on resize so handle positioning stays accurate.
  useEffect(() => {
    const onResize = () => {
      if (imgRef.current) setImgRect(imgRef.current.getBoundingClientRect())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Pointer-based drag (covers mouse + touch).
  useEffect(() => {
    if (dragging === null) return
    const onMove = (e: PointerEvent) => {
      const img = imgRef.current
      if (!img) return
      const rect = img.getBoundingClientRect()
      const fx = clamp01((e.clientX - rect.left) / rect.width)
      const fy = clamp01((e.clientY - rect.top) / rect.height)
      setPts((prev) => {
        if (!prev) return prev
        const next = [...prev] as Quad
        next[dragging] = { x: fx, y: fy }
        return next
      })
    }
    const onUp = () => setDragging(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging])

  const handleApply = async () => {
    const img = imgRef.current
    if (!img || !pts || !natural) return
    setWorking(true)
    try {
      // Scale points from display fractions to source pixel coordinates.
      const srcQuad: Quad = pts.map((p) => ({
        x: p.x * natural.w,
        y: p.y * natural.h,
      })) as Quad
      const blob = await warpPerspective(img, srcQuad, OUTPUT_SIZE)
      onConfirm(blob)
    } catch (err) {
      console.error('warp failed', err)
      setWorking(false)
    }
  }

  const busyLocal = busy || working

  return (
    <div className="space-y-4">
      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-[0.2em] uppercase">
          {t('perspective.title')}
        </p>
        <p className="text-muted-foreground mb-3 text-[11px] tracking-[0.05em]">
          {t('perspective.hint')}
        </p>

        {/* Reference up top, small. */}
        <TilePreview
          imageUrl={imageUrl}
          gridColumns={gridColumns}
          gridRows={gridRows}
          row={row}
          col={col}
          className="border-foreground mx-auto mb-3 aspect-square w-24 border md:w-28"
        />
      </div>

      {/* Photo with draggable corner handles. */}
      <div
        ref={containerRef}
        className="border-foreground bg-background relative w-full overflow-hidden border-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageSrc}
          alt=""
          onLoad={handleImgLoad}
          className="block w-full select-none"
          draggable={false}
        />

        {/* SVG outline + handles overlay. */}
        {pts && imgRect && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polygon
              points={pts.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
              fill="rgba(255,255,255,0.10)"
              stroke="white"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
            />
            {/* Edge midpoint cross-hairs help eyeballing alignment. */}
            {pts.map((_, i) => {
              const a = pts[i]
              const b = pts[(i + 1) % 4]
              const mx = ((a.x + b.x) / 2) * 100
              const my = ((a.y + b.y) / 2) * 100
              return (
                <circle
                  key={`mid-${i}`}
                  cx={mx}
                  cy={my}
                  r={0.6}
                  fill="white"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </svg>
        )}

        {pts &&
          pts.map((p, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Corner ${i + 1}`}
              onPointerDown={(e) => {
                e.preventDefault()
                ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                setDragging(i)
              }}
              className="border-foreground bg-background absolute z-10 touch-none rounded-full border-2"
              style={{
                left: `calc(${p.x * 100}% - ${HANDLE_HALF}px)`,
                top: `calc(${p.y * 100}% - ${HANDLE_HALF}px)`,
                width: HANDLE_HALF * 2,
                height: HANDLE_HALF * 2,
              }}
            />
          ))}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2">
        <button
          onClick={onCancel}
          disabled={busyLocal}
          className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-12 items-center justify-center border text-[11px] font-bold tracking-[0.15em] uppercase transition-all disabled:opacity-30"
        >
          {t('perspective.cancel')}
        </button>
        <button
          onClick={onSkip}
          disabled={busyLocal}
          className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-12 items-center justify-center border border-dashed text-[11px] font-bold tracking-[0.15em] uppercase transition-all disabled:opacity-30"
        >
          {t('perspective.skip')}
        </button>
        <button
          onClick={handleApply}
          disabled={busyLocal || !pts}
          className="bg-foreground text-background hover:bg-foreground/90 flex h-12 items-center justify-center text-[11px] font-bold tracking-[0.15em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busyLocal ? '...' : t('perspective.apply')}
        </button>
      </div>
    </div>
  )
}

function clamp01(x: number) {
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}
