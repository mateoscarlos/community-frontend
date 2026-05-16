import { NextRequest, NextResponse } from 'next/server'
import acceptLanguage from 'accept-language'
import { locales, defaultLocale, isValidLocale, type Locale } from '@/lib/i18n/config'

acceptLanguage.languages([...locales])

const PUBLIC_FILE = /\.(.*)$/
const COOKIE_NAME = 'NEXT_LOCALE'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Check if the pathname already starts with a supported locale
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameLocale) {
    // Gate the admin area: without an admin session cookie, bounce to the
    // unlock screen. This is a UX guard only — the real enforcement is the
    // BFF (/api/admin/*) re-validating the cookie hash and the backend
    // re-checking X-Admin-Secret. Edge runtime can't do the crypto compare,
    // so a presence check here is intentional.
    const adminBase = `/${pathnameLocale}/admin`
    const unlockPath = `${adminBase}/unlock`
    const inAdmin = pathname === adminBase || pathname.startsWith(`${adminBase}/`)
    const inUnlock = pathname === unlockPath || pathname.startsWith(`${unlockPath}/`)
    if (inAdmin && !inUnlock && !request.cookies.get('admin_session')?.value) {
      const url = request.nextUrl.clone()
      url.pathname = unlockPath
      return NextResponse.redirect(url)
    }

    // Store locale in cookie for future requests
    const response = NextResponse.next()
    response.cookies.set(COOKIE_NAME, pathnameLocale)
    return response
  }

  // Detect locale: cookie → Accept-Language header → default
  let detectedLocale: Locale = defaultLocale

  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value
  if (cookieLocale && isValidLocale(cookieLocale)) {
    detectedLocale = cookieLocale
  } else {
    const headerLocale = acceptLanguage.get(request.headers.get('Accept-Language'))
    if (headerLocale && isValidLocale(headerLocale)) {
      detectedLocale = headerLocale
    }
  }

  // Redirect to locale-prefixed path
  const url = request.nextUrl.clone()
  url.pathname = `/${detectedLocale}${pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
