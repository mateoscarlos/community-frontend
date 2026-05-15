import { create } from 'zustand'

interface LayoutState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

// No persistence: the sidebar starts hidden on every page load. Users open it
// for a session via the floating toggle and it auto-collapses next visit.
export const useLayoutStore = create<LayoutState>()((set) => ({
  sidebarCollapsed: true,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}))
