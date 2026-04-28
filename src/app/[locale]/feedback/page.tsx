import { getTranslations } from '@/lib/i18n/server'
import { isValidLocale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import { FeedbackForm } from './FeedbackForm'

interface FeedbackPageProps {
  params: Promise<{ locale: string }>
}

export default async function FeedbackPage({ params }: FeedbackPageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  await getTranslations(locale)

  return <FeedbackForm />
}
