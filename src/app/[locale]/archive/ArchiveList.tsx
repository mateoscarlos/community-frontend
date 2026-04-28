'use client'

import { useTranslation } from 'react-i18next'
import { useArchiveQuery } from '@/lib/query/period.queries'
import { Skeleton } from '@/components/ui/skeleton'

export function ArchiveList() {
  const { t } = useTranslation()
  const { data, isLoading } = useArchiveQuery()

  return (
    <div className="mx-auto max-w-xl space-y-10 px-6 py-12">
      <header className="border-foreground border-b pb-6">
        <h1 className="text-foreground text-4xl font-black tracking-tight uppercase">
          {t('archive.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-xs uppercase tracking-[0.2em]">
          {t('archive.subtitle')}
        </p>
      </header>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-none" />
          ))}

        {data?.periods.length === 0 && (
          <div className="border-foreground border p-12 text-center">
            <p className="text-muted-foreground text-sm uppercase tracking-[0.15em]">
              {t('archive.empty')}
            </p>
          </div>
        )}

        {data?.periods.length ? (
          <div className="border-foreground border">
            {data.periods.map((period, i) => (
              <div
                key={period.id}
                className={`group hover:bg-foreground hover:text-background flex cursor-pointer items-center justify-between px-6 py-5 transition-colors ${
                  i < data.periods.length - 1 ? 'border-foreground/20 border-b' : ''
                }`}
              >
                <div>
                  <p className="text-foreground group-hover:text-background text-lg font-black uppercase tracking-tight">
                    {new Date(period.started_at).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-muted-foreground group-hover:text-background/70 mt-1 text-[10px] font-bold uppercase tracking-[0.2em]">
                    {new Date(period.started_at).getFullYear()}
                  </p>
                </div>
                <span className="text-muted-foreground group-hover:text-background/80 font-mono text-[10px] uppercase tracking-[0.2em]">
                  {t('archive.phases', { count: period.phase })}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
