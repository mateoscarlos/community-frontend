'use client'

import { useRouter, useParams, usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
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
      <svg
        viewBox="0 0 60 60"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {/* Hand-drawn circle — slightly oval, wobbly seam. */}
        <path
          d="M 30 6 C 14 6, 6 18, 6 30 C 6 44, 16 54, 30 54 C 46 54, 54 42, 54 28 C 54 14, 44 5, 30 6 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <ArrowLeft
        className="relative h-5 w-5 transition-transform group-hover:-translate-x-0.5 sm:h-6 sm:w-6"
        strokeWidth={2.25}
      />
    </motion.button>
  )
}
