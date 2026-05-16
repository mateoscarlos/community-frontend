import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Accessibility mode: a single user toggle that swaps the decorative
// display fonts for a legible sans, drops the custom cursors, kills
// decorative motion + the floating emojis, and silences the click sound.
// Persisted to localStorage so it survives reloads (like the theme).
interface A11yState {
  enabled: boolean
  setEnabled: (v: boolean) => void
  toggle: () => void
}

export const useA11yStore = create<A11yState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (v) => set({ enabled: v }),
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: 'community-a11y' }
  )
)
