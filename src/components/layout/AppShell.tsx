'use client'

import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { BackButton } from './BackButton'
import { HomeButton } from './HomeButton'
import { SettingsButton } from './SettingsButton'
import { PageFrame } from './PageFrame'
import { useLayoutStore } from '@/lib/store/layout.store'

const SIDEBAR_WIDTH = 256

/**
 * Wraps the locale-scoped layout. The sidebar is intentionally hidden for now
 * (kept in the codebase, just no affordance to open it) — theme + language
 * live in the Settings modal instead. `<Sidebar />` stays mounted but stays
 * collapsed, so the main content keeps full width.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed)

  return (
    <div className="bg-background min-h-dvh">
      <PageFrame />
      <Sidebar />
      <BackButton />
      <HomeButton />
      <SettingsButton />
      <motion.main
        initial={false}
        animate={{ paddingLeft: collapsed ? 0 : SIDEBAR_WIDTH }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="max-md:!pl-0"
      >
        {children}
      </motion.main>
    </div>
  )
}
