'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // disableTransitionOnChange omitted — we want the cross-fade animation.
  // ThemeToggle uses the View Transitions API where supported and falls
  // back to a plain instant swap elsewhere.
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  )
}
