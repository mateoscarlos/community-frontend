import { getTranslations } from '@/lib/i18n/server'
import { isValidLocale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import { AdminPanel } from './AdminPanel'

interface AdminPageProps {
  params: Promise<{ locale: string }>
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  await getTranslations(locale)

  return <AdminPanel />
}
