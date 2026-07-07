'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useArchiveQuery } from '@/lib/query/period.queries'
import { AppNav } from '@/components/layout/AppNav'
import { SketchyBox } from '@/components/ui/SketchyBox'
import type { ArchivePeriodResponse, GameType } from '@/types/api'

function parseGameParam(raw: string | null): GameType {
  return raw === 'prompt' ? 'prompt' : 'photo'
}

// Art densely clustered at varied sizes (mostly similar with a few larger
// anchor pieces), each flat-mounted with a slim border + soft shadow. Fixed
// widths (not random) so server/client render identically.
const WIDTHS = [150, 198, 168, 232, 152, 186, 172, 210]

export function CalendarView() {
  const { t, i18n } = useTranslation()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'
  const searchParams = useSearchParams()
  const [gameType, setGameType] = useState<GameType>(() =>
    parseGameParam(searchParams?.get('game') ?? null)
  )
  const { data, isLoading } = useArchiveQuery(gameType)

  // Group every period under its year/month so the selectors only ever offer
  // months that actually have something on the wall.
  const byMonth = useMemo(() => {
    const map = new Map<string, ArchivePeriodResponse[]>()
    for (const p of data?.periods ?? []) {
      const d = new Date(p.started_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const arr = map.get(key) ?? []
      arr.push(p)
      map.set(key, arr)
    }
    return map
  }, [data])

  const sortedKeys = useMemo(
    () =>
      Array.from(byMonth.keys()).sort((a, b) => {
        const [ay, am] = a.split('-').map(Number)
        const [by, bm] = b.split('-').map(Number)
        return by - ay || bm - am
      }),
    [byMonth]
  )

  // The user's explicit pick (null = "haven't chosen"). The displayed month is
  // derived: their pick if it's still valid, otherwise the newest month. No
  // effect needed — this stays correct when the game toggle swaps the dataset.
  const [picked, setPicked] = useState<string | null>(null)
  const selectedKey = picked && byMonth.has(picked) ? picked : (sortedKeys[0] ?? null)
  const setSelectedKey = setPicked

  const years = useMemo(
    () =>
      Array.from(new Set(sortedKeys.map((k) => Number(k.split('-')[0])))).sort(
        (a, b) => b - a
      ),
    [sortedKeys]
  )

  const selYear = selectedKey ? Number(selectedKey.split('-')[0]) : null
  const monthsForYear = useMemo(
    () =>
      sortedKeys
        .filter((k) => Number(k.split('-')[0]) === selYear)
        .map((k) => Number(k.split('-')[1])),
    [sortedKeys, selYear]
  )

  const pieces = useMemo(() => {
    const list = selectedKey ? (byMonth.get(selectedKey) ?? []) : []
    return [...list].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    )
  }, [byMonth, selectedKey])

  const monthName = (m: number) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(2026, m, 1))

  const setYear = (y: number) => {
    const monthsOfYear = sortedKeys
      .filter((k) => Number(k.split('-')[0]) === y)
      .map((k) => Number(k.split('-')[1]))
    if (monthsOfYear.length) setSelectedKey(`${y}-${monthsOfYear[0]}`)
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center px-4 pb-20 sm:px-6">
      <AppNav />

      {/* Controls — month / year + the photo·prompt toggle. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10 sm:gap-4">
        <SketchySelect
          variant={0}
          value={
            selYear
              ? String(monthsForYear.find((m) => `${selYear}-${m}` === selectedKey) ?? '')
              : ''
          }
          disabled={!selectedKey}
          onChange={(v) => selYear !== null && setSelectedKey(`${selYear}-${v}`)}
          options={monthsForYear.map((m) => ({
            value: String(m),
            label: monthName(m),
          }))}
        />
        <SketchySelect
          variant={1}
          value={selYear !== null ? String(selYear) : ''}
          disabled={!selectedKey}
          onChange={(v) => setYear(Number(v))}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
        />
        <GameToggle value={gameType} onChange={setGameType} />
      </div>

      <div className="mt-8 w-full max-w-6xl">
        {selectedKey && (
          <p className="text-foreground/50 mb-8 text-center text-[11px] font-bold tracking-[0.3em] uppercase">
            {monthName(Number(selectedKey.split('-')[1]))} {selYear}
          </p>
        )}

        {isLoading && (
          <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-8 sm:gap-x-5">
            {WIDTHS.map((w, i) => (
              <div
                key={`s-${i}`}
                className="bg-foreground/10 aspect-square shrink-0"
                style={{ width: w }}
              />
            ))}
          </div>
        )}

        {!isLoading && pieces.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="border-foreground/20 bg-foreground/[0.04] aspect-square w-40 border" />
            <p className="text-foreground/60 font-handwritten text-2xl">
              {t('archive.empty_month')}
            </p>
          </div>
        )}

        {!isLoading && pieces.length > 0 && (
          <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10">
            {pieces.map((p, idx) => (
              <WallPiece
                key={p.id}
                period={p}
                locale={locale}
                width={WIDTHS[idx % WIDTHS.length]}
              />
            ))}
          </div>
        )}

        <p className="text-foreground/40 mt-14 text-center text-sm tracking-wide">
          {t('archive.gallery_hint')}
        </p>
      </div>
    </div>
  )
}

function WallPiece({
  period,
  locale,
  width,
}: {
  period: ArchivePeriodResponse
  locale: string
  width: number
}) {
  const { i18n } = useTranslation()
  const date = new Date(period.started_at)
  const dayLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
  }).format(date)

  // Flat-mounted on the wall: a slim white border and a soft drop shadow so
  // it sits just off the surface. No tilt, no hover motion — calm, like the
  // real thing.
  return (
    <Link
      href={`/${locale}/archive/${period.id}`}
      className="block shrink-0"
      style={{ width }}
      title={date.toLocaleDateString(locale)}
    >
      <div className="relative bg-white p-1 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.55)] ring-1 ring-black/10">
        <div className="relative aspect-square w-full overflow-hidden bg-black/[0.04]">
          {period.final_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={period.final_image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
              loading="lazy"
            />
          ) : (
            <span className="font-handwritten absolute inset-0 flex items-center justify-center text-2xl text-black/20">
              ?
            </span>
          )}
        </div>
      </div>
      {/* Small museum tombstone label. */}
      <p className="text-foreground/55 mt-2 text-center text-[10px] tracking-[0.12em] uppercase">
        {dayLabel}
      </p>
    </Link>
  )
}

function SketchySelect({
  value,
  onChange,
  options,
  variant,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  variant: number
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)?.label ?? '—'

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`text-foreground relative inline-flex h-12 min-w-[128px] items-center justify-center px-4 sm:h-14 sm:px-5 ${
          disabled ? 'opacity-40' : ''
        }`}
      >
        <SketchyBox variant={variant} />
        <span className="font-handwritten relative z-10 flex items-center gap-2 text-xl leading-none sm:text-2xl">
          {current}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            strokeWidth={2.5}
          />
        </span>
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="border-foreground absolute top-full left-1/2 z-30 mt-2 max-h-60 w-44 -translate-x-1/2 overflow-y-auto rounded-2xl border-2 p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)]"
            style={{ background: '#e6e6e6', color: '#111' }}
          >
            {options.map((o) => {
              const selected = o.value === value
              return (
                <li key={o.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value)
                      setOpen(false)
                    }}
                    className={`font-handwritten flex w-full items-center justify-center rounded-xl px-3 py-2 text-lg leading-none transition-colors sm:text-xl ${
                      selected
                        ? 'bg-zinc-900 text-zinc-100'
                        : 'text-zinc-800 hover:bg-zinc-900/10'
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function GameToggle({
  value,
  onChange,
}: {
  value: GameType
  onChange: (g: GameType) => void
}) {
  const { t } = useTranslation()
  const opts: { v: GameType; label: string }[] = [
    { v: 'photo', label: t('archive.tab_photo') },
    { v: 'prompt', label: t('archive.tab_prompt') },
  ]
  return (
    <div
      role="tablist"
      aria-label="Game"
      className="border-foreground/60 inline-flex border"
    >
      {opts.map((o) => {
        const active = o.v === value
        return (
          <button
            key={o.v}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.v)}
            className={`font-handwritten relative px-4 py-2 text-lg leading-none sm:text-xl ${
              active ? 'text-background' : 'text-foreground hover:bg-foreground/10'
            }`}
          >
            {active && (
              <motion.span
                layoutId="museum-game-pill"
                className="bg-foreground absolute inset-0 z-0"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
