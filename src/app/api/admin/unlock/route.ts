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

// Brute-force guard for the passphrase. In-memory and per-instance: it raises
// the cost of guessing without needing a datastore. A spoofed X-Forwarded-For
// can sidestep the per-IP bucket, so this is defence in depth behind a strong
// ADMIN_SECRET, not a replacement for one.
const WINDOW_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 10
const MAX_TRACKED_CLIENTS = 1000

const failures = new Map<string, { count: number; resetAt: number }>()

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

function isLockedOut(key: string, now: number): boolean {
  const entry = failures.get(key)
  return !!entry && now <= entry.resetAt && entry.count >= MAX_ATTEMPTS
}

function recordFailure(key: string, now: number): void {
  // Drop expired buckets before growing the map so a flood of distinct source
  // IPs can't turn this guard into a memory leak.
  if (failures.size >= MAX_TRACKED_CLIENTS) {
    for (const [k, v] of failures) if (now > v.resetAt) failures.delete(k)
  }

  const entry = failures.get(key)
  if (!entry || now > entry.resetAt) {
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  entry.count += 1
}

// POST: exchange the passphrase for an httpOnly session cookie.
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!adminSecret()) {
    return NextResponse.json({ error: 'admin disabled' }, { status: 503 })
  }

  const key = clientKey(req)
  const now = Date.now()
  if (isLockedOut(key, now)) {
    return NextResponse.json(
      { error: 'too many attempts — try again later' },
      { status: 429 }
    )
  }

  let passphrase = ''
  try {
    const body = (await req.json()) as { passphrase?: unknown }
    if (typeof body.passphrase === 'string') passphrase = body.passphrase
  } catch {
    // fall through — empty passphrase fails the check below
  }

  if (!passphraseMatches(passphrase)) {
    recordFailure(key, now)
    return NextResponse.json({ error: 'invalid passphrase' }, { status: 401 })
  }

  failures.delete(key)

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
