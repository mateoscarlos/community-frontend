import { fetchCurrentPeriod } from '@/lib/api/period'
import { getTranslations } from '@/lib/i18n/server'
import { isValidLocale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import { DailyImageGrid } from '@/components/game/DailyImageGrid'
import type { GameType } from '@/types/api'

interface PlayPageProps {
  params: Promise<{ locale: string; game: string }>
}

function isGameType(g: string): g is GameType {
  return g === 'photo' || g === 'prompt'
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { locale, game } = await params
  if (!isValidLocale(locale)) notFound()
  if (!isGameType(game)) notFound()

  const [periodData] = await Promise.all([
    fetchCurrentPeriod(game),
    getTranslations(locale),
  ])

  return (
    <div className="flex flex-col">
      <DailyImageGrid gameType={game} initialData={periodData} />
    </div>
  )
}
