import { notFound } from 'next/navigation'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { I18nProvider } from '@/components/providers/I18nProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { isValidLocale, type Locale } from '@/lib/i18n/config'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  if (!isValidLocale(locale)) {
    notFound()
  }

  // Load translations server-side and pass to client
  const resources = await import(`../../../public/locales/${locale}/common.json`).then(
    (m) => ({ common: m.default })
  )

  return (
    <I18nProvider locale={locale as Locale} resources={resources}>
      <QueryProvider>
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster richColors position="bottom-right" />
      </QueryProvider>
    </I18nProvider>
  )
}

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'es' }, { locale: 'da' }]
}
