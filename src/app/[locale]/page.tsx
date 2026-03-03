import { fetchHealth } from '@/lib/api/health'
import { getTranslations } from '@/lib/i18n/server'
import { isValidLocale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import { HealthStatus } from './HealthStatus'

interface HomePageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const [health, { t }] = await Promise.all([fetchHealth(), getTranslations(locale)])

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <section className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
          {t('nav.game')}
        </h1>
        <p className="text-muted-foreground max-w-md text-lg">
          A daily collaborative photo challenge. Claim a tile. Take a photo. Complete the
          picture.
        </p>

        <HealthStatus initialData={health} />
      </section>
    </div>
  )
}
