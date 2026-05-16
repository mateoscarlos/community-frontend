'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeftOpen } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { BackButton } from './BackButton'
import { HomeButton } from './HomeButton'
import { ClickSoundProvider } from './ClickSoundProvider'
import { useLayoutStore } from '@/lib/store/layout.store'

const SIDEBAR_WIDTH = 256

/**
 * Wraps the locale-scoped layout so the desktop sidebar can be collapsed.
 * On mobile the sidebar is always a drawer, so the collapsed state has no
 * effect there — `max-md:!pl-0` clamps the animated padding away.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed)
  const toggle = useLayoutStore((s) => s.toggleSidebar)

  return (
    <div className="bg-background min-h-dvh">
      <ClickSoundProvider />
      <Sidebar />
      <BackButton />
      <HomeButton />
      <AnimatePresence>
        {collapsed && (
          <motion.button
            key="sidebar-open-btn"
            type="button"
            onClick={toggle}
            aria-label="Show sidebar"
            className="border-foreground bg-background text-foreground hover:bg-foreground hover:text-background fixed bottom-3 left-3 z-30 hidden h-10 w-10 items-center justify-center border md:flex"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, delay: 0.18 }}
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
          </motion.button>
        )}
      </AnimatePresence>
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
