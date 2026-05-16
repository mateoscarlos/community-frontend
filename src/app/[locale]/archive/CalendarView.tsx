'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useArchiveQuery } from '@/lib/query/period.queries'
import { GameTopTabs } from '@/components/game/GameTopTabs'
import { SketchyBox } from '@/components/ui/SketchyBox'
import { Skeleton } from '@/components/ui/skeleton'
import type { ArchivePeriodResponse, GameType } from '@/types/api'

function parseGameParam(raw: string | null): GameType {
  return raw === 'prompt' ? 'prompt' : 'photo'
}

// A gentle, deterministic "hung on a wall" rhythm — alternating tilt and
// vertical offset so the gallery feels curated by hand, not by a grid.
const TILTS = [-2.2, 1.6, -1.2, 2.4, -1.8, 1.1]
const OFFSETS = [0, 22, 8, 30, 4, 18]

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
      <GameTopTabs locale={locale} gameType={gameType} activeTab="museum" />

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

      {isLoading && (
        <div className="mt-14 grid w-full max-w-6xl grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-none" />
          ))}
        </div>
      )}

      {!isLoading && pieces.length === 0 && (
        <div className="mt-24 flex flex-col items-center gap-3">
          <p
            className="text-foreground/70 text-2xl"
            style={{ fontFamily: 'var(--font-handwritten)' }}
          >
            {t('archive.empty_month')}
          </p>
        </div>
      )}

      {!isLoading && pieces.length > 0 && (
        <>
          <div className="mt-14 grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 sm:gap-x-10 lg:grid-cols-4">
            {pieces.map((p, idx) => (
              <FramedPiece
                key={p.id}
                period={p}
                locale={locale}
                tilt={TILTS[idx % TILTS.length]}
                offset={OFFSETS[idx % OFFSETS.length]}
              />
            ))}
          </div>
          <p
            className="text-foreground/50 mt-16 text-center text-lg"
            style={{ fontFamily: 'var(--font-handwritten)' }}
          >
            {t('archive.gallery_hint')}
          </p>
        </>
      )}
    </div>
  )
}

function FramedPiece({
  period,
  locale,
  tilt,
  offset,
}: {
  period: ArchivePeriodResponse
  locale: string
  tilt: number
  offset: number
}) {
  const { i18n } = useTranslation()
  const date = new Date(period.started_at)
  const dayLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
  }).format(date)

  return (
    <motion.div style={{ marginTop: offset }}>
      <Link
        href={`/${locale}/archive/${period.id}`}
        className="group block"
        style={{ rotate: `${tilt}deg` }}
        title={date.toLocaleDateString(locale)}
      >
        <motion.div
          whileHover={{ rotate: -tilt, y: -8, scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="origin-bottom"
        >
          {/* Frame */}
          <div className="relative aspect-square w-full p-3">
            <SketchyBox variant={2} strokeWidth={3} />
            <div className="bg-foreground/5 absolute inset-3 overflow-hidden rounded-2xl">
              {period.final_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={period.final_image_url}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                  loading="lazy"
                />
              ) : (
                <div className="text-foreground/30 flex h-full w-full items-center justify-center">
                  <span className="bg-foreground/30 h-2 w-2 rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* Placard */}
          <div className="relative mx-auto -mt-1 flex h-9 w-3/4 items-center justify-center">
            <SketchyBox variant={3} strokeWidth={2.5} />
            <span
              className="text-foreground relative z-10 text-base leading-none"
              style={{ fontFamily: 'var(--font-handwritten)' }}
            >
              {dayLabel}
            </span>
          </div>
        </motion.div>
      </Link>
    </motion.div>
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
        <span
          className="relative z-10 flex items-center gap-2 text-xl leading-none sm:text-2xl"
          style={{ fontFamily: 'var(--font-handwritten)' }}
        >
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
                    className={`flex w-full items-center justify-center rounded-xl px-3 py-2 text-lg leading-none transition-colors sm:text-xl ${
                      selected
                        ? 'bg-zinc-900 text-zinc-100'
                        : 'text-zinc-800 hover:bg-zinc-900/10'
                    }`}
                    style={{ fontFamily: 'var(--font-handwritten)' }}
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
            className={`relative px-4 py-2 text-lg leading-none sm:text-xl ${
              active ? 'text-background' : 'text-foreground hover:bg-foreground/10'
            }`}
            style={{ fontFamily: 'var(--font-handwritten)' }}
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
