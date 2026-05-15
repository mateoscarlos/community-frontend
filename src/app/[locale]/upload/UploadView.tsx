'use client'

import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getStagePresignedUrl, uploadFile } from '@/lib/api/submission'
import { fetchCurrentPeriod } from '@/lib/api/period'
import { normalizeImageFile } from '@/lib/image'
import type { GameType } from '@/types/api'
import { TileNeighborhood } from '@/components/game/TileNeighborhood'

type Step = 'ready' | 'uploading' | 'done' | 'error'

export function UploadView() {
  const searchParams = useSearchParams()
  const tileId = searchParams.get('tile')
  const sessionId = searchParams.get('session')
  const gameType: GameType = searchParams.get('game') === 'prompt' ? 'prompt' : 'photo'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('ready')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Fetch the current period so we can render the same neighbourhood preview
  // the laptop is showing — without it the phone target was a black box.
  const { data: period } = useQuery({
    queryKey: ['period', 'current', 'upload-page', gameType],
    queryFn: () => fetchCurrentPeriod(gameType),
    enabled: !!tileId && !!sessionId,
    retry: 1,
  })
  const tiles = period?.grid?.tiles ?? []
  const tile = tiles.find((t) => t.id === tileId)
  const imageUrl = period?.period?.image?.image_url
  const gridColumns = period?.grid?.columns ?? 0
  const gridRows = period?.grid?.rows ?? 0

  if (!tileId || !sessionId) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center p-6">
        <div className="border-foreground border p-8 text-center">
          <p className="text-foreground text-sm font-bold tracking-[0.2em] uppercase">
            Invalid Upload Link
          </p>
          <p className="text-muted-foreground mt-2 text-[10px] tracking-[0.15em] uppercase">
            Scan the QR code from the game page
          </p>
        </div>
      </div>
    )
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setStep('uploading')
    setErrorMsg(null)
    try {
      const normalized = await normalizeImageFile(file)
      const presign = await getStagePresignedUrl(tileId, sessionId)
      await uploadFile(presign.upload_url, normalized)
      setStep('done')
    } catch (err) {
      setStep('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleRetry = () => {
    setErrorMsg(null)
    setStep('ready')
    setTimeout(() => fileInputRef.current?.click(), 100)
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,image/heic,image/heif,.heic,.heif"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {step === 'ready' && (
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
              Your tile
            </p>
            {tile && (
              <p className="text-foreground mt-1 font-mono text-xl font-black">
                {tile.row + 1},{tile.col + 1}
              </p>
            )}
          </div>

          {tile ? (
            <TileNeighborhood
              imageUrl={imageUrl}
              tiles={tiles}
              gridColumns={gridColumns}
              gridRows={gridRows}
              row={tile.row}
              col={tile.col}
              className="w-full"
            />
          ) : (
            <div className="border-foreground bg-foreground/5 aspect-square w-full border-2" />
          )}

          <p className="text-muted-foreground px-4 text-center text-[11px] tracking-[0.15em] uppercase">
            Take a photo of your drawing — you&apos;ll finish editing on your laptop.
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-foreground text-background hover:bg-foreground/90 flex h-14 w-full items-center justify-center text-sm font-bold tracking-[0.2em] uppercase transition-all"
          >
            Open Camera
          </button>
        </div>
      )}

      {step === 'uploading' && (
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <p className="text-foreground text-xs font-bold tracking-[0.2em] uppercase">
            Sending...
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <p className="text-foreground text-xl font-black tracking-tight">✓ Sent</p>
          <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
            Return to your laptop to finish editing.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-2 flex h-12 w-full items-center justify-center border text-[11px] font-bold tracking-[0.15em] uppercase transition-all"
          >
            Retake Photo
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="w-full max-w-sm space-y-4">
          <div className="border-foreground border border-dashed p-4 text-center">
            <p className="text-foreground text-xs tracking-[0.15em] uppercase">
              {errorMsg}
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-14 w-full items-center justify-center border text-sm font-bold tracking-[0.2em] uppercase transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
