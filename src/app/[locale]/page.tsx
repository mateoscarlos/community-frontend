import { fetchCurrentPeriod } from '@/lib/api/period'
import { getTranslations } from '@/lib/i18n/server'
import { isValidLocale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import { DailyImageGrid } from '@/components/game/DailyImageGrid'

interface HomePageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const [periodData] = await Promise.all([fetchCurrentPeriod(), getTranslations(locale)])

  return (
    <div className="flex flex-col">
      <DailyImageGrid initialData={periodData} />
    </div>
  )
}
