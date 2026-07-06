'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import {
  listPromptSchedule,
  upsertPromptSchedule,
  deletePromptSchedule,
  getPeriodDuration,
  type PromptScheduleItem,
} from '@/lib/api/debug'

const PROMPT_SCHEDULE_KEY = ['admin', 'prompt-schedule'] as const
const VISIBLE_DAYS = 30

type PromptSlot = {
  date: string
  item?: PromptScheduleItem
  isOwn: boolean
  sourceDate?: string
}

/**
 * Admin section for the parallel prompt-game schedule. Each day cell holds a
 * text prompt instead of an image. The sweeper auto-promotes today's prompt
 * to an active period at midnight Cph.
 *
 * When period_duration_hours > 24 one prompt keeps running for multiple days
 * — spanned days are shown as read-only continuations of the driving row.
 */
export function PromptScheduleSection() {
  const { data, isLoading } = useQuery({
    queryKey: PROMPT_SCHEDULE_KEY,
    queryFn: listPromptSchedule,
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
        Next 30 days — prompt promoted at midnight (Copenhagen)
        {daysPerPeriod > 1 && ` · each prompt runs ${daysPerPeriod} days`}
      </p>

      {isLoading && (
        <div className="border-foreground bg-muted/20 h-32 animate-pulse border" />
      )}

      <div className="border-foreground border">
        {days.map((slot, i) => (
          <PromptRow key={slot.date} slot={slot} index={i} />
        ))}
      </div>
    </div>
  )
}

function buildSlots(
  items: PromptScheduleItem[],
  today: Date,
  visibleDays: number,
  daysPerPeriod: number
): PromptSlot[] {
  const byDate = new Map(items.map((it) => [it.date, it]))
  const slots: PromptSlot[] = []
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
      if (spanSlot.isOwn) break
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

function PromptRow({ slot, index }: { slot: PromptSlot; index: number }) {
  const { date, item, isOwn } = slot
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item?.prompt ?? '')

  const day = parseInt(date.slice(8, 10), 10)
  const month = new Date(date).toLocaleDateString(undefined, { month: 'short' })

  const upsertMutation = useMutation({
    mutationFn: (prompt: string) => upsertPromptSchedule({ date, prompt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPT_SCHEDULE_KEY })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePromptSchedule(date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROMPT_SCHEDULE_KEY }),
  })

  const handleSave = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    upsertMutation.mutate(trimmed)
  }

  return (
    <div className="border-foreground/10 flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
      <span className="text-muted-foreground w-20 shrink-0 font-mono text-[10px] font-bold tracking-tight uppercase">
        {index === 0 ? 'TODAY' : `${day} ${month}`}
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') {
                setEditing(false)
                setDraft(item?.prompt ?? '')
              }
            }}
            placeholder="an elephant riding a bike"
            autoFocus
            className="border-foreground bg-background text-foreground w-full border px-2 py-1 text-xs"
          />
        ) : item ? (
          <span
            className={`text-xs ${isOwn ? 'text-foreground' : 'text-muted-foreground italic'}`}
          >
            {item.prompt}
            {!isOwn && (
              <span className="text-muted-foreground ml-2 font-mono text-[9px] tracking-tight uppercase not-italic">
                cont.
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
            no prompt
          </span>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={upsertMutation.isPending || !draft.trim()}
              className="text-foreground hover:bg-foreground/10 p-1 disabled:opacity-30"
              aria-label="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setDraft(item?.prompt ?? '')
              }}
              className="text-muted-foreground hover:bg-foreground/10 p-1"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : !item || isOwn ? (
          <>
            <button
              type="button"
              onClick={() => {
                setDraft(isOwn ? (item?.prompt ?? '') : '')
                setEditing(true)
              }}
              className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground p-1"
              aria-label="Edit prompt"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {isOwn && item && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove prompt for ${date}?`)) {
                    deleteMutation.mutate()
                  }
                }}
                disabled={deleteMutation.isPending}
                className="text-muted-foreground hover:text-foreground hover:bg-foreground/10 p-1 disabled:opacity-30"
                aria-label={`Remove prompt for ${date}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
