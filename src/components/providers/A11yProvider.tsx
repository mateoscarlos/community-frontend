'use client'

import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { useA11yStore } from '@/lib/store/a11y.store'

/**
 * Applies accessibility mode app-wide:
 *  - toggles the `a11y` class on <html> (CSS in globals.css swaps the
 *    display fonts for a legible sans, drops custom cursors, kills
 *    decorative CSS animations + the floating emojis)
 *  - drives framer-motion's reduced-motion: forced when a11y is on,
 *    otherwise still respects the OS `prefers-reduced-motion` setting.
 */
export function A11yProvider({ children }: { children: React.ReactNode }) {
  const enabled = useA11yStore((s) => s.enabled)

  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('a11y', enabled)
    return () => el.classList.remove('a11y')
  }, [enabled])

  return (
    <MotionConfig reducedMotion={enabled ? 'always' : 'user'}>{children}</MotionConfig>
  )
}
