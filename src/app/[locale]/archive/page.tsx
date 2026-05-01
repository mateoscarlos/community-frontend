import { getTranslations } from '@/lib/i18n/server'
import { isValidLocale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import { CalendarView } from './CalendarView'

interface ArchivePageProps {
  params: Promise<{ locale: string }>
}

export default async function ArchivePage({ params }: ArchivePageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  await getTranslations(locale)

  return <CalendarView />
}
