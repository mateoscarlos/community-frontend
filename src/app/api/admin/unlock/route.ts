import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  adminCookieToken,
  adminSecret,
  passphraseMatches,
} from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// 8 hours — long enough for an admin session, short enough to re-auth daily.
const MAX_AGE = 60 * 60 * 8

// POST: exchange the passphrase for an httpOnly session cookie.
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!adminSecret()) {
    return NextResponse.json({ error: 'admin disabled' }, { status: 503 })
  }

  let passphrase = ''
  try {
    const body = (await req.json()) as { passphrase?: unknown }
    if (typeof body.passphrase === 'string') passphrase = body.passphrase
  } catch {
    // fall through — empty passphrase fails the check below
  }

  if (!passphraseMatches(passphrase)) {
    return NextResponse.json({ error: 'invalid passphrase' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, adminCookieToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
  return res
}

// DELETE: log out (clear the cookie).
export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
