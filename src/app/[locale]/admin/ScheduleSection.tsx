'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import {
  listSchedule,
  upsertSchedule,
  deleteSchedule,
  getDebugUploadURL,
  getPeriodDuration,
  type ScheduleItem,
} from '@/lib/api/debug'

const SCHEDULE_KEY = ['admin', 'schedule'] as const
const VISIBLE_DAYS = 30 // show today + next 29

type DaySlot = {
  date: string
  item?: ScheduleItem
  isOwn: boolean // true when this date has its own row; false when it's a spanned continuation
  sourceDate?: string // the schedule row driving this cell when spanned
}

/**
 * Admin section: a strip of upcoming days. Each cell shows the scheduled
 * image (if any) or an empty slot. Clicking an empty slot uploads an image
 * and registers it; the period sweeper auto-promotes it at midnight Cph.
 *
 * When period_duration_hours > 24 a single scheduled picture keeps running
 * for multiple days — we render those spanned days with the same image
 * (dimmed, read-only) so the admin can see what will actually be showing.
 */
export function ScheduleSection() {
  const { data, isLoading } = useQuery({
    queryKey: SCHEDULE_KEY,
    queryFn: listSchedule,
  })
  const { data: duration } = useQuery({
    queryKey: ['debug', 'period-duration'],
    queryFn: getPeriodDuration,
    retry: 1,
  })
  const daysPerPeriod = Math.max(1, Math.ceil((duration?.hours ?? 24) / 24))

  const today = new Date()
  const days = buildSlots(data?.items ?? [], today, VISIBLE_DAYS, daysPerPeriod)

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
        Next 30 days — picture promoted at midnight (Copenhagen)
        {daysPerPeriod > 1 && ` · each picture runs ${daysPerPeriod} days`}
      </p>

      {isLoading && (
        <div className="border-foreground bg-muted/20 h-32 animate-pulse border" />
      )}

      <div className="border-foreground grid grid-cols-5 border md:grid-cols-7">
        {days.map((slot, i) => (
          <DayCell key={slot.date} slot={slot} index={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * Place own rows first, then span each forward `daysPerPeriod - 1` days.
 * Own rows always win — a later-dated upload overrides an earlier span so
 * the admin sees what they explicitly scheduled.
 */
function buildSlots(
  items: ScheduleItem[],
  today: Date,
  visibleDays: number,
  daysPerPeriod: number
): DaySlot[] {
  const byDate = new Map(items.map((it) => [it.date, it]))
  const slots: DaySlot[] = []
  const dateToIdx = new Map<string, number>()
  for (let i = 0; i < visibleDays; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    slots.push({ date: iso, item: byDate.get(iso), isOwn: !!byDate.get(iso) })
    dateToIdx.set(iso, i)
  }
  if (daysPerPeriod <= 1) return slots

  const sortedOwn = items
    .map((it) => it.date)
    .filter((d) => dateToIdx.has(d))
    .sort()
  for (const ownDate of sortedOwn) {
    const ownItem = byDate.get(ownDate)!
    const startIdx = dateToIdx.get(ownDate)!
    for (let offset = 1; offset < daysPerPeriod; offset++) {
      const spanIdx = startIdx + offset
      if (spanIdx >= slots.length) break
      const spanSlot = slots[spanIdx]
      if (spanSlot.isOwn) break // hit the next own row → stop spanning
      slots[spanIdx] = {
        date: spanSlot.date,
        item: ownItem,
        isOwn: false,
        sourceDate: ownDate,
      }
    }
  }
  return slots
}

function DayCell({ slot, index }: { slot: DaySlot; index: number }) {
  const { date, item, isOwn } = slot
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const fileInputId = `schedule-file-${date}`

  const borderClass =
    'border-foreground/10 border-r border-b last:border-r-0 [&:nth-child(5n)]:border-r-0 md:[&:nth-child(5n)]:border-r md:[&:nth-child(7n)]:border-r-0'

  const day = parseInt(date.slice(8, 10), 10)
  const month = new Date(date).toLocaleDateString(undefined, { month: 'short' })

  const removeMutation = useMutation({
    mutationFn: () => deleteSchedule(date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY }),
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const key = `schedule/${date}-${Date.now()}-${file.name.replace(/\s+/g, '-')}`
      const { upload_url } = await getDebugUploadURL(key)
      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      const dims = await getImageDimensions(file)
      await upsertSchedule({
        date,
        storage_key: key,
        width: dims.width,
        height: dims.height,
      })
      await queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY })
    } catch (err) {
      console.error('schedule upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`relative aspect-square ${borderClass}`}>
      {item?.image_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover ${
              isOwn ? '' : 'opacity-50'
            }`}
            draggable={false}
            loading="lazy"
          />
          {isOwn && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remove scheduled picture for ${date}?`)) {
                  removeMutation.mutate()
                }
              }}
              disabled={removeMutation.isPending}
              className="text-background absolute top-1 right-1 z-10 mix-blend-difference disabled:opacity-30"
              aria-label={`Remove scheduled picture for ${date}`}
            >
              <Trash2 className="h-3.5 w-3.5 drop-shadow" />
            </button>
          )}
          {!isOwn && (
            <span className="text-background absolute top-1 right-1 z-10 font-mono text-[9px] font-bold tracking-tight mix-blend-difference drop-shadow">
              cont.
            </span>
          )}
        </>
      ) : (
        <label
          htmlFor={fileInputId}
          className="hover:bg-foreground/10 text-muted-foreground absolute inset-0 flex cursor-pointer items-center justify-center text-[10px] font-bold tracking-[0.15em] uppercase transition-colors"
        >
          {uploading ? '...' : '+'}
        </label>
      )}

      {!item && (
        <input
          id={fileInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      <span
        className={`absolute bottom-1 left-1 font-mono text-[10px] font-bold tracking-tight ${
          item?.image_url
            ? 'text-background mix-blend-difference drop-shadow'
            : 'text-muted-foreground'
        }`}
      >
        {index === 0 ? 'TODAY' : `${day} ${month}`}
      </span>
    </div>
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
