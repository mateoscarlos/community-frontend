'use client'

interface ModalCloseButtonProps {
  onClick: () => void
  ariaLabel: string
  /** Color for the X strokes — defaults to a dark zinc, suitable for the
   *  paper-gray modal background. */
  color?: string
}

/**
 * Reusable close button for modals. Draws a wobbly hand-drawn × with two
 * slightly curved strokes so the icon matches the Schoolbell aesthetic. The
 * button itself inherits the global click cursor (no inline override).
 */
export function ModalCloseButton({
  onClick,
  ariaLabel,
  color = 'currentColor',
}: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="absolute top-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition-colors hover:bg-black/10 hover:text-black focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
    >
      <HandDrawnX color={color} />
    </button>
  )
}

function HandDrawnX({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* Two slightly wobbly diagonal strokes — the curve control points are
          offset from the straight line to give the cross a hand-drawn lean. */}
      <path
        d="M 5 4 C 10 9, 14 14, 19 20"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M 19 4 C 14 9, 10 14, 5 20"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
