'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { getPresignedUploadUrl, uploadFile, submitTile } from '@/lib/api/submission'

type Step = 'ready' | 'uploading' | 'done' | 'error'

export default function UploadPage() {
  const searchParams = useSearchParams()
  const tileId = searchParams.get('tile')
  const sessionId = searchParams.get('session')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('ready')
  const [preview, setPreview] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (tileId && sessionId) {
      fileInputRef.current?.click()
    }
  }, [tileId, sessionId])

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

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setStep('uploading')
    setErrorMsg(null)

    try {
      const presign = await getPresignedUploadUrl({
        tile_id: tileId,
        session_id: sessionId,
        content_type: file.type || 'image/jpeg',
      })

      await uploadFile(presign.upload_url, file)

      await submitTile(tileId, {
        session_id: sessionId,
        storage_key: presign.storage_key,
        crop: { x: 0, y: 0, width: 1, height: 1 },
      })

      setStep('done')
    } catch (err) {
      setStep('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      URL.revokeObjectURL(objectUrl)
      setPreview(null)
    }
  }

  const handleRetry = () => {
    setStep('ready')
    setPreview(null)
    setErrorMsg(null)
    setTimeout(() => fileInputRef.current?.click(), 100)
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {step === 'ready' && (
        <div className="w-full max-w-sm space-y-6 text-center">
          <p className="text-foreground text-2xl font-black tracking-tight uppercase">
            Take a Photo
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
        <div className="flex flex-col items-center gap-6">
          {preview && (
            <img
              src={preview}
              alt=""
              className="border-foreground h-48 w-48 border object-cover"
            />
          )}
          <p className="text-foreground text-xs font-bold tracking-[0.2em] uppercase">
            Uploading...
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6">
          {preview && (
            <img
              src={preview}
              alt=""
              className="border-foreground h-48 w-48 border-2 object-cover"
            />
          )}
          <p className="text-foreground text-xs font-bold tracking-[0.2em] uppercase">
            ✓ Submitted
          </p>
          <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
            You can close this tab
          </p>
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
