'use client'

import { useA11yStore } from '@/lib/store/a11y.store'

/**
 * A thin filled band around the entire viewport — same hand-drawn wobble as
 * SketchyBox, but the frame itself is painted (not stroked). Fixed position,
 * pointer-events-none, sits above content.
 *
 * Two subpaths in a single path element:
 *   - Outer: hugs the viewport edge with a slight wobble
 *   - Inner: same wobble shrunk a hair — cut out via evenodd fill so only the
 *     ring between them paints
 *
 * The viewBox stretches non-uniformly to fit the window, so the band's on-
 * screen thickness follows the aspect ratio (a wide window makes it a bit
 * fatter horizontally). That's fine — the wobble already reads as hand-
 * drawn, not laser-cut.
 *
 * Hidden in a11y mode: decorative-only, no semantic value.
 */
const OUTER =
  'M 6 8 Q 250 2, 500 6 T 993 5 Q 997 250, 994 500 T 995 994 Q 700 998, 500 994 T 5 995 Q 2 700, 7 500 T 6 8 Z'
const INNER =
  'M 18 20 Q 250 15, 500 18 T 981 17 Q 984 250, 982 500 T 983 982 Q 700 985, 500 982 T 18 983 Q 15 700, 19 500 T 18 20 Z'

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
      <path d={`${OUTER} ${INNER}`} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}
