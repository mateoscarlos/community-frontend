'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPhaseGridSizes,
  setPhaseGridSizes,
  getOuterTileDisplay,
  setOuterTileDisplay,
  type OuterTileDisplayMode,
} from '@/lib/api/debug'
import { periodQueryKey } from '@/lib/query/period.queries'

/**
 * Two admin knobs from M5 (see community-backend/docs/game-model-rework.md):
 *
 * 1. `phase_grid_sizes` — the concentric-ring progression. Only affects
 *    periods created *after* the change; a running period keeps the shape it
 *    was seeded with.
 * 2. `outer_tile_display` — how the frontend renders future-locked tiles.
 *    Live-toggleable; the SSE `period_updated` event triggers an immediate
 *    refetch when it changes.
 */
export function PhaseProgressionSection() {
  return (
    <div className="space-y-6">
      <RingProgressionCard />
      <GridAppearanceCard />
    </div>
  )
}

function RingProgressionCard() {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['debug', 'phase-grid-sizes'],
    queryFn: getPhaseGridSizes,
    retry: 1,
  })

  const serverValue = data?.sizes.join(', ') ?? ''
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? serverValue
  const dirty = draft !== null && draft !== serverValue
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setError(null)
  }, [value])

  const save = async () => {
    const parsed = parseSizes(value)
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await setPhaseGridSizes(parsed.sizes)
      setDraft(null)
      await refetch()
      // Future periods will use the new shape — nudge the current-period view
      // to re-read so the admin can see the change reflected next rotation.
      queryClient.invalidateQueries({ queryKey: periodQueryKey })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <Loading />

  return (
    <div className="border-foreground space-y-3 border p-4">
      <div>
        <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
          Ring progression{' '}
          <span className="text-muted-foreground/60 tracking-normal normal-case">
            (odd ints, strictly increasing, first ≥ 3)
          </span>
        </p>
        <p className="text-muted-foreground mt-1 text-[10px] tracking-[0.15em] uppercase">
          Current:{' '}
          <span className="text-foreground font-black">{serverValue || '(none)'}</span>
        </p>
      </div>

      <input
        type="text"
        value={value}
        placeholder="3, 5, 7, 9"
        onChange={(e) => setDraft(e.target.value)}
        className="border-foreground text-foreground w-full border bg-transparent px-3 py-2 font-mono text-base outline-none"
      />

      {error && (
        <p className="text-foreground bg-foreground/10 border-foreground/40 border px-3 py-2 text-xs">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={!dirty || saving}
        className={`w-full border px-4 py-2 text-xs font-bold tracking-[0.15em] uppercase transition-all ${
          dirty && !saving
            ? 'border-foreground text-foreground hover:bg-foreground hover:text-background'
            : 'border-foreground/30 text-foreground/40 cursor-not-allowed'
        }`}
      >
        {saving ? '…' : dirty ? 'Save' : 'Saved'}
      </button>

      <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
        Only applies to the next period. Running periods keep their seeded shape.
      </p>
    </div>
  )
}

function GridAppearanceCard() {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['debug', 'outer-tile-display'],
    queryFn: getOuterTileDisplay,
    retry: 1,
  })

  const modes: { value: OuterTileDisplayMode; label: string; hint: string }[] = [
    {
      value: 'blocked',
      label: 'Blocked',
      hint: 'Full grid always visible; outer tiles dark and inert',
    },
    {
      value: 'hidden',
      label: 'Hidden',
      hint: 'Viewport is only the unlocked window; grows each phase',
    },
  ]

  const current = data?.mode

  const flip = async (mode: OuterTileDisplayMode) => {
    if (mode === current) return
    await setOuterTileDisplay(mode)
    await refetch()
    // Live toggle: the running period picks it up on the next poll. SSE
    // period_updated is also fired server-side so open tabs refresh.
    queryClient.invalidateQueries({ queryKey: periodQueryKey })
  }

  if (isLoading) return <Loading />

  return (
    <div className="border-foreground space-y-3 border p-4">
      <div>
        <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
          Grid appearance
        </p>
        <p className="text-muted-foreground mt-1 text-[10px] tracking-[0.15em] uppercase">
          Current: <span className="text-foreground font-black">{current ?? '?'}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {modes.map((m) => {
          const active = m.value === current
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => flip(m.value)}
              className={`space-y-1 border px-3 py-3 text-left transition-all ${
                active
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-foreground text-foreground hover:bg-foreground/10'
              }`}
            >
              <p className="text-xs font-bold tracking-[0.15em] uppercase">{m.label}</p>
              <p
                className={`text-[10px] leading-tight ${active ? 'text-background/70' : 'text-muted-foreground'}`}
              >
                {m.hint}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Parses the comma-separated input into a validated int array. Mirrors the
 * server-side check in appsettings.validatePhaseGridSizes so the admin gets
 * feedback before the round-trip. Returns `{error}` on any violation.
 */
function parseSizes(raw: string): { sizes: number[] } | { error: string } {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (parts.length === 0) return { error: 'need at least one size' }

  const sizes: number[] = []
  let prev = 0
  for (let i = 0; i < parts.length; i++) {
    const n = Number(parts[i])
    if (!Number.isInteger(n)) return { error: `entry ${i + 1} isn't an integer` }
    if (n < 3) return { error: `entry ${i + 1} (${n}) must be ≥ 3` }
    if (n % 2 === 0) return { error: `entry ${i + 1} (${n}) must be odd` }
    if (n <= prev) return { error: `entries must be strictly increasing` }
    sizes.push(n)
    prev = n
  }
  return { sizes }
}

function Loading() {
  return (
    <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
      Loading…
    </p>
  )
}
