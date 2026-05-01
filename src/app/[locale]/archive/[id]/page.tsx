import { getTranslations } from '@/lib/i18n/server'
import { isValidLocale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import { PeriodDetail } from './PeriodDetail'

interface PeriodDetailPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function PeriodDetailPage({ params }: PeriodDetailPageProps) {
  const { locale, id } = await params
  if (!isValidLocale(locale)) notFound()

  await getTranslations(locale)

  return <PeriodDetail id={id} locale={locale} />
}
