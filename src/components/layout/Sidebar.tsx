'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Grid3x3, Archive, MessageSquare, X, PanelLeftClose } from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { useLayoutStore } from '@/lib/store/layout.store'

const TABS = [
  {
    key: 'game',
    icon: Grid3x3,
    href: (locale: string) => `/${locale}`,
    isActive: (pathname: string, locale: string) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/play`),
  },
  {
    key: 'archive',
    icon: Archive,
    href: (locale: string) => `/${locale}/archive`,
    isActive: (pathname: string, locale: string) =>
      pathname.startsWith(`/${locale}/archive`),
  },
  {
    key: 'feedback',
    icon: MessageSquare,
    href: (locale: string) => `/${locale}/feedback`,
    isActive: (pathname: string, locale: string) =>
      pathname.startsWith(`/${locale}/feedback`),
  },
] as const

interface NavItemsProps {
  pathname: string
  locale: string
  onItemClick?: () => void
}

function NavItems({ pathname, locale, onItemClick }: NavItemsProps) {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-col" aria-label="Main navigation">
      {TABS.map(({ key, icon: Icon, href, isActive }) => {
        const active = isActive(pathname, locale)
        return (
          <Link
            key={key}
            href={href(locale)}
            onClick={onItemClick}
            aria-current={active ? 'page' : undefined}
            className={`border-foreground/10 flex min-h-[64px] items-center gap-4 border-b px-6 transition-colors ${
              active
                ? 'bg-foreground text-background'
                : 'text-foreground hover:bg-foreground/5'
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.75} aria-hidden />
            <span className="text-sm font-bold tracking-[0.2em] uppercase">
              {t(`nav.${key}`)}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed)
  const toggleCollapsed = useLayoutStore((s) => s.toggleSidebar)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      {/* Sidebar is intentionally hidden for now — there's no affordance to
          open it (theme + language moved to the Settings modal). The drawer
          markup below is kept so we can bring the sidebar back later without
          rebuilding it. */}

      {/* Desktop sidebar — slides off-screen when collapsed. */}
      <motion.aside
        initial={false}
        animate={{ x: collapsed ? '-100%' : 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="border-foreground bg-background fixed top-0 bottom-0 left-0 z-30 hidden w-64 flex-col border-r md:flex"
        aria-label="Sidebar navigation"
        aria-hidden={collapsed}
      >
        <div className="border-foreground/10 flex items-start justify-between gap-3 border-b px-6 py-6">
          <div>
            <Link
              href={`/${locale}`}
              className="text-foreground text-lg font-black tracking-[0.2em] uppercase"
            >
              Community
            </Link>
            <p className="text-muted-foreground mt-1 text-[10px] tracking-[0.2em] uppercase">
              Daily Tile Game
            </p>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Hide sidebar"
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 -mr-2 flex h-9 w-9 shrink-0 items-center justify-center transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <NavItems pathname={pathname} locale={locale} />
        <div className="border-foreground/10 mt-auto flex items-center justify-between gap-2 border-t px-6 py-4">
          <LanguageSwitcher direction="up" />
          <ThemeToggle />
        </div>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              aria-hidden
            />
            <motion.aside
              key="drawer"
              className="border-foreground bg-background fixed top-0 bottom-0 left-0 z-50 flex w-[85%] max-w-sm flex-col border-r md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="border-foreground/10 flex items-start justify-between border-b px-6 py-6">
                <div>
                  <p className="text-foreground text-lg font-black tracking-[0.2em] uppercase">
                    Community
                  </p>
                  <p className="text-muted-foreground mt-1 text-[10px] tracking-[0.2em] uppercase">
                    Daily Tile Game
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close navigation"
                  className="hover:bg-foreground/5 -mr-2 flex h-12 w-12 items-center justify-center transition-colors"
                >
                  <X className="h-6 w-6" strokeWidth={2} />
                </button>
              </div>
              <NavItems pathname={pathname} locale={locale} onItemClick={close} />
              <div className="border-foreground/10 mt-auto flex items-center justify-between gap-2 border-t px-6 py-4">
                <LanguageSwitcher direction="up" />
                <ThemeToggle />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
