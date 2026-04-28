import { getTranslations } from '@/lib/i18n/server'
import { isValidLocale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import { BlogList } from './BlogList'

interface BlogPageProps {
  params: Promise<{ locale: string }>
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  await getTranslations(locale)

  return <BlogList />
}
