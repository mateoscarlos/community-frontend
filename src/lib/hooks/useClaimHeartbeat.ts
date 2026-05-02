'use client'

import { useEffect, useRef, useState } from 'react'
import { useHeartbeatClaimMutation } from '@/lib/query/claim.queries'

const HEARTBEAT_INTERVAL_MS = 30_000

/**
 * Pings the backend every 30 seconds with `last_heartbeat_at = now()` so the
 * sweep doesn't free the user's claim. Stops when the tab is hidden or the
 * user has been idle long enough to be prompted "Are you still there?".
 *
 * The hook also tracks raw user interactions (mousemove/click/touch/key/scroll)
 * to drive idle detection — page being open isn't enough; we want them to
 * actually be doing something. After `idlePromptMs` of no interaction we set
 * `isIdle = true`; the caller shows a modal. Dismissing the modal calls
 * `dismissIdle()`, which resets the interaction clock and resumes heartbeats.
 *
 * Heartbeats stop while idle. The backend's 90s sweep window then frees the
 * tile a bit later, so the worst-case time-to-release is roughly:
 *   idlePromptMs (no interaction) + ~90s (backend sweep window).
 */
export function useClaimHeartbeat(
  tileId: string | null,
  sessionId: string,
  enabled: boolean,
  idlePromptMs: number = 60_000
): { isIdle: boolean; dismissIdle: () => void } {
  const heartbeat = useHeartbeatClaimMutation()
  // Stable refs so the effect doesn't re-subscribe on every render.
  const heartbeatRef = useRef(heartbeat)
  useEffect(() => {
    heartbeatRef.current = heartbeat
  })

  // Initialized in the effect to avoid Date.now() during render (purity rule).
  const lastInteractionRef = useRef<number>(0)
  const [isIdle, setIsIdle] = useState(false)

  const dismissIdle = () => {
    lastInteractionRef.current = Date.now()
    setIsIdle(false)
  }

  useEffect(() => {
    if (!enabled || !tileId) return
    // New claim — reset interaction clock so the user gets a full window.
    lastInteractionRef.current = Date.now()

    let stopped = false

    const onActivity = () => {
      lastInteractionRef.current = Date.now()
      setIsIdle((prev) => (prev ? false : prev))
    }

    const events: (keyof DocumentEventMap)[] = [
      'mousemove',
      'mousedown',
      'touchstart',
      'keydown',
      'scroll',
    ]
    if (typeof document !== 'undefined') {
      for (const ev of events)
        document.addEventListener(ev, onActivity, { passive: true })
    }

    const tick = () => {
      if (stopped) return
      if (typeof document !== 'undefined' && document.hidden) return
      const idleMs = Date.now() - lastInteractionRef.current
      if (idleMs >= idlePromptMs) {
        setIsIdle(true)
        return
      }
      heartbeatRef.current.mutate({ tileId, sessionId })
    }
    tick() // ping immediately on claim so the first sweep tick can't kill it
    const id = setInterval(tick, HEARTBEAT_INTERVAL_MS)

    const onVisibility = () => {
      if (!document.hidden) tick()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      stopped = true
      clearInterval(id)
      if (typeof document !== 'undefined') {
        for (const ev of events) document.removeEventListener(ev, onActivity)
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [enabled, tileId, sessionId, idlePromptMs])

  return { isIdle, dismissIdle }
}
