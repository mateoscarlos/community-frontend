'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronDown } from 'lucide-react'
import {
  listSessions,
  getSession,
  type SessionItem,
  type SessionClaimItem,
} from '@/lib/api/debug'

const SESSIONS_KEY = ['admin', 'sessions'] as const
const SESSION_DETAIL_KEY = (id: string) => ['admin', 'sessions', id] as const

/**
 * Lists every session that's ever claimed a tile, with aggregate stats.
 * Click a row to load and inline-expand the full claim history for that
 * session (claims with submission thumbnails when present).
 */
export function SessionsSection() {
  const { data, isLoading } = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: listSessions,
    staleTime: 30_000,
  })
  const [openId, setOpenId] = useState<string | null>(null)

  if (isLoading) {
    return <div className="border-foreground bg-muted/20 h-32 animate-pulse border" />
  }

  const sessions = data?.sessions ?? []
  if (sessions.length === 0) {
    return (
      <div className="border-foreground border p-8 text-center">
        <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
          No sessions yet — nobody has claimed a tile.
        </p>
      </div>
    )
  }

  return (
    <div className="border-foreground border">
      {sessions.map((s, i) => (
        <SessionRow
          key={s.session_id}
          session={s}
          isLast={i === sessions.length - 1}
          isOpen={openId === s.session_id}
          onToggle={() => setOpenId(openId === s.session_id ? null : s.session_id)}
        />
      ))}
    </div>
  )
}

function SessionRow({
  session,
  isLast,
  isOpen,
  onToggle,
}: {
  session: SessionItem
  isLast: boolean
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className={isLast ? '' : 'border-foreground/20 border-b'}>
      <button
        onClick={onToggle}
        className="hover:bg-foreground/5 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="text-muted-foreground h-3 w-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground h-3 w-3 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-bold tracking-tight">
            {session.latest_nickname || '(no nickname)'}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate font-mono text-[10px]">
            {session.session_id}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right font-mono text-[10px]">
          <Stat label="claims" value={session.total_claims} />
          <Stat label="drawn" value={session.drawn_count} />
          <Stat label="lost" value={session.released_count} />
        </div>
      </button>

      {isOpen && <SessionDetail sessionId={session.session_id} />}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground text-[9px] tracking-[0.2em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-0.5 text-sm font-bold">{value}</p>
    </div>
  )
}

function SessionDetail({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: SESSION_DETAIL_KEY(sessionId),
    queryFn: () => getSession(sessionId),
  })

  if (isLoading) {
    return (
      <div className="bg-muted/10 px-4 py-3">
        <div className="bg-muted/30 h-12 w-full animate-pulse" />
      </div>
    )
  }

  const claims = data?.claims ?? []
  if (claims.length === 0) {
    return (
      <div className="bg-muted/10 px-4 py-4 text-center">
        <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
          No claim history.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-muted/5 border-foreground/20 space-y-2 border-t px-4 py-3">
      {claims.map((c) => (
        <ClaimRow key={c.claim_id} claim={c} />
      ))}
    </div>
  )
}

function ClaimRow({ claim }: { claim: SessionClaimItem }) {
  const isDrawn = !!claim.submission_id
  const isReleased = !!claim.released_at && !isDrawn
  const status = isDrawn ? 'DRAWN' : isReleased ? 'RELEASED' : 'OPEN'

  return (
    <div className="border-foreground/10 flex items-start gap-3 border-b py-2 last:border-b-0">
      {claim.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={claim.image_url}
          alt=""
          className="border-foreground/20 h-12 w-12 flex-shrink-0 border object-cover"
          draggable={false}
          loading="lazy"
        />
      ) : (
        <div className="border-foreground/20 bg-muted/30 h-12 w-12 flex-shrink-0 border" />
      )}
      <div className="min-w-0 flex-1 text-[10px]">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-foreground font-mono font-bold tracking-tight">
            P{claim.phase} · {claim.row + 1},{claim.col + 1}
          </p>
          <span
            className={`px-1.5 py-0.5 font-mono text-[9px] tracking-[0.15em] ${
              isDrawn
                ? 'bg-foreground text-background'
                : 'border-foreground/40 text-muted-foreground border'
            }`}
          >
            {status}
          </span>
        </div>
        <p className="text-muted-foreground mt-1 tracking-[0.05em]">
          {claim.nickname || '(no nickname)'} · {fmt(claim.claimed_at)}
        </p>
      </div>
    </div>
  )
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
