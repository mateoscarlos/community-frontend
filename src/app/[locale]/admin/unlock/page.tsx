'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SketchyBox } from '@/components/ui/SketchyBox'

export default function AdminUnlockPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) ?? 'en'
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passphrase || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      })
      if (res.ok) {
        router.replace(`/${locale}/admin`)
        return
      }
      setError(
        res.status === 429
          ? 'Too many attempts — wait a few minutes.'
          : 'Wrong passphrase — try again.'
      )
    } catch {
      setError('Something went wrong — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col items-center gap-6 text-center"
      >
        <h1 className="text-foreground font-handwritten text-4xl leading-tight">
          Team only
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter the admin passphrase to continue.
        </p>

        <input
          type="password"
          autoFocus
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Passphrase"
          className="border-foreground/60 text-foreground placeholder:text-muted-foreground focus:border-foreground font-handwritten w-full border bg-transparent px-4 py-3 text-center text-lg outline-none"
        />

        {error && (
          <p className="text-foreground font-handwritten text-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || !passphrase}
          className="text-foreground relative inline-flex h-16 w-44 items-center justify-center disabled:opacity-40"
        >
          <SketchyBox variant={3} />
          <span className="font-handwritten relative z-10 text-2xl leading-none">
            {busy ? '…' : 'Unlock'}
          </span>
        </button>
      </form>
    </div>
  )
}
