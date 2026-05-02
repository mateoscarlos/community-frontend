'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentPeriodQuery, periodQueryKey } from '@/lib/query/period.queries'
import {
  getDebugUploadURL,
  setActiveDailyImage,
  createPeriod,
  deletePeriod,
  resetPeriod,
  resetTile,
  drawAllTiles,
} from '@/lib/api/debug'
import { RefreshCw } from 'lucide-react'
import { ScheduleSection } from './ScheduleSection'
import { SessionsSection } from './SessionsSection'

export function AdminPanel() {
  const queryClient = useQueryClient()
  const { data, refetch } = useCurrentPeriodQuery()

  const isMock = data?.isMock
  const period = isMock ? undefined : data?.period
  const grid = isMock ? undefined : data?.grid
  const tiles = grid?.tiles ?? []
  const freeTiles = tiles.filter((t) => t.status === 'free')
  const lockedTiles = tiles.filter((t) => t.status === 'locked')
  const drawnTiles = tiles.filter((t) => t.status === 'drawn')

  return (
    <div className="mx-auto max-w-xl space-y-10 px-6 py-12">
      <header className="border-foreground border-b pb-6">
        <h1 className="text-foreground text-4xl font-black tracking-tight">ADMIN</h1>
        <p className="text-muted-foreground mt-2 text-xs tracking-[0.2em] uppercase">
          Debug Panel
        </p>
      </header>

      <Section title="State">
        {period ? (
          <div className="border-foreground grid grid-cols-3 border">
            <Stat label="Phase" value={`${period.phase}`} />
            <Stat label="Status" value={period.status} />
            <Stat label="Grid" value={`${grid?.columns}×${grid?.rows}`} />
            <Stat label="Free" value={`${freeTiles.length}`} />
            <Stat label="Locked" value={`${lockedTiles.length}`} />
            <Stat label="Drawn" value={`${drawnTiles.length}`} />
          </div>
        ) : (
          <div className="border-foreground border p-8 text-center">
            <p className="text-foreground text-lg font-medium">No active period</p>
          </div>
        )}
      </Section>

      <Section title="Image">
        <ImageUploadSection onDone={refetch} />
      </Section>

      <Section title="Schedule">
        <ScheduleSection />
      </Section>

      <Section title="Period">
        <BigButton
          label="Create Period"
          disabled={!!period}
          onClick={async () => {
            await createPeriod()
            refetch()
          }}
        />
        <BigButton
          label="Reset Period"
          variant="outline"
          confirm="Reset the current period? All claims and submissions will be cleared."
          disabled={!period}
          onClick={async () => {
            await resetPeriod()
            refetch()
          }}
        />
        <BigButton
          label="Delete Period"
          variant="danger"
          confirm="Delete the current period? This cannot be undone."
          disabled={!period}
          onClick={async () => {
            await deletePeriod()
            queryClient.setQueryData(periodQueryKey, null)
            refetch()
          }}
        />
      </Section>

      {period && (
        <Section title="Tiles">
          {(lockedTiles.length > 0 || drawnTiles.length > 0) && (
            <div className="space-y-3">
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

          <BigButton
            label="Draw All Tiles"
            variant="outline"
            confirm="Draw all remaining tiles?"
            disabled={freeTiles.length === 0 && lockedTiles.length === 0}
            onClick={async () => {
              await drawAllTiles()
              refetch()
            }}
          />
        </Section>
      )}

      <Section title="Players">
        <SessionsSection />
      </Section>

      <button
        onClick={() => refetch()}
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-2 py-3 text-[10px] tracking-[0.2em] uppercase transition-colors"
      >
        <RefreshCw className="h-3 w-3" />
        Refresh
      </button>
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
    <div className="border-foreground border-r border-b p-4 last:border-r-0 [&:nth-child(3n)]:border-r-0 [&:nth-child(n+4)]:border-b-0">
      <p className="text-muted-foreground text-[9px] tracking-[0.2em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1 truncate text-xl font-black">{value}</p>
    </div>
  )
}

// --- Big Button ---

function BigButton({
  label,
  variant = 'default',
  confirm,
  disabled,
  onClick,
}: {
  label: string
  variant?: 'default' | 'outline' | 'danger'
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
    'flex h-14 w-full items-center justify-center text-sm font-bold uppercase tracking-[0.2em] transition-all disabled:cursor-not-allowed disabled:opacity-30'
  const styles = {
    default: 'bg-foreground text-background hover:bg-foreground/90',
    outline:
      'border-foreground text-foreground hover:bg-foreground hover:text-background border',
    danger:
      'border-foreground text-foreground hover:bg-foreground hover:text-background border border-dashed',
  }[variant]

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

// --- Image Upload ---

function ImageUploadSection({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [fileName, setFileName] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setStatus('uploading')

    try {
      const key = `photos/${Date.now()}-${file.name}`
      const { upload_url } = await getDebugUploadURL(key)

      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      const dimensions = await getImageDimensions(file)

      await setActiveDailyImage({
        storage_key: key,
        width: dimensions.width,
        height: dimensions.height,
      })

      setStatus('done')
      onDone()
    } catch {
      setStatus('error')
    }
  }

  const text =
    status === 'uploading'
      ? 'Uploading...'
      : status === 'done'
        ? `✓ ${fileName}`
        : status === 'error'
          ? 'Upload failed'
          : 'Choose Image'

  return (
    <label className="block cursor-pointer">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={status === 'uploading'}
      />
      <div className="border-foreground hover:bg-foreground hover:text-background flex h-14 w-full items-center justify-center border border-dashed text-sm font-bold tracking-[0.2em] uppercase transition-all">
        {text}
      </div>
    </label>
  )
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
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
      // Tile may already be gone after a reset — ignore
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
