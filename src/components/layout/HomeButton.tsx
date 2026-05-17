'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Home } from 'lucide-react'
import { motion } from 'framer-motion'
import { ChromeCircle } from '@/components/ui/ChromeCircle'
import { useLayoutStore } from '@/lib/store/layout.store'

// Matches AppShell's SIDEBAR_WIDTH so the button rides alongside content when
// the desktop sidebar opens (same behaviour as BackButton).
const SIDEBAR_WIDTH = 256

export function HomeButton() {
  const params = useParams()
  const pathname = usePathname() ?? ''
  const locale = (params?.locale as string) ?? 'en'
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed)

  // Already home — nothing to navigate to.
  if (pathname === `/${locale}` || pathname === `/${locale}/`) return null

  return (
    <motion.div
      animate={{ x: collapsed ? 0 : SIDEBAR_WIDTH }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
      className="fixed top-3 left-[64px] z-30 max-md:!transform-none sm:top-4 sm:left-[76px]"
    >
      <Link
        href={`/${locale}`}
        aria-label="Home"
        className="text-foreground group inline-flex h-11 w-11 items-center justify-center sm:h-12 sm:w-12"
      >
        <ChromeCircle />
        <Home
          className="relative h-5 w-5 transition-transform group-hover:-translate-y-0.5 sm:h-6 sm:w-6"
          strokeWidth={2.25}
        />
      </Link>
    </motion.div>
  )
}
