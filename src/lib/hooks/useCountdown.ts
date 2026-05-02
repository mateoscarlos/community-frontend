'use client'

import { useEffect, useState } from 'react'

/**
 * Returns the number of seconds remaining until `expiresAt` (clamped to >= 0),
 * updating every second. Pass null when no countdown is active.
 *
 * Implementation note: we tick a `now` clock instead of repeatedly setting a
 * derived `secondsLeft`. Lets the new-react-hooks `set-state-in-effect` rule
 * pass — the only setState happens inside the interval callback, not during
 * effect setup.
 */
export function useCountdown(expiresAt: string | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (!expiresAt) return 0
  const ms = new Date(expiresAt).getTime() - now
  return Math.max(0, Math.floor(ms / 1000))
}

/** mm:ss formatter for display. */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
