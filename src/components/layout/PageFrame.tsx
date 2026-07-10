'use client'

import { useA11yStore } from '@/lib/store/a11y.store'

/**
 * A subtle hand-drawn frame around the entire viewport — same aesthetic as
 * SketchyBox, sized to the window instead of a specific element. Fixed
 * position, pointer-events-none, sits above content so it always reads as a
 * frame around whatever's on screen.
 *
 * The path is traced in a 1000×1000 viewBox and stretched with
 * preserveAspectRatio="none" so it fits any window shape without re-cutting
 * the corners.
 *
 * Hidden in a11y mode: decorative-only, no semantic value.
 */
const FRAME_PATH =
  'M 18 22 Q 250 8, 500 14 T 984 12 Q 990 250, 986 500 T 990 986 Q 700 992, 500 988 T 12 990 Q 8 700, 14 500 T 18 22 Z'

export function PageFrame() {
  const a11y = useA11yStore((s) => s.enabled)
  if (a11y) return null

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      className="text-foreground pointer-events-none fixed inset-0 z-40 h-dvh w-dvw"
    >
      <path
        d={FRAME_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
