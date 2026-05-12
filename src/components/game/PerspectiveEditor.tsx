'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { warpPerspective, type Quad } from '@/lib/perspective'
import { TileNeighborhood } from '@/components/game/TileNeighborhood'
import { TilePreview } from '@/components/game/TilePreview'
import type { TileResponse } from '@/types/api'

interface PerspectiveEditorProps {
  imageSrc: string
  imageUrl?: string
  gridColumns: number
  gridRows: number
  row: number
  col: number
  /** All tiles in the current phase — feeds the neighbourhood preview. */
  tiles: TileResponse[]
  /** "Apply" returns a flattened, square JPEG Blob. */
  onConfirm: (blob: Blob) => void
  onCancel: () => void
  busy?: boolean
}

const HANDLE_HALF = 14 // half the visible handle size in CSS pixels
const OUTPUT_SIZE = 1024 // square px of the warped output
const MIN_ZOOM = 1
const MAX_ZOOM = 4

/**
 * Single-step editor: drag the four corners over the drawing's edges, with
 * zoom + pan on the photo and a ghost-reference clipped into the quad shape
 * so the user can match colour and orientation. On apply we warp the
 * quadrilateral into a square JPEG (a homography flattens whatever angle
 * the photo was taken at).
 */
export function PerspectiveEditor({
  imageSrc,
  imageUrl,
  gridColumns,
  gridRows,
  row,
  col,
  tiles,
  onConfirm,
  onCancel,
  busy = false,
}: PerspectiveEditorProps) {
  const { t } = useTranslation()
  const frameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [aspect, setAspect] = useState<number>(1)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  // Corner positions as fractions of the displayed image (TL, TR, BR, BL).
  // Initialized after the image loads.
  const [pts, setPts] = useState<Quad | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [working, setWorking] = useState(false)

  // View transform: zoom + pan around the image. tx/ty are in pixels of the
  // outer frame; scale is multiplicative.
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [overlay, setOverlay] = useState(0)
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)

  const handleImgLoad = () => {
    const img = imgRef.current
    if (!img) return
    setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    setAspect(img.naturalWidth / img.naturalHeight)
    // Default: a small inset square so handles are visible and easy to grab.
    const inset = 0.08
    setPts([
      { x: inset, y: inset },
      { x: 1 - inset, y: inset },
      { x: 1 - inset, y: 1 - inset },
      { x: inset, y: 1 - inset },
    ])
  }

  // Clamp pan so the image can't be dragged completely out of view.
  const clampPan = useCallback((s: number, x: number, y: number) => {
    const f = frameRef.current
    if (!f) return { tx: x, ty: y }
    const maxX = ((s - 1) / 2) * f.clientWidth
    const maxY = ((s - 1) / 2) * f.clientHeight
    return {
      tx: Math.max(-maxX, Math.min(maxX, x)),
      ty: Math.max(-maxY, Math.min(maxY, y)),
    }
  }, [])

  // Pointer-based corner drag — coords are read off the (transformed) image
  // rect so they remain 0..1 regardless of zoom/pan.
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

  // Pan when the user drags on the photo background (i.e. not on a handle).
  // Only active when zoomed in — a 1× view has nowhere to pan to.
  const onFramePointerDown = (e: ReactPointerEvent) => {
    if (zoom <= MIN_ZOOM + 0.001) return
    panStart.current = { x: e.clientX, y: e.clientY, tx, ty }
  }

  const onFramePointerMove = (e: ReactPointerEvent) => {
    if (!panStart.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    const c = clampPan(zoom, panStart.current.tx + dx, panStart.current.ty + dy)
    setTx(c.tx)
    setTy(c.ty)
  }

  const onFramePointerUp = () => {
    panStart.current = null
  }

  // Pinch on a trackpad surfaces as ctrl/cmd-wheel — intercept to zoom into
  // the focal point. Plain wheel still scrolls the page.
  const onWheel = (e: ReactWheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const factor = Math.exp(-e.deltaY * 0.01)
    applyZoom(zoom * factor, { x: e.clientX, y: e.clientY })
  }

  const applyZoom = (target: number, focal?: { x: number; y: number }) => {
    const s1 = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, target))
    const f = frameRef.current
    let x1 = tx
    let y1 = ty
    if (focal && f) {
      const rect = f.getBoundingClientRect()
      const fx = focal.x - rect.left - rect.width / 2
      const fy = focal.y - rect.top - rect.height / 2
      x1 = fx - ((fx - tx) * s1) / zoom
      y1 = fy - ((fy - ty) * s1) / zoom
    } else if (s1 === MIN_ZOOM) {
      x1 = 0
      y1 = 0
    }
    const c = clampPan(s1, x1, y1)
    setZoom(s1)
    setTx(c.tx)
    setTy(c.ty)
  }

  const handleApply = async () => {
    const img = imgRef.current
    if (!img || !pts || !natural) return
    setWorking(true)
    try {
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
  const clipPath =
    pts && pts.length === 4
      ? `polygon(${pts.map((p) => `${p.x * 100}% ${p.y * 100}%`).join(', ')})`
      : undefined

  return (
    <div className="space-y-4 md:grid md:grid-cols-[1fr_19rem] md:gap-6 md:space-y-0">
      {/* Photo — left column on md+, top on mobile. */}
      <div className="md:col-start-1 md:row-start-1">
        <div
          ref={frameRef}
          className="border-foreground bg-background relative mx-auto w-full touch-none overflow-hidden border-2 md:max-h-[70vh]"
          style={{ aspectRatio: aspect }}
          onPointerDown={onFramePointerDown}
          onPointerMove={onFramePointerMove}
          onPointerUp={onFramePointerUp}
          onPointerCancel={onFramePointerUp}
          onWheel={onWheel}
        >
          <div
            ref={innerRef}
            className="absolute inset-0"
            style={{
              transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt=""
              onLoad={handleImgLoad}
              className="absolute inset-0 h-full w-full object-contain select-none"
              draggable={false}
            />

            {/* Reference ghost — clipped to the quad shape so the user can see
                roughly where each part of the target tile should end up. */}
            {clipPath && overlay > 0 && imageUrl && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ clipPath, opacity: overlay }}
              >
                <TilePreview
                  imageUrl={imageUrl}
                  gridColumns={gridColumns}
                  gridRows={gridRows}
                  row={row}
                  col={col}
                  className="h-full w-full"
                />
              </div>
            )}

            {/* SVG outline of the quad. */}
            {pts && (
              <svg
                className="text-foreground pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <polygon
                  points={pts.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
                  fill="currentColor"
                  fillOpacity={0.08}
                  stroke="currentColor"
                  strokeWidth="0.4"
                  vectorEffect="non-scaling-stroke"
                />
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
                      fill="currentColor"
                      vectorEffect="non-scaling-stroke"
                    />
                  )
                })}
              </svg>
            )}

            {/* Corner handles. */}
            {pts &&
              pts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Corner ${i + 1}`}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
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
        </div>
      </div>

      {/* Sidebar — right column on md+, below photo on mobile. */}
      <div className="space-y-4 md:col-start-2 md:row-start-1">
        <div>
          <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-[0.2em] uppercase">
            {t('perspective.title')}
          </p>
          <p className="text-muted-foreground mb-3 text-[11px] tracking-[0.05em]">
            {t('perspective.hint')}
          </p>

          <TileNeighborhood
            imageUrl={imageUrl}
            tiles={tiles}
            gridColumns={gridColumns}
            gridRows={gridRows}
            row={row}
            col={col}
            className="mx-auto w-36 md:mx-0 md:w-full"
          />
        </div>

        <SliderRow
          label={t('crop.zoom')}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(v) => applyZoom(v)}
        />
        <SliderRow
          label={t('crop.overlay')}
          min={0}
          max={1}
          step={0.01}
          value={overlay}
          onChange={setOverlay}
        />

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={busyLocal}
            className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-14 items-center justify-center border text-sm font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-30"
          >
            {t('perspective.cancel')}
          </button>
          <button
            onClick={handleApply}
            disabled={busyLocal || !pts}
            className="bg-foreground text-background hover:bg-foreground/90 flex h-14 items-center justify-center text-sm font-bold tracking-[0.2em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-30"
          >
            {busyLocal ? '...' : t('perspective.apply')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-2 block text-[10px] font-bold tracking-[0.2em] uppercase">
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-foreground/20 h-1 w-full cursor-pointer appearance-none accent-current"
      />
    </div>
  )
}

function clamp01(x: number) {
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}
