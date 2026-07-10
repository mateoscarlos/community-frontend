'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentPeriodQuery, periodQueryKey } from '@/lib/query/period.queries'
import {
  resetPeriod,
  resetTile,
  drawAllTiles,
  getPeriodDuration,
  setPeriodDuration,
  listFeedback,
  markFeedbackRead,
  getRetention,
  setRetention,
  purgeRetention,
} from '@/lib/api/debug'
import { RefreshCw } from 'lucide-react'
import { ScheduleSection } from './ScheduleSection'
import { SessionsSection } from './SessionsSection'
import { PhaseProgressionSection } from './PhaseProgressionSection'
import type { TileResponse } from '@/types/api'

export function AdminPanel() {
  const queryClient = useQueryClient()

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: periodQueryKey })
  }

  return (
    <div className="mx-auto max-w-xl space-y-10 px-6 py-12">
      <header className="border-foreground border-b pb-6">
        <h1 className="text-foreground text-4xl font-black tracking-tight">ADMIN</h1>
        <p className="text-muted-foreground mt-2 text-xs tracking-[0.2em] uppercase">
          Debug Panel
        </p>
      </header>

      <Section title="Game">
        <GameRow label="Photo" />
      </Section>

      <Section title="Period Duration">
        <PeriodDurationSection />
      </Section>

      <Section title="Phase Progression">
        <PhaseProgressionSection />
      </Section>

      <Section title="Schedule">
        <ScheduleSection />
      </Section>

      <Section title="Feedback">
        <FeedbackSection />
      </Section>

      <Section title="Storage Cleanup">
        <RetentionSection />
      </Section>

      <Section title="Players">
        <SessionsSection />
      </Section>

      <button
        onClick={refreshAll}
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-2 py-3 text-[10px] tracking-[0.2em] uppercase transition-colors"
      >
        <RefreshCw className="h-3 w-3" />
        Refresh
      </button>
    </div>
  )
}

// --- Game Row ---

function GameRow({ label }: { label: string }) {
  const { data, refetch } = useCurrentPeriodQuery()

  const isMock = data?.isMock
  const period = isMock ? undefined : data?.period
  const grid = isMock ? undefined : data?.grid
  const tiles: TileResponse[] = grid?.tiles ?? []
  const lockedTiles = tiles.filter((t) => t.status === 'locked')
  const drawnTiles = tiles.filter((t) => t.status === 'drawn')

  return (
    <div className="border-foreground space-y-3 border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-lg font-black tracking-tight uppercase">
          {label}
        </h3>
        {!period && (
          <span className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
            no active period
          </span>
        )}
      </div>

      {period && grid && (
        <>
          <div className="border-foreground/30 grid grid-cols-4 border">
            <Stat label="Phase" value={`${period.phase}`} />
            <Stat
              label="Grid"
              value={`${period.phase_grid_size}/${period.final_grid_size}`}
            />
            <Stat label="Drawn" value={`${grid.drawn_count}/${grid.total_tiles}`} />
            <Stat label="Status" value={period.status} />
          </div>

          {(lockedTiles.length > 0 || drawnTiles.length > 0) && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
                Reset individual tile
              </p>
              <div className="flex flex-wrap gap-1.5">
                {/* Only tiles that have something worth resetting: locked
                    (someone's holding a claim) or drawn (a submission).
                    Future-locked and free tiles have no state to clear. */}
                {tiles
                  .filter((t) => t.status === 'locked' || t.status === 'drawn')
                  .map((tile) => (
                    <TileResetButton key={tile.id} tile={tile} onDone={refetch} />
                  ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <SmallButton
              label="Reset"
              variant="outline"
              confirm="Reset the period? All claims and submissions will be cleared."
              onClick={async () => {
                await resetPeriod()
                refetch()
              }}
            />
            <SmallButton
              label="Draw All"
              variant="outline"
              confirm="Draw all remaining tiles?"
              disabled={tiles.every((t) => t.status === 'drawn')}
              onClick={async () => {
                await drawAllTiles()
                refetch()
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

// --- Period Duration ---

const PRESETS: { label: string; hours: number }[] = [
  { label: '24h', hours: 24 },
  { label: '48h', hours: 48 },
  { label: '72h', hours: 72 },
  { label: '1 week', hours: 168 },
]

function PeriodDurationSection() {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['debug', 'period-duration'],
    queryFn: getPeriodDuration,
    retry: 1,
  })

  // Server value, with a local override while the admin is editing. `0` /
  // empty means "legacy daily cutoff".
  const serverHours = data?.hours ?? 0
  const [draft, setDraft] = useState<number | null>(null)
  const hours = draft ?? serverHours

  const dirty = draft !== null && draft !== serverHours

  const save = async (value: number) => {
    await setPeriodDuration(value)
    setDraft(null)
    await refetch()
    // New duration affects the active period at the next sweep — nudge the
    // period views to re-read soon.
    queryClient.invalidateQueries({ queryKey: periodQueryKey })
  }

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
        Loading…
      </p>
    )
  }

  return (
    <div className="border-foreground space-y-4 border p-4">
      <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
        Current:{' '}
        <span className="text-foreground font-black">
          {serverHours > 0 ? `${serverHours}h` : 'Daily (midnight cutoff)'}
        </span>
      </p>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.hours}
            type="button"
            onClick={() => setDraft(p.hours)}
            className={`flex h-9 min-w-[56px] items-center justify-center border px-3 text-xs font-bold tracking-[0.15em] uppercase transition-all ${
              hours === p.hours
                ? 'bg-foreground text-background border-foreground'
                : 'border-foreground text-foreground hover:bg-foreground hover:text-background'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
          Custom (hours)
        </p>
        <input
          type="number"
          min={0}
          step={1}
          value={hours || ''}
          placeholder="e.g. 96"
          onChange={(e) => {
            const n = Number(e.target.value)
            setDraft(Number.isFinite(n) && n >= 0 ? n : 0)
          }}
          className="border-foreground text-foreground w-full border bg-transparent px-3 py-2 text-base outline-none"
        />
      </div>

      <SmallButton
        label={dirty ? 'Save' : 'Saved'}
        disabled={!dirty}
        confirm={`Set period duration to ${hours}h? This applies to the active period at the next sweep.`}
        onClick={() => save(hours)}
      />
    </div>
  )
}

// --- Feedback ---

const RATING_EMOJI: Record<number, string> = { 1: '🙁', 2: '😐', 3: '🙂' }
const RATING_LABEL: Record<number, string> = {
  1: 'Negative',
  2: 'Neutral',
  3: 'Positive',
}

function FeedbackSection() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['debug', 'feedback'],
    queryFn: listFeedback,
    retry: 1,
  })
  const items = data?.feedback ?? []
  const newCount = items.filter((f) => !f.viewed).length

  const toggle = async (id: string, read: boolean) => {
    await markFeedbackRead(id, read)
    queryClient.invalidateQueries({ queryKey: ['debug', 'feedback'] })
  }

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
        Loading…
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
        No feedback yet
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
        {items.length} total ·{' '}
        <span className="text-foreground font-black">{newCount} new</span>
      </p>
      <div className="border-foreground space-y-0 border">
        {items.map((f, i) => (
          <div
            key={f.id}
            className={`space-y-2 p-4 ${i > 0 ? 'border-foreground/20 border-t' : ''} ${
              f.viewed ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-[9px] font-black tracking-[0.2em] uppercase ${
                    f.viewed
                      ? 'border-foreground/40 text-muted-foreground border'
                      : 'bg-foreground text-background'
                  }`}
                >
                  {f.viewed ? 'Viewed' : 'New'}
                </span>
                {f.rating != null && (
                  <span
                    className="border-foreground/30 text-foreground border px-2 py-0.5 text-[11px]"
                    title={RATING_LABEL[f.rating] ?? `rating ${f.rating}`}
                  >
                    {RATING_EMOJI[f.rating] ?? '•'}{' '}
                    <span className="text-muted-foreground text-[9px] tracking-[0.15em] uppercase">
                      {RATING_LABEL[f.rating] ?? f.rating}
                    </span>
                  </span>
                )}
                {f.context && (
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {f.context}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                {new Date(f.created_at).toLocaleString()}
              </span>
            </div>
            {f.message ? (
              <p className="text-foreground text-sm break-words whitespace-pre-wrap">
                {f.message}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs italic">
                {f.rating != null ? 'Quick reaction — no message' : 'No message'}
              </p>
            )}
            {f.contact && (
              <p className="text-muted-foreground font-mono text-[11px] break-words">
                {f.contact}
              </p>
            )}
            <button
              type="button"
              onClick={() => toggle(f.id, !f.viewed)}
              className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-8 items-center justify-center border px-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-all"
            >
              {f.viewed ? 'Mark new' : 'Mark viewed'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Storage Cleanup (retention) ---

const RETENTION_PRESETS = [7, 30, 90]

function RetentionSection() {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['debug', 'retention'],
    queryFn: getRetention,
    retry: 1,
  })
  const [purging, setPurging] = useState(false)

  const serverDays = data?.retention_days ?? 30
  const eligible = data?.eligible
  const [draft, setDraft] = useState<number | null>(null)
  const days = draft ?? serverDays
  const dirty = draft !== null && draft !== serverDays

  const save = async (value: number) => {
    await setRetention(value)
    setDraft(null)
    await refetch()
  }

  const purgeNow = async () => {
    if (
      !window.confirm(
        'Permanently delete tile/claim/submission rows for periods older ' +
          `than ${serverDays} days? The Museum keeps the final images.`
      )
    )
      return
    setPurging(true)
    try {
      await purgeRetention()
      await refetch()
      queryClient.invalidateQueries({ queryKey: periodQueryKey })
    } finally {
      setPurging(false)
    }
  }

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
        Loading…
      </p>
    )
  }

  return (
    <div className="border-foreground space-y-4 border p-4">
      <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
        Retain per-tile data for{' '}
        <span className="text-foreground font-black">{serverDays} days</span> after a
        period ends
      </p>

      <div className="flex flex-wrap gap-1.5">
        {RETENTION_PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDraft(d)}
            className={`flex h-9 min-w-[56px] items-center justify-center border px-3 text-xs font-bold tracking-[0.15em] uppercase transition-all ${
              days === d
                ? 'bg-foreground text-background border-foreground'
                : 'border-foreground text-foreground hover:bg-foreground hover:text-background'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
          Custom (days)
        </p>
        <input
          type="number"
          min={1}
          step={1}
          value={days || ''}
          placeholder="e.g. 45"
          onChange={(e) => {
            const n = Number(e.target.value)
            setDraft(Number.isFinite(n) && n >= 1 ? n : 1)
          }}
          className="border-foreground text-foreground w-full border bg-transparent px-3 py-2 text-base outline-none"
        />
      </div>

      <SmallButton
        label={dirty ? 'Save' : 'Saved'}
        disabled={!dirty}
        confirm={`Keep per-tile data for ${days} days after a period ends?`}
        onClick={() => save(days)}
      />

      <div className="border-foreground/20 space-y-3 border-t pt-4">
        <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
          Eligible to purge now:{' '}
          <span className="text-foreground font-black">
            {eligible
              ? `${eligible.periods} periods · ${eligible.tiles} tiles · ${eligible.submissions} submissions`
              : '—'}
          </span>
        </p>
        <SmallButton
          label={purging ? 'Purging…' : 'Purge now'}
          variant="outline"
          disabled={purging || !eligible || eligible.tiles === 0}
          onClick={purgeNow}
        />
      </div>
    </div>
  )
}

// --- Layout ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-foreground/30 border-r px-3 py-2 last:border-r-0">
      <p className="text-muted-foreground text-[9px] tracking-[0.2em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-0.5 truncate text-base font-black">{value}</p>
    </div>
  )
}

// --- Buttons ---

function SmallButton({
  label,
  variant = 'default',
  confirm,
  disabled,
  onClick,
}: {
  label: string
  variant?: 'default' | 'outline'
  confirm?: string
  disabled?: boolean
  onClick: () => Promise<void>
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const handleClick = async () => {
    if (confirm && !window.confirm(confirm)) return
    setStatus('loading')
    try {
      await onClick()
      setStatus('done')
      setTimeout(() => setStatus('idle'), 1200)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  const base =
    'flex h-10 w-full items-center justify-center text-xs font-bold uppercase tracking-[0.2em] transition-all disabled:cursor-not-allowed disabled:opacity-30'
  const styles =
    variant === 'outline'
      ? 'border-foreground text-foreground hover:bg-foreground hover:text-background border'
      : 'bg-foreground text-background hover:bg-foreground/90'

  const text =
    status === 'loading'
      ? '...'
      : status === 'done'
        ? 'Done'
        : status === 'error'
          ? 'Error'
          : label

  return (
    <button
      type="button"
      disabled={disabled || status === 'loading'}
      onClick={handleClick}
      className={`${base} ${styles}`}
    >
      {text}
    </button>
  )
}

// --- Tile Reset Button ---

function TileResetButton({
  tile,
  onDone,
}: {
  tile: { id: string; row: number; col: number; status: string }
  onDone: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    setLoading(true)
    try {
      await resetTile(tile.id)
    } catch {
      // Tile may already be gone after a reset — ignore.
    } finally {
      setLoading(false)
      onDone()
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-9 min-w-[44px] items-center justify-center border px-2 text-xs font-bold transition-all disabled:opacity-30"
    >
      {loading ? '...' : `${tile.row + 1},${tile.col + 1}`}
    </button>
  )
}
