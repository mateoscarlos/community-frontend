// Pre-traced hand-drawn rectangles. Each variant has its own wobble, corner
// angle, and edge sag so a row of them doesn't read as identical stamps.
// All paths target a 200×80 viewBox; the SVG stretches via preserveAspectRatio.
const PATHS = [
  // 0 — slightly tilted, sagging bottom, sharp top-right corner
  'M 7 11 Q 60 5 110 9 T 194 6 Q 199 30 196 68 Q 130 76 80 73 T 5 71 Q 3 40 7 11 Z',
  // 1 — bowed top, narrower left side, rounded corners
  'M 10 7 Q 70 14 130 8 T 197 12 Q 194 38 198 72 Q 140 70 80 75 T 6 70 Q 8 38 10 7 Z',
  // 2 — pinched middle, asymmetric corners, taller on the right
  'M 4 14 Q 50 6 100 12 T 196 9 Q 200 35 193 74 Q 145 68 90 73 T 10 76 Q 6 42 4 14 Z',
  // 3 — gentle parallelogram lean, soft wobble
  'M 12 6 Q 60 11 115 7 T 192 10 Q 197 32 194 68 Q 135 73 75 70 T 8 74 Q 5 36 12 6 Z',
] as const

export interface SketchyBoxProps {
  variant?: number
  strokeWidth?: number
  className?: string
}

export function SketchyBox({
  variant = 0,
  strokeWidth = 2.5,
  className,
}: SketchyBoxProps) {
  const d = PATHS[variant % PATHS.length]
  return (
    <svg
      viewBox="0 0 200 80"
      preserveAspectRatio="none"
      className={`absolute inset-0 h-full w-full ${className ?? ''}`}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
