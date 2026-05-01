'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { usePeriodByIdQuery } from '@/lib/query/period.queries'
import { Skeleton } from '@/components/ui/skeleton'

interface PeriodDetailProps {
  id: string
  locale: string
}

export function PeriodDetail({ id, locale }: PeriodDetailProps) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = usePeriodByIdQuery(id)

  const period = data?.period
  const mosaics = period?.phase_mosaics ?? []
  const original = period?.image

  const dateLabel = period
    ? new Date(period.started_at).toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/${locale}/archive`}
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        {t('archive.back')}
      </Link>

      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-12 w-2/3 rounded-none" />
          <Skeleton className="aspect-square w-full rounded-none" />
        </div>
      )}

      {isError && (
        <div className="border-foreground border p-12 text-center">
          <p className="text-muted-foreground text-sm tracking-[0.15em] uppercase">
            {t('archive.detail_error')}
          </p>
        </div>
      )}

      {period && (
        <>
          <header className="border-foreground border-b pb-6">
            <h1 className="text-foreground text-3xl font-black tracking-tight uppercase">
              {dateLabel}
            </h1>
            <p className="text-muted-foreground mt-2 font-mono text-[10px] tracking-[0.2em] uppercase">
              {t('archive.detail_count', { count: mosaics.length })}
            </p>
          </header>

          {original?.image_url && (
            <section className="mt-10">
              <h2 className="text-muted-foreground mb-3 text-[10px] font-bold tracking-[0.2em] uppercase">
                {t('archive.original')}
              </h2>
              <div className="border-foreground relative aspect-square w-full overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={original.image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                />
              </div>
            </section>
          )}

          {mosaics.length > 0 && (
            <section className="mt-12 space-y-10">
              <h2 className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                {t('archive.draws')}
              </h2>
              {mosaics.map((m) => (
                <article key={m.phase}>
                  <p className="text-foreground mb-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">
                    {t('archive.phase_label', { phase: m.phase })}
                  </p>
                  <div className="border-foreground relative aspect-square w-full overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.image_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                      loading="lazy"
                    />
                  </div>
                  <p className="text-muted-foreground mt-2 font-mono text-[10px] tracking-[0.15em] uppercase">
                    {new Date(m.composed_at).toLocaleString(locale)}
                  </p>
                </article>
              ))}
            </section>
          )}

          {mosaics.length === 0 && (
            <div className="border-foreground mt-10 border border-dashed p-12 text-center">
              <p className="text-muted-foreground text-sm tracking-[0.15em] uppercase">
                {t('archive.no_draws_yet')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
