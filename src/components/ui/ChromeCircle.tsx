'use client'

import { useA11yStore } from '@/lib/store/a11y.store'

/**
 * The hand-drawn circle outline behind the fixed chrome buttons (Back / Home
 * / Settings). In accessibility mode it becomes a crisp, regular circle.
 * Absolutely fills its (relative) parent.
 */
export function ChromeCircle() {
  const a11y = useA11yStore((s) => s.enabled)

  if (a11y) {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full border-2 border-current"
      />
    )
  }

  return (
    <svg
      viewBox="0 0 60 60"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <path
        d="M 30 6 C 14 6, 6 18, 6 30 C 6 44, 16 54, 30 54 C 46 54, 54 42, 54 28 C 54 14, 44 5, 30 6 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
