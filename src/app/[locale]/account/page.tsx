import { getTranslations } from '@/lib/i18n/server'
import { isValidLocale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import { AccountView } from './AccountView'

interface AccountPageProps {
  params: Promise<{ locale: string }>
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  await getTranslations(locale)

  return <AccountView />
}
