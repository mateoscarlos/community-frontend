'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { uiLocales, type Locale } from '@/lib/i18n/config'
import { useUiStore } from '@/lib/store/ui.store'

interface LanguageSwitcherProps {
  /** Where the popover opens from. Defaults to 'down'. Sidebar footer
   *  callers should pass 'up' so it doesn't run off the bottom of the screen. */
  direction?: 'up' | 'down'
}

/**
 * Collapsed by default, showing only the active flag. Clicking expands to
 * show the other locales stacked vertically. Picking one switches and
 * collapses again. Closes on outside click and on Escape.
 */
export function LanguageSwitcher({ direction = 'down' }: LanguageSwitcherProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale } = useUiStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function switchLocale(next: Locale) {
    setOpen(false)
    if (next === locale) return
    setLocale(next)
    const segments = pathname.split('/')
    segments[1] = next
    router.push(segments.join('/') || `/${next}`)
  }

  const others = uiLocales.filter((l) => l !== locale)
  const popoverPos = direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
  const slideFrom = direction === 'up' ? 6 : -6

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t(`language.${locale}`)}
        aria-expanded={open}
        className={`border-foreground/40 hover:bg-foreground/5 flex h-9 w-9 items-center justify-center overflow-hidden border transition-colors ${
          open ? 'bg-foreground/5' : ''
        }`}
      >
        <Flag locale={locale} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="locale-list"
            initial={{ opacity: 0, y: slideFrom, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: slideFrom, height: 0 }}
            transition={{ duration: 0.18 }}
            className={`border-foreground bg-background absolute left-0 z-40 flex flex-col overflow-hidden border ${popoverPos}`}
          >
            {others.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => switchLocale(l)}
                aria-label={t(`language.${l}`)}
                className="hover:bg-foreground/10 flex h-9 w-9 items-center justify-center overflow-hidden transition-colors"
              >
                <Flag locale={l} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Inline SVG flags ----------------------------------------------------
// Inline so we don't pull in a flag library and so they always render
// regardless of the OS's emoji font support.

function Flag({ locale }: { locale: Locale }) {
  if (locale === 'en') return <FlagGB />
  if (locale === 'es') return <FlagES />
  if (locale === 'da') return <FlagDK />
  return null
}

function FlagGB() {
  return (
    <svg viewBox="0 0 60 30" className="h-5 w-7" aria-hidden>
      <clipPath id="gb-c">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="gb-t">
        <path d="M30,15 h30 v15 z M30,15 v15 h-30 z M30,15 h-30 v-15 z M30,15 v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#gb-c)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath="url(#gb-t)"
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  )
}

function FlagES() {
  return (
    <svg viewBox="0 0 6 4" className="h-5 w-7" aria-hidden>
      <rect width="6" height="4" fill="#AA151B" />
      <rect y="1" width="6" height="2" fill="#F1BF00" />
    </svg>
  )
}

function FlagDK() {
  return (
    <svg viewBox="0 0 37 28" className="h-5 w-7" aria-hidden>
      <rect width="37" height="28" fill="#C8102E" />
      <rect x="12" width="4" height="28" fill="#fff" />
      <rect y="12" width="37" height="4" fill="#fff" />
    </svg>
  )
}
