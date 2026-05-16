import type { Metadata } from 'next'
import { Geist, Geist_Mono, Schoolbell, Luckiest_Guy } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { A11yProvider } from '@/components/providers/A11yProvider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const handwritten = Schoolbell({
  variable: '--font-handwritten',
  subsets: ['latin'],
  weight: '400',
})
const logo = Luckiest_Guy({
  variable: '--font-logo',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  title: { default: 'Community', template: '%s | Community' },
  description: 'A collaborative daily photo game.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${handwritten.variable} ${logo.variable} antialiased`}
      >
        <ThemeProvider>
          <A11yProvider>{children}</A11yProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
