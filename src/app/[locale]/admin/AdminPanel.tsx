'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentPeriodQuery, periodQueryKey } from '@/lib/query/period.queries'
import { resetPeriod, resetTile, drawAllTiles } from '@/lib/api/debug'
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
