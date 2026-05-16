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
} from '@/lib/api/debug'
import { RefreshCw } from 'lucide-react'
import { ScheduleSection } from './ScheduleSection'
import { PromptScheduleSection } from './PromptScheduleSection'
import { SessionsSection } from './SessionsSection'
import type { GameType, TileResponse } from '@/types/api'

const GAMES: { type: GameType; label: string }[] = [
  { type: 'photo', label: 'Photo' },
  { type: 'prompt', label: 'Prompt' },
]

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

      <Section title="Games">
        <GamesTable />
      </Section>

      <Section title="Period Duration">
        <PeriodDurationSection />
      </Section>

      <Section title="Schedule">
        <ScheduleSection />
      </Section>

      <Section title="Prompt Schedule">
        <PromptScheduleSection />
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

// --- Games Table ---

function GamesTable() {
  return (
    <div className="border-foreground space-y-0 border">
      {GAMES.map((g, i) => (
        <div key={g.type} className={i > 0 ? 'border-foreground/20 border-t' : ''}>
          <GameRow gameType={g.type} label={g.label} />
        </div>
      ))}
    </div>
  )
}

function GameRow({ gameType, label }: { gameType: GameType; label: string }) {
  const { data, refetch } = useCurrentPeriodQuery(gameType)

  const isMock = data?.isMock
  const period = isMock ? undefined : data?.period
  const grid = isMock ? undefined : data?.grid
  const tiles: TileResponse[] = grid?.tiles ?? []
  const lockedTiles = tiles.filter((t) => t.status === 'locked')
  const drawnTiles = tiles.filter((t) => t.status === 'drawn')

  return (
    <div className="space-y-3 p-4">
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
            <Stat label="Grid" value={`${grid.columns}×${grid.rows}`} />
            <Stat label="Drawn" value={`${grid.drawn_count}/${grid.total_tiles}`} />
            <Stat label="Status" value={period.status} />
          </div>

          {(lockedTiles.length > 0 || drawnTiles.length > 0) && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
                Reset individual tile
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tiles
                  .filter((t) => t.status !== 'free')
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
              confirm={`Reset the ${label.toLowerCase()} period? All claims and submissions will be cleared.`}
              onClick={async () => {
                await resetPeriod(gameType)
                refetch()
              }}
            />
            <SmallButton
              label="Draw All"
              variant="outline"
              confirm={`Draw all remaining ${label.toLowerCase()} tiles?`}
              disabled={tiles.every((t) => t.status === 'drawn')}
              onClick={async () => {
                await drawAllTiles(gameType)
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
