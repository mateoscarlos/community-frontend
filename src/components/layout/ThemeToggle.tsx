'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

// Subscribes to nothing — the snapshot is `true` on the client and `false`
// during the server render. Lets us swap the icon without flashing the wrong
// theme on hydration, without the classic `useEffect(() => setMounted)`
// pattern that the react-hooks/set-state-in-effect rule blocks.
const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  const isDark = mounted ? resolvedTheme === 'dark' : true
  const next = isDark ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      className="border-foreground/40 hover:bg-foreground hover:text-background flex h-9 w-9 items-center justify-center border transition-colors"
    >
      {isDark ? (
        <Sun className="h-4 w-4" strokeWidth={2} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={2} />
      )}
    </button>
  )
}
