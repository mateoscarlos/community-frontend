'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { usePeriodByIdQuery, useArchiveQuery } from '@/lib/query/period.queries'
import { GameTopTabs } from '@/components/game/GameTopTabs'
import { SketchyBox } from '@/components/ui/SketchyBox'
import { Skeleton } from '@/components/ui/skeleton'

interface PeriodDetailProps {
  id: string
  locale: string
}

export function PeriodDetail({ id, locale }: PeriodDetailProps) {
  const { t, i18n } = useTranslation()
  const { data, isLoading, isError } = usePeriodByIdQuery(id)

  const period = data?.period
  const gameType = period?.game_type ?? 'photo'
  const mosaics = useMemo(
    () => [...(period?.phase_mosaics ?? [])].sort((a, b) => a.phase - b.phase),
    [period]
  )
  const original = period?.image

  // The other days in the same month, for the "more from this month" rail.
  const { data: archive } = useArchiveQuery(gameType)
  const monthRail = useMemo(() => {
    if (!period) return []
    const d = new Date(period.started_at)
    return (archive?.periods ?? [])
      .filter((p) => {
        const pd = new Date(p.started_at)
        return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()
      })
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
  }, [archive, period])

  const dateLabel = period
    ? new Date(period.started_at).toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <div className="bg-background flex min-h-svh flex-col items-center px-4 pb-20 sm:px-6">
      <GameTopTabs locale={locale} gameType={gameType} activeTab="museum" />

      <div className="mt-6 w-full max-w-5xl">
        <Link
          href={`/${locale}/archive`}
          className="text-foreground/70 hover:text-foreground inline-flex items-center gap-2 text-base transition-colors"
          style={{ fontFamily: 'var(--font-handwritten)' }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          {t('archive.back_museum')}
        </Link>

        {isLoading && (
          <div className="mt-10 space-y-8">
            <Skeleton className="h-10 w-2/3 rounded-none" />
            <Skeleton className="aspect-square w-full max-w-md rounded-none" />
          </div>
        )}

        {isError && (
          <div className="mt-20 text-center">
            <p
              className="text-foreground/70 text-2xl"
              style={{ fontFamily: 'var(--font-handwritten)' }}
            >
              {t('archive.detail_error')}
            </p>
          </div>
        )}

        {period && (
          <>
            {/* Title placard */}
            <div className="mt-8 mb-12 text-center">
              <h1
                className="text-foreground text-4xl leading-tight sm:text-5xl"
                style={{ fontFamily: 'var(--font-handwritten)' }}
              >
                {dateLabel}
              </h1>
              {period.game_type === 'prompt' && period.prompt && (
                <p
                  className="text-foreground/70 mt-2 text-xl sm:text-2xl"
                  style={{ fontFamily: 'var(--font-handwritten)' }}
                >
                  “{period.prompt}”
                </p>
              )}
              <p className="text-muted-foreground mt-3 text-[10px] font-bold tracking-[0.25em] uppercase">
                {t('archive.detail_count', { count: mosaics.length })}
              </p>
            </div>

            {/* Subject + evolution side by side on desktop, stacked on mobile */}
            <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
              {period.game_type === 'photo' && original?.image_url && (
                <div className="lg:w-64 lg:shrink-0">
                  <p
                    className="text-foreground/60 mb-3 text-center text-lg lg:text-left"
                    style={{ fontFamily: 'var(--font-handwritten)' }}
                  >
                    {t('archive.the_subject')}
                  </p>
                  <div className="relative mx-auto aspect-square w-full max-w-xs p-3 lg:mx-0">
                    <SketchyBox variant={1} strokeWidth={3} />
                    <div className="absolute inset-3 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={original.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p
                  className="text-foreground/60 mb-4 text-lg"
                  style={{ fontFamily: 'var(--font-handwritten)' }}
                >
                  {t('archive.evolution')}
                </p>

                {mosaics.length > 0 ? (
                  <div className="-mx-4 flex snap-x gap-6 overflow-x-auto px-4 pb-4 sm:-mx-0 sm:px-0">
                    {mosaics.map((m, i) => (
                      <div key={m.phase} className="flex items-center gap-6">
                        <div className="w-56 shrink-0 snap-center sm:w-64">
                          <div className="relative aspect-square w-full p-3">
                            <SketchyBox variant={i % 4} strokeWidth={3} />
                            <div className="bg-foreground/5 absolute inset-3 overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={m.image_url}
                                alt=""
                                className="h-full w-full object-cover"
                                draggable={false}
                                loading="lazy"
                              />
                            </div>
                          </div>
                          <div className="relative mx-auto -mt-1 flex h-9 w-4/5 items-center justify-center">
                            <SketchyBox variant={3} strokeWidth={2.5} />
                            <span
                              className="text-foreground relative z-10 text-base leading-none"
                              style={{ fontFamily: 'var(--font-handwritten)' }}
                            >
                              {t('archive.phase_label', { phase: m.phase })}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-2 text-center font-mono text-[10px] tracking-[0.15em] uppercase">
                            {new Date(m.composed_at).toLocaleDateString(locale, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {i < mosaics.length - 1 && (
                          <ArrowRight
                            className="text-foreground/40 hidden h-6 w-6 shrink-0 sm:block"
                            strokeWidth={2.5}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    className="text-foreground/60 py-12 text-center text-xl"
                    style={{ fontFamily: 'var(--font-handwritten)' }}
                  >
                    {t('archive.no_draws_yet')}
                  </p>
                )}
              </div>
            </div>

            {/* More from this month */}
            {monthRail.length > 1 && (
              <section className="mt-20">
                <p
                  className="text-foreground/60 mb-4 text-lg"
                  style={{ fontFamily: 'var(--font-handwritten)' }}
                >
                  {t('archive.this_month')}
                </p>
                <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 sm:-mx-0 sm:px-0">
                  {monthRail.map((p) => {
                    const isCurrent = p.id === id
                    const d = new Date(p.started_at)
                    const label = new Intl.DateTimeFormat(i18n.language, {
                      day: 'numeric',
                    }).format(d)
                    return (
                      <Link
                        key={p.id}
                        href={`/${locale}/archive/${p.id}`}
                        aria-current={isCurrent ? 'page' : undefined}
                        className="group shrink-0"
                      >
                        <motion.div
                          whileHover={{ y: -4 }}
                          className={`relative h-20 w-20 overflow-hidden sm:h-24 sm:w-24 ${
                            isCurrent
                              ? 'ring-foreground ring-2'
                              : 'opacity-60 group-hover:opacity-100'
                          }`}
                        >
                          {p.final_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.final_image_url}
                              alt=""
                              className="h-full w-full object-cover"
                              draggable={false}
                              loading="lazy"
                            />
                          ) : (
                            <div className="bg-foreground/10 h-full w-full" />
                          )}
                          <span className="bg-background/80 text-foreground absolute right-1 bottom-1 px-1 font-mono text-[10px] font-bold">
                            {label}
                          </span>
                        </motion.div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
