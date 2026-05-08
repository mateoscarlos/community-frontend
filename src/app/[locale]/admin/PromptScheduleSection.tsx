'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import {
  listPromptSchedule,
  upsertPromptSchedule,
  deletePromptSchedule,
  type PromptScheduleItem,
} from '@/lib/api/debug'

const PROMPT_SCHEDULE_KEY = ['admin', 'prompt-schedule'] as const
const VISIBLE_DAYS = 30

/**
 * Admin section for the parallel prompt-game schedule. Each day cell holds a
 * text prompt instead of an image. The sweeper auto-promotes today's prompt
 * to an active period at midnight Cph.
 */
export function PromptScheduleSection() {
  const { data, isLoading } = useQuery({
    queryKey: PROMPT_SCHEDULE_KEY,
    queryFn: listPromptSchedule,
  })

  const today = new Date()
  const days: { date: string; item?: PromptScheduleItem }[] = []
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
        Next 30 days — prompt promoted at midnight (Copenhagen)
      </p>

      {isLoading && (
        <div className="border-foreground bg-muted/20 h-32 animate-pulse border" />
      )}

      <div className="border-foreground border">
        {days.map(({ date, item }, i) => (
          <PromptRow key={date} date={date} item={item} index={i} />
        ))}
      </div>
    </div>
  )
}

function PromptRow({
  date,
  item,
  index,
}: {
  date: string
  item?: PromptScheduleItem
  index: number
}) {
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
          <span className="text-foreground text-xs">{item.prompt}</span>
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
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setDraft(item?.prompt ?? '')
                setEditing(true)
              }}
              className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground p-1"
              aria-label="Edit prompt"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {item && (
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
        )}
      </div>
    </div>
  )
}
