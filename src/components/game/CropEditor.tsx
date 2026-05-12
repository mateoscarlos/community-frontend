'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import { TilePreview } from '@/components/game/TilePreview'
import { TileNeighborhood } from '@/components/game/TileNeighborhood'
import type { TileResponse } from '@/types/api'

interface CropEditorProps {
  /** Object URL or data URL of the user's photo. */
  imageSrc: string
  /** Original tile context — shown as the reference they're trying to match. */
  imageUrl?: string
  gridColumns: number
  gridRows: number
  row: number
  col: number
  /** All tiles in the current phase — feeds the neighbourhood preview. */
  tiles: TileResponse[]
  onCancel: () => void
  /** Returns the final crop region in source-image pixel coordinates. */
  onConfirm: (area: Area) => void
  /** Disables buttons while the parent is uploading. */
  busy?: boolean
}

/**
 * Pan + pinch/scroll-zoom on the user's photo with a square crop overlay.
 * Two matching aids: a side-by-side live preview of the cropped output next
 * to the reference tile, and an opacity slider that ghosts the reference
 * over the cropper for pixel-by-pixel alignment.
 */
export function CropEditor({
  imageSrc,
  imageUrl,
  gridColumns,
  gridRows,
  row,
  col,
  tiles,
  onCancel,
  onConfirm,
  busy = false,
}: CropEditorProps) {
  const { t } = useTranslation()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [overlay, setOverlay] = useState(0) // 0..1 reference opacity over cropper
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels)
  }, [])

  return (
    <div className="space-y-4">
      {/* Side-by-side: reference vs live preview of the cropped output. */}
      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-[0.2em] uppercase">
          {t('crop.compare')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-muted-foreground mb-1 text-center text-[9px] tracking-[0.2em] uppercase">
              {t('crop.reference')}
            </p>
            <TileNeighborhood
              imageUrl={imageUrl}
              tiles={tiles}
              gridColumns={gridColumns}
              gridRows={gridRows}
              row={row}
              col={col}
              className="w-full"
            />
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-center text-[9px] tracking-[0.2em] uppercase">
              {t('crop.your_photo')}
            </p>
            <LivePreview imageSrc={imageSrc} area={croppedArea} />
          </div>
        </div>
      </div>

      {/* The cropper, with optional ghost overlay of the reference. */}
      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-[0.2em] uppercase">
          {t('crop.adjust')}
        </p>
        <div className="border-foreground bg-background relative aspect-square w-full overflow-hidden border-2">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            objectFit="contain"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            classes={{ containerClassName: 'bg-foreground/10' }}
          />
          {/* Reference ghost: matches the cropper's square footprint. Sits
              above the cropper with pointer-events:none so gestures still
              reach the cropper underneath. */}
          {overlay > 0 && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{ opacity: overlay }}
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
        </div>
      </div>

      {/* Sliders. */}
      <div className="space-y-3">
        <SliderRow
          label={t('crop.zoom')}
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={setZoom}
        />
        <SliderRow
          label={t('crop.overlay')}
          min={0}
          max={1}
          step={0.01}
          value={overlay}
          onChange={setOverlay}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={busy}
          className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-14 items-center justify-center border text-sm font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-30"
        >
          {t('crop.retake')}
        </button>
        <button
          onClick={() => croppedArea && onConfirm(croppedArea)}
          disabled={busy || !croppedArea}
          className="bg-foreground text-background hover:bg-foreground/90 flex h-14 items-center justify-center text-sm font-bold tracking-[0.2em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy ? '...' : t('crop.confirm')}
        </button>
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

/**
 * Square canvas that shows what the cropped output will look like. Updates
 * whenever the cropped area changes. Loads the source image once.
 */
function LivePreview({ imageSrc, area }: { imageSrc: string; area: Area | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const i = new Image()
    i.crossOrigin = 'anonymous'
    i.onload = () => setImg(i)
    i.src = imageSrc
  }, [imageSrc])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img || !area) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(
      img,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      canvas.width,
      canvas.height
    )
  }, [img, area])

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={256}
      className="border-foreground bg-foreground/5 aspect-square w-full border"
    />
  )
}
