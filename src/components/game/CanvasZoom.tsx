'use client'

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { Plus, Minus, RotateCcw } from 'lucide-react'

const MIN_SCALE = 1
const MAX_SCALE = 6
const STEP = 1.6
// Pixels of pointer movement that promotes a tap into a pan — anything below
// this still counts as a click on the underlying tile button.
const PAN_THRESHOLD = 6

interface CanvasZoomProps {
  children: ReactNode
}

interface PointerPos {
  x: number
  y: number
}

export function CanvasZoom({ children }: CanvasZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scale = useMotionValue(1)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [zoomed, setZoomed] = useState(false)
  const [atMax, setAtMax] = useState(false)

  const pointers = useRef<Map<number, PointerPos>>(new Map())
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null)
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const moved = useRef(false)

  const clampTranslate = (s: number, tx: number, ty: number) => {
    const c = containerRef.current
    if (!c) return { tx, ty }
    const maxX = ((s - 1) / 2) * c.clientWidth
    const maxY = ((s - 1) / 2) * c.clientHeight
    return {
      tx: Math.max(-maxX, Math.min(maxX, tx)),
      ty: Math.max(-maxY, Math.min(maxY, ty)),
    }
  }

  // Apply a new scale while keeping `focal` (viewport coords) fixed on screen.
  const applyZoom = (target: number, focal?: PointerPos, animated = false) => {
    const s1 = Math.max(MIN_SCALE, Math.min(MAX_SCALE, target))
    const s0 = scale.get()
    const tx0 = x.get()
    const ty0 = y.get()

    let tx1 = tx0
    let ty1 = ty0
    const c = containerRef.current
    if (focal && c) {
      const rect = c.getBoundingClientRect()
      const fx = focal.x - rect.left - rect.width / 2
      const fy = focal.y - rect.top - rect.height / 2
      tx1 = fx - (s1 * (fx - tx0)) / s0
      ty1 = fy - (s1 * (fy - ty0)) / s0
    } else if (s1 === MIN_SCALE) {
      tx1 = 0
      ty1 = 0
    }

    const clamped = clampTranslate(s1, tx1, ty1)
    if (animated) {
      const opts = { type: 'spring' as const, stiffness: 320, damping: 32 }
      animate(scale, s1, opts)
      animate(x, clamped.tx, opts)
      animate(y, clamped.ty, opts)
    } else {
      scale.set(s1)
      x.set(clamped.tx)
      y.set(clamped.ty)
    }
    setZoomed(s1 > MIN_SCALE + 0.01)
    setAtMax(s1 >= MAX_SCALE - 0.01)
  }

  const zoomIn = () => applyZoom(scale.get() * STEP, undefined, true)
  const zoomOut = () => applyZoom(scale.get() / STEP, undefined, true)
  const reset = () => applyZoom(MIN_SCALE, undefined, true)

  const onWheel = (e: ReactWheelEvent) => {
    // Only intercept the wheel when the user is explicitly pinch-zooming
    // (trackpad pinch surfaces as ctrlKey on most browsers) — otherwise let
    // the page scroll naturally.
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const factor = Math.exp(-e.deltaY * 0.01)
    applyZoom(scale.get() * factor, { x: e.clientX, y: e.clientY })
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values())
      pinchStart.current = {
        dist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
        scale: scale.get(),
      }
      panStart.current = null
      moved.current = true
    } else if (pointers.current.size === 1 && zoomed) {
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: x.get(),
        ty: y.get(),
      }
      moved.current = false
    } else {
      moved.current = false
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [p1, p2] = Array.from(pointers.current.values()).slice(0, 2)
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      const target = pinchStart.current.scale * (dist / pinchStart.current.dist)
      applyZoom(target, { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 })
      moved.current = true
      return
    }

    if (pointers.current.size === 1 && panStart.current) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      if (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD) {
        moved.current = true
      }
      if (!moved.current) return
      const clamped = clampTranslate(
        scale.get(),
        panStart.current.tx + dx,
        panStart.current.ty + dy
      )
      x.set(clamped.tx)
      y.set(clamped.ty)
    }
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchStart.current = null
    if (pointers.current.size === 0) panStart.current = null
  }

  // If a pan happened, swallow the click so the underlying tile button doesn't fire.
  const onClickCapture = (e: ReactMouseEvent) => {
    if (moved.current) {
      e.stopPropagation()
      e.preventDefault()
      moved.current = false
    }
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none select-none"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      <motion.div
        className="absolute inset-0"
        style={{ x, y, scale, transformOrigin: 'center center' }}
      >
        {children}
      </motion.div>

      <div className="pointer-events-none absolute right-2 bottom-2 z-20 flex flex-col gap-1">
        <ZoomButton onClick={zoomIn} disabled={atMax} label="Zoom in">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </ZoomButton>
        <ZoomButton onClick={zoomOut} disabled={!zoomed} label="Zoom out">
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </ZoomButton>
        {zoomed && (
          <ZoomButton onClick={reset} label="Reset zoom">
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} />
          </ZoomButton>
        )}
      </div>
    </div>
  )
}

function ZoomButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="border-foreground bg-background/85 text-foreground hover:bg-foreground hover:text-background disabled:hover:bg-background/85 disabled:hover:text-foreground pointer-events-auto flex h-8 w-8 items-center justify-center border backdrop-blur transition-colors disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  )
}
