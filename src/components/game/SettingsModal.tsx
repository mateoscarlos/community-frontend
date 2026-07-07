'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { uiLocales, type Locale } from '@/lib/i18n/config'
import { useUiStore } from '@/lib/store/ui.store'
import { useA11yStore } from '@/lib/store/a11y.store'
import { ModalCloseButton } from '@/components/ui/ModalCloseButton'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

// Hydration-safe "mounted" flag (same trick as ThemeToggle) so the theme
// control doesn't flash the wrong state on first paint.
const subscribe = () => () => {}
const getClient = () => true
const getServer = () => false

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            key="settings-backdrop"
            onClick={onClose}
            className="absolute inset-0"
            style={{
              background: 'rgba(0, 0, 0, 0.78)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              key="settings-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-modal-title"
              className="pointer-events-auto relative w-full max-w-md"
              style={{
                background: '#e6e6e6',
                color: '#111',
                boxShadow:
                  '0 30px 60px -20px rgba(0,0,0,0.7), 0 18px 36px -18px rgba(0,0,0,0.45)',
              }}
              initial={{ opacity: 0, scale: 0.88, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            >
              <ModalCloseButton onClick={onClose} ariaLabel={t('info.close')} />

              <div className="px-6 pt-14 pb-8 sm:px-10 sm:pt-16 sm:pb-10">
                <h2
                  id="settings-modal-title"
                  className="font-handwritten mb-8 text-3xl leading-none"
                >
                  {t('settings.title')}
                </h2>

                <div className="space-y-8">
                  <ThemeRow />
                  <LanguageRow />
                  <AccessibilityRow />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

function ThemeRow() {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, getClient, getServer)
  const isDark = mounted ? resolvedTheme === 'dark' : true

  const apply = (theme: 'light' | 'dark') => {
    if ((theme === 'dark') === isDark) return
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown
    }
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => setTheme(theme))
    } else {
      setTheme(theme)
    }
  }

  const opts: { value: 'light' | 'dark'; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: t('settings.light'), icon: Sun },
    { value: 'dark', label: t('settings.dark'), icon: Moon },
  ]

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold tracking-[0.25em] text-zinc-500 uppercase">
        {t('settings.theme')}
      </p>
      <div className="inline-flex overflow-hidden rounded-xl border border-zinc-900/30">
        {opts.map((o) => {
          const active = (o.value === 'dark') === isDark
          const Icon = o.icon
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => apply(o.value)}
              aria-pressed={active}
              className={`font-handwritten flex items-center gap-2 px-5 py-2.5 text-base transition-colors ${
                active
                  ? 'bg-zinc-900 text-zinc-100'
                  : 'text-zinc-800 hover:bg-zinc-900/10'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LanguageRow() {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale } = useUiStore()

  // Note: changing locale soft-navigates (locale is in the URL path). The
  // modal stays open because its open state lives in the ui store, which
  // survives the navigation — see AppNav / ui.store.
  const switchLocale = (next: Locale) => {
    if (next === locale) return
    setLocale(next)
    const segments = (pathname ?? '/').split('/')
    segments[1] = next
    router.push(segments.join('/') || `/${next}`)
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold tracking-[0.25em] text-zinc-500 uppercase">
        {t('settings.language')}
      </p>
      <div className="flex flex-wrap gap-2">
        {uiLocales.map((l) => {
          const active = l === locale
          return (
            <button
              key={l}
              type="button"
              onClick={() => switchLocale(l)}
              aria-pressed={active}
              className={`font-handwritten rounded-xl border px-4 py-2 text-base transition-colors ${
                active
                  ? 'border-zinc-900 bg-zinc-900 text-zinc-100'
                  : 'border-zinc-900/30 text-zinc-800 hover:bg-zinc-900/10'
              }`}
            >
              {t(`language.${l}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AccessibilityRow() {
  const { t } = useTranslation()
  const enabled = useA11yStore((s) => s.enabled)
  const setEnabled = useA11yStore((s) => s.setEnabled)

  const opts: { value: boolean; label: string }[] = [
    { value: false, label: t('settings.off') },
    { value: true, label: t('settings.on') },
  ]

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold tracking-[0.25em] text-zinc-500 uppercase">
        {t('settings.accessibility')}
      </p>
      <div className="inline-flex overflow-hidden rounded-xl border border-zinc-900/30">
        {opts.map((o) => {
          const active = o.value === enabled
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => setEnabled(o.value)}
              aria-pressed={active}
              className={`font-handwritten px-5 py-2.5 text-base transition-colors ${
                active
                  ? 'bg-zinc-900 text-zinc-100'
                  : 'text-zinc-800 hover:bg-zinc-900/10'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-sm text-zinc-600">{t('settings.accessibility_hint')}</p>
    </div>
  )
}
