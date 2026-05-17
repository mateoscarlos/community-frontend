'use client'

import { useTranslation } from 'react-i18next'
import { Settings as SettingsIcon } from 'lucide-react'
import { SettingsModal } from '@/components/game/SettingsModal'
import { ChromeCircle } from '@/components/ui/ChromeCircle'
import { useUiStore } from '@/lib/store/ui.store'

/**
 * Global settings entry point: a small hand-drawn circle in the top-right
 * corner on every page (matches the Back/Home button chrome). Opens the
 * shared Settings modal, whose open state lives in the ui store so it
 * survives the soft navigation a language change triggers.
 */
export function SettingsButton() {
  const { t } = useTranslation()
  const settingsOpen = useUiStore((s) => s.settingsOpen)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)

  return (
    <>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        aria-label={t('settings.title')}
        className="text-foreground group fixed top-3 right-3 z-30 inline-flex h-11 w-11 items-center justify-center sm:top-4 sm:right-4 sm:h-12 sm:w-12"
      >
        <ChromeCircle />
        <SettingsIcon
          className="relative h-5 w-5 transition-transform group-hover:rotate-45 sm:h-6 sm:w-6"
          strokeWidth={2.25}
        />
      </button>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
