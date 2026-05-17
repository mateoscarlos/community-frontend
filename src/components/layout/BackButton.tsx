'use client'

import { useRouter, useParams, usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { ChromeCircle } from '@/components/ui/ChromeCircle'
import { useLayoutStore } from '@/lib/store/layout.store'

// Matches AppShell's SIDEBAR_WIDTH so the back button rides alongside content
// when the desktop sidebar opens.
const SIDEBAR_WIDTH = 256

export function BackButton() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname() ?? ''
  const locale = (params?.locale as string) ?? 'en'
  const collapsed = useLayoutStore((s) => s.sidebarCollapsed)

  // Don't render on the locale root — there's nowhere to "go back" to.
  if (pathname === `/${locale}` || pathname === `/${locale}/`) return null

  const handleClick = () => {
    // Genuine "back" — uses browser history. Fall back to home if the user
    // landed here directly (no history beyond the initial entry).
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(`/${locale}`)
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-label="Back"
      animate={{ x: collapsed ? 0 : SIDEBAR_WIDTH }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
      className="text-foreground group fixed top-3 left-3 z-30 inline-flex h-11 w-11 items-center justify-center max-md:!transform-none sm:top-4 sm:left-4 sm:h-12 sm:w-12"
    >
      <ChromeCircle />
      <ArrowLeft
        className="relative h-5 w-5 transition-transform group-hover:-translate-x-0.5 sm:h-6 sm:w-6"
        strokeWidth={2.25}
      />
    </motion.button>
  )
}
