'use client'

import { useTranslation } from 'react-i18next'

const STATS = [
  { label: 'Tiles claimed', value: '—' },
  { label: 'Photos submitted', value: '—' },
]

export function AccountView() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-xl space-y-10 px-6 py-12">
      <header className="border-foreground border-b pb-6">
        <h1 className="text-foreground text-4xl font-black tracking-tight uppercase">
          {t('account.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-xs tracking-[0.2em] uppercase">
          {t('account.subtitle')}
        </p>
      </header>

      <div className="space-y-3">
        <button
          disabled
          className="bg-foreground text-background flex h-14 w-full items-center justify-center text-sm font-bold tracking-[0.2em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-30"
        >
          {t('account.sign_up')}
        </button>
        <button
          disabled
          className="border-foreground text-foreground flex h-14 w-full items-center justify-center border text-sm font-bold tracking-[0.2em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-30"
        >
          {t('account.sign_in')}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-foreground/20 h-px flex-1" />
        <span className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
          {t('account.or')}
        </span>
        <div className="bg-foreground/20 h-px flex-1" />
      </div>

      <div className="space-y-2">
        <button
          disabled
          className="border-foreground text-foreground flex h-14 w-full items-center justify-center border border-dashed text-sm font-bold tracking-[0.2em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-30"
        >
          {t('account.play_as_guest')}
        </button>
        <p className="text-muted-foreground text-center text-[10px] leading-relaxed tracking-[0.15em] uppercase">
          {t('account.guest_note')}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
          Stats
        </h2>
        <div className="border-foreground border">
          {STATS.map(({ label, value }, i) => (
            <div
              key={label}
              className={`flex items-center justify-between px-5 py-4 ${
                i < STATS.length - 1 ? 'border-foreground/20 border-b' : ''
              }`}
            >
              <span className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                {label}
              </span>
              <span className="text-foreground font-mono text-2xl font-black">
                {value}
              </span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-center text-[10px] tracking-[0.2em] uppercase">
          {t('account.coming_soon')}
        </p>
      </section>
    </div>
  )
}
