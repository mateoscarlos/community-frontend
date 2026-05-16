import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Locale } from '@/lib/i18n/config'

interface UiState {
  locale: Locale
  sidebarOpen: boolean
  // Kept in the store (not local component state) so the Settings modal
  // stays open across the soft navigation that a language change triggers
  // (the locale lives in the URL path, so switching it remounts the tabs).
  settingsOpen: boolean
  setLocale: (locale: Locale) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  devtools(
    (set) => ({
      locale: 'en',
      sidebarOpen: false,
      settingsOpen: false,
      setLocale: (locale) => set({ locale }, false, 'setLocale'),
      toggleSidebar: () =>
        set((s) => ({ sidebarOpen: !s.sidebarOpen }), false, 'toggleSidebar'),
      setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),
      setSettingsOpen: (open) => set({ settingsOpen: open }, false, 'setSettingsOpen'),
    }),
    { name: 'ui-store' }
  )
)
