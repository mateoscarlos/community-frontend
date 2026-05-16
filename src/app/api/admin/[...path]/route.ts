import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  adminSecret,
  backendBaseUrl,
  cookieIsValid,
} from '@/lib/admin-auth'

// Server-side proxy for the admin (/debug/*) endpoints. The browser never
// sees the secret: it's injected here from the server-only ADMIN_SECRET env
// var. Access is gated by the httpOnly admin_session cookie, and the backend
// independently re-checks the X-Admin-Secret header.

export const dynamic = 'force-dynamic'

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  if (!adminSecret()) {
    return NextResponse.json({ error: 'admin disabled' }, { status: 503 })
  }
  if (!cookieIsValid(req.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const target = `${backendBaseUrl()}/debug/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`

  const headers: Record<string, string> = {
    'X-Admin-Secret': adminSecret(),
  }
  const contentType = req.headers.get('content-type')
  if (contentType) headers['Content-Type'] = contentType

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const body = hasBody ? await req.arrayBuffer() : undefined

  let backendRes: Response
  try {
    backendRes = await fetch(target, {
      method: req.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'backend unreachable' }, { status: 502 })
  }

  const resBody = await backendRes.arrayBuffer()
  return new NextResponse(resBody, {
    status: backendRes.status,
    headers: {
      'Content-Type': backendRes.headers.get('content-type') ?? 'application/json',
    },
  })
}

type Ctx = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path)
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path)
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path)
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path)
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path)
}
