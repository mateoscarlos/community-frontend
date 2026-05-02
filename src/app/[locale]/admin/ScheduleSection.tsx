'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import {
  listSchedule,
  upsertSchedule,
  deleteSchedule,
  getDebugUploadURL,
  type ScheduleItem,
} from '@/lib/api/debug'

const SCHEDULE_KEY = ['admin', 'schedule'] as const
const VISIBLE_DAYS = 30 // show today + next 29

/**
 * Admin section: a strip of upcoming days. Each cell shows the scheduled
 * image (if any) or an empty slot. Clicking an empty slot uploads an image
 * and registers it; the period sweeper auto-promotes it at midnight Cph.
 */
export function ScheduleSection() {
  const { data, isLoading } = useQuery({
    queryKey: SCHEDULE_KEY,
    queryFn: listSchedule,
  })

  // Build the displayed range from today (Cph-agnostic — the user is on the
  // admin's local clock and the backend only cares about the date string).
  const today = new Date()
  const days: { date: string; item?: ScheduleItem }[] = []
  const byDate = new Map(data?.items.map((it) => [it.date, it]))
  for (let i = 0; i < VISIBLE_DAYS; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    days.push({ date: iso, item: byDate.get(iso) })
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
        Next 30 days — picture promoted at midnight (Copenhagen)
      </p>

      {isLoading && (
        <div className="border-foreground bg-muted/20 h-32 animate-pulse border" />
      )}

      <div className="border-foreground grid grid-cols-5 border md:grid-cols-7">
        {days.map(({ date, item }, i) => (
          <DayCell key={date} date={date} item={item} index={i} />
        ))}
      </div>
    </div>
  )
}

function DayCell({
  date,
  item,
  index,
}: {
  date: string
  item?: ScheduleItem
  index: number
}) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const fileInputId = `schedule-file-${date}`

  // Use 5-col on mobile, 7-col on desktop. Border helpers shared across both.
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
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
            loading="lazy"
          />
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
        </>
      ) : (
        <label
          htmlFor={fileInputId}
          className="hover:bg-foreground/10 text-muted-foreground absolute inset-0 flex cursor-pointer items-center justify-center text-[10px] font-bold tracking-[0.15em] uppercase transition-colors"
        >
          {uploading ? '...' : '+'}
        </label>
      )}

      <input
        id={fileInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

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
