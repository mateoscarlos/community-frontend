import { fetchCurrentPeriod } from '@/lib/api/period'
import { getTranslations } from '@/lib/i18n/server'
import { isValidLocale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import { DailyImageGrid } from '@/components/game/DailyImageGrid'

interface PlayPageProps {
  params: Promise<{ locale: string }>
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  // A failed server-side fetch must not block the page: hand the client no
  // seed data and let it render the skeleton while it fetches for itself.
  const [periodData] = await Promise.all([
    fetchCurrentPeriod().catch(() => undefined),
    getTranslations(locale),
  ])

  return (
    <div className="flex flex-col">
      <DailyImageGrid initialData={periodData} />
    </div>
  )
}
