import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Server-only admin auth helpers.
 *
 * The raw admin secret lives only in the `ADMIN_SECRET` env var (never
 * `NEXT_PUBLIC_`, never sent to the browser). The session cookie stores a
 * SHA-256 of the secret, so a leaked cookie can't be replayed against the
 * backend (which expects the raw secret in `X-Admin-Secret`, known only
 * server-side).
 */

export const ADMIN_COOKIE = 'admin_session'

export function adminSecret(): string {
  return process.env.ADMIN_SECRET ?? ''
}

/** Token stored in the httpOnly cookie — a hash of the secret, not the secret. */
export function adminCookieToken(): string {
  const secret = adminSecret()
  if (!secret) return ''
  return createHash('sha256').update(secret).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** True if the supplied passphrase matches ADMIN_SECRET (constant-time). */
export function passphraseMatches(passphrase: string): boolean {
  const secret = adminSecret()
  return secret.length > 0 && safeEqual(passphrase, secret)
}

/** True if the cookie value is a valid admin session token. */
export function cookieIsValid(cookieValue: string | undefined): boolean {
  const expected = adminCookieToken()
  return expected.length > 0 && !!cookieValue && safeEqual(cookieValue, expected)
}

/** Backend base URL for server-side (BFF) calls. */
export function backendBaseUrl(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
}
