'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function DateTimeFooter({ locale }: { locale: string }) {
  const { i18n } = useTranslation()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // Seed the first tick via rAF (next paint) instead of a synchronous
    // setState in the effect body — keeps react-hooks/set-state-in-effect
    // happy. The interval handles subsequent updates.
    const rafId = requestAnimationFrame(() => setNow(new Date()))
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => {
      cancelAnimationFrame(rafId)
      clearInterval(id)
    }
  }, [])

  if (!now) return <div className="h-10" aria-hidden />

  const lang = i18n.language || locale
  const dateLabel = now.toLocaleDateString(lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeLabel = now.toLocaleTimeString(lang, { hour12: false })

  return (
    <div className="text-foreground/80 flex flex-col items-center gap-1 font-mono text-sm">
      <span>{dateLabel}</span>
      <span className="tabular-nums">{timeLabel}</span>
    </div>
  )
}
