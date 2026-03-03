import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Locale } from '@/lib/i18n/config'

interface UiState {
  locale: Locale
  sidebarOpen: boolean
  setLocale: (locale: Locale) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  devtools(
    (set) => ({
      locale: 'en',
      sidebarOpen: false,
      setLocale: (locale) => set({ locale }, false, 'setLocale'),
      toggleSidebar: () =>
        set((s) => ({ sidebarOpen: !s.sidebarOpen }), false, 'toggleSidebar'),
      setSidebarOpen: (open) =>
        set({ sidebarOpen: open }, false, 'setSidebarOpen'),
    }),
    { name: 'ui-store' }
  )
)
