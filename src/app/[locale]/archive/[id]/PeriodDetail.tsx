'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePeriodByIdQuery, useArchiveQuery } from '@/lib/query/period.queries'
import { GameTopTabs } from '@/components/game/GameTopTabs'
import { ModalCloseButton } from '@/components/ui/ModalCloseButton'
import { Skeleton } from '@/components/ui/skeleton'

interface Mosaic {
  phase: number
  image_url: string
  composed_at: string
}

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

  // Horizontal filmstrip: scrolled by the side arrows (the bar is hidden).
  const stripRef = useRef<HTMLDivElement>(null)
  const scrollStrip = (dir: -1 | 1) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  // Click any phase to view it large in a lightbox.
  const [zoomed, setZoomed] = useState<Mosaic | null>(null)

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

      <div className="mt-6 w-full max-w-6xl">
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
            <div className="flex flex-col gap-14 lg:flex-row lg:items-start">
              {period.game_type === 'photo' && original?.image_url && (
                <div className="lg:w-72 lg:shrink-0">
                  <p
                    className="text-foreground/60 mb-4 text-center text-lg lg:text-left"
                    style={{ fontFamily: 'var(--font-handwritten)' }}
                  >
                    {t('archive.the_subject')}
                  </p>
                  <div className="group mx-auto w-full max-w-xs lg:mx-0">
                    <MattedFrame src={original.image_url} />
                    <div className="mt-3 flex justify-center">
                      <Plaque>{t('archive.the_subject')}</Plaque>
                    </div>
                  </div>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <p
                    className="text-foreground/60 text-lg"
                    style={{ fontFamily: 'var(--font-handwritten)' }}
                  >
                    {t('archive.evolution')}
                  </p>
                  {mosaics.length > 1 && (
                    <div className="flex shrink-0 gap-2">
                      <StripArrow dir={-1} onClick={() => scrollStrip(-1)} />
                      <StripArrow dir={1} onClick={() => scrollStrip(1)} />
                    </div>
                  )}
                </div>

                {mosaics.length > 0 ? (
                  <div className="relative">
                    <div
                      ref={stripRef}
                      className="evo-scroll -mx-4 flex snap-x snap-proximity items-start gap-6 overflow-x-auto px-4 pb-5 sm:-mx-0 sm:gap-9 sm:pr-10 sm:pl-0 lg:-mr-16 lg:pr-20"
                    >
                      {mosaics.map((m, i) => (
                        <div key={m.phase} className="flex items-center gap-6 sm:gap-9">
                          <button
                            type="button"
                            onClick={() => setZoomed(m)}
                            className="w-60 shrink-0 snap-center text-left sm:w-72"
                            aria-label={t('archive.phase_label', { phase: m.phase })}
                          >
                            <MattedFrame src={m.image_url} />
                            <div className="mt-3 flex justify-center">
                              <Plaque>
                                {t('archive.phase_label', { phase: m.phase })}
                              </Plaque>
                            </div>
                            <p className="text-muted-foreground mt-2 text-center font-mono text-[10px] tracking-[0.15em] uppercase">
                              {new Date(m.composed_at).toLocaleDateString(locale, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </button>
                          {i < mosaics.length - 1 && <EvoArrow />}
                        </div>
                      ))}
                    </div>
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
              <section className="mt-24">
                <p
                  className="text-foreground/60 mb-5 text-lg"
                  style={{ fontFamily: 'var(--font-handwritten)' }}
                >
                  {t('archive.this_month')}
                </p>
                <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-4 sm:-mx-0 sm:px-0">
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
                        className="shrink-0"
                      >
                        <div
                          className={`bg-foreground/5 relative h-24 w-24 overflow-hidden border-[3px] sm:h-28 sm:w-28 ${
                            isCurrent
                              ? 'border-foreground'
                              : 'border-foreground/40 opacity-70'
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
                            <span
                              className="text-foreground/30 absolute inset-0 flex items-center justify-center text-2xl"
                              style={{ fontFamily: 'var(--font-handwritten)' }}
                            >
                              ?
                            </span>
                          )}
                          <span
                            className="bg-foreground text-background absolute right-0 bottom-0 px-1.5 py-0.5 text-xs leading-none"
                            style={{ fontFamily: 'var(--font-handwritten)' }}
                          >
                            {label}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <ImageLightbox
        mosaic={zoomed}
        onClose={() => setZoomed(null)}
        label={zoomed ? t('archive.phase_label', { phase: zoomed.phase }) : ''}
        closeLabel={t('info.close')}
        timestamp={zoomed ? new Date(zoomed.composed_at).toLocaleString(locale) : ''}
      />
    </div>
  )
}

// Filmstrip nav arrow — lives in the section header, never over the art.
function StripArrow({ dir, onClick }: { dir: -1 | 1; onClick: () => void }) {
  const Icon = dir === -1 ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === -1 ? 'Scroll left' : 'Scroll right'}
      className="border-foreground/40 text-foreground hover:bg-foreground hover:text-background flex h-9 w-9 items-center justify-center border transition-colors"
    >
      <Icon className="h-5 w-5" strokeWidth={2.25} />
    </button>
  )
}

// Full-size view of a single phase, opened by clicking it in the strip.
function ImageLightbox({
  mosaic,
  onClose,
  label,
  timestamp,
  closeLabel,
}: {
  mosaic: Mosaic | null
  onClose: () => void
  label: string
  timestamp: string
  closeLabel: string
}) {
  const open = !!mosaic

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && mosaic && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            onClick={onClose}
            className="absolute inset-0"
            style={{
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-8">
            <motion.figure
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className="pointer-events-auto relative flex max-h-full flex-col items-center"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            >
              <div className="absolute -top-1 right-0 z-10 translate-x-1 -translate-y-full sm:-right-2">
                <ModalCloseButton onClick={onClose} ariaLabel={closeLabel} />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mosaic.image_url}
                alt={label}
                className="max-h-[78svh] w-auto max-w-full bg-white object-contain p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/15"
                draggable={false}
              />
              <figcaption className="mt-4 text-center text-sm tracking-[0.15em] text-white/80 uppercase">
                {label}
                {timestamp ? ` · ${timestamp}` : ''}
              </figcaption>
            </motion.figure>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// Flat-mounted artwork: a slim white border and a soft drop shadow so it
// sits just off the wall. Calm and static — no hover motion.
function MattedFrame({ src }: { src?: string }) {
  return (
    <div className="relative bg-white p-1 shadow-[0_10px_22px_-10px_rgba(0,0,0,0.6)] ring-1 ring-black/10">
      <div className="relative aspect-square w-full overflow-hidden bg-black/[0.04]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
            loading="lazy"
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-3xl text-black/20"
            style={{ fontFamily: 'var(--font-handwritten)' }}
          >
            ?
          </span>
        )}
      </div>
    </div>
  )
}

// Small museum tombstone label.
function Plaque({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-foreground/70 inline-block text-[11px] tracking-[0.15em] uppercase">
      {children}
    </span>
  )
}

// Hand-drawn arrow between phases — wobbly, with a little arrowhead.
function EvoArrow() {
  return (
    <svg
      viewBox="0 0 48 24"
      className="text-foreground/40 hidden h-6 w-12 shrink-0 sm:block"
      aria-hidden="true"
    >
      <path
        d="M 3 13 Q 16 7 30 13 T 43 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 36 6 L 44 12 L 36 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
