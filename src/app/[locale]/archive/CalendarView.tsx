'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useArchiveQuery } from '@/lib/query/period.queries'
import { Skeleton } from '@/components/ui/skeleton'
import type { ArchivePeriodResponse } from '@/types/api'

type MonthBucket = {
  year: number
  month: number // 0-11
  periodsByDay: Map<number, ArchivePeriodResponse>
}

const WEEK_START = 1 // Monday

export function CalendarView() {
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useArchiveQuery()

  const months = useMemo<MonthBucket[]>(() => {
    if (!data?.periods?.length) return []
    const map = new Map<string, MonthBucket>()
    for (const p of data.periods) {
      const d = new Date(p.started_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      let bucket = map.get(key)
      if (!bucket) {
        bucket = { year: d.getFullYear(), month: d.getMonth(), periodsByDay: new Map() }
        map.set(key, bucket)
      }
      bucket.periodsByDay.set(d.getDate(), p)
    }
    return Array.from(map.values()).sort((a, b) => b.year - a.year || b.month - a.month)
  }, [data])

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
    const base = new Date(2024, 0, 1) // Mon Jan 1 2024
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return fmt.format(d).slice(0, 2)
    })
  }, [i18n.language])

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-6 py-12">
      <header className="border-foreground border-b pb-6">
        <h1 className="text-foreground text-4xl font-black tracking-tight uppercase">
          {t('archive.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-xs tracking-[0.2em] uppercase">
          {t('archive.subtitle')}
        </p>
      </header>

      {isLoading && (
        <div className="space-y-6">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-none" />
          ))}
        </div>
      )}

      {!isLoading && months.length === 0 && (
        <div className="border-foreground border p-12 text-center">
          <p className="text-muted-foreground text-sm tracking-[0.15em] uppercase">
            {t('archive.empty')}
          </p>
        </div>
      )}

      {months.map((bucket) => (
        <MonthGrid
          key={`${bucket.year}-${bucket.month}`}
          bucket={bucket}
          weekdayLabels={weekdayLabels}
          locale={i18n.language}
        />
      ))}

      {months.length > 0 && (
        <p className="text-muted-foreground text-center text-[10px] tracking-[0.2em] uppercase">
          {t('archive.tap_hint')}
        </p>
      )}
    </div>
  )
}

function MonthGrid({
  bucket,
  weekdayLabels,
  locale,
}: {
  bucket: MonthBucket
  weekdayLabels: string[]
  locale: string
}) {
  const monthLabel = useMemo(() => {
    const d = new Date(bucket.year, bucket.month, 1)
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d)
  }, [bucket.year, bucket.month, locale])

  const cells = useMemo(() => {
    const firstDay = new Date(bucket.year, bucket.month, 1)
    const lastDay = new Date(bucket.year, bucket.month + 1, 0).getDate()
    const offset = (firstDay.getDay() - WEEK_START + 7) % 7

    const items: Array<{ day: number | null; period?: ArchivePeriodResponse }> = []
    for (let i = 0; i < offset; i++) items.push({ day: null })
    for (let d = 1; d <= lastDay; d++) {
      items.push({ day: d, period: bucket.periodsByDay.get(d) })
    }
    while (items.length % 7 !== 0) items.push({ day: null })
    return items
  }, [bucket])

  return (
    <section>
      <h2 className="text-foreground mb-4 text-2xl font-black tracking-tight uppercase">
        {monthLabel}
      </h2>

      <div className="border-foreground border">
        <div className="border-foreground/20 grid grid-cols-7 border-b">
          {weekdayLabels.map((label, i) => (
            <div
              key={i}
              className="text-muted-foreground border-foreground/20 border-r px-2 py-2 text-center text-[10px] font-bold tracking-[0.2em] uppercase last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, i) => (
            <DayCell
              key={i}
              day={cell.day}
              period={cell.period}
              index={i}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function DayCell({
  day,
  period,
  index,
  locale,
}: {
  day: number | null
  period?: ArchivePeriodResponse
  index: number
  locale: string
}) {
  const isLastCol = (index + 1) % 7 === 0
  const borderClass = `${isLastCol ? '' : 'border-foreground/10 border-r'} border-b`

  if (day === null) {
    return <div className={`bg-muted/20 aspect-square ${borderClass}`} />
  }

  const hasImage = !!period?.final_image_url
  const isPlaceholder = !!period && !hasImage

  const inner = (
    <>
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={period.final_image_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          loading="lazy"
        />
      )}
      {isPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-muted-foreground/40 h-2 w-2" />
        </div>
      )}
      <span
        className={`absolute top-1 right-1 font-mono text-[10px] font-bold tracking-tight ${
          hasImage
            ? 'text-background mix-blend-difference drop-shadow'
            : 'text-muted-foreground'
        }`}
      >
        {day}
      </span>
    </>
  )

  if (period) {
    return (
      <Link
        href={`/${locale}/archive/${period.id}`}
        className={`bg-foreground/5 hover:bg-foreground/15 relative aspect-square overflow-hidden transition-colors ${borderClass}`}
        title={new Date(period.started_at).toLocaleDateString(locale)}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className={`relative aspect-square overflow-hidden ${borderClass}`}>{inner}</div>
  )
}
