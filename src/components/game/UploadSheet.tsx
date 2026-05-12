'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X, Clock } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useGameStore } from '@/lib/store/game.store'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { useCountdown, formatCountdown } from '@/lib/hooks/useCountdown'
import {
  useExtendClaimMutation,
  useReleaseClaimMutation,
} from '@/lib/query/claim.queries'
import {
  getPresignedUploadUrl,
  uploadFile,
  submitTile,
  pollStagedUpload,
  fetchStagedAsObjectUrl,
} from '@/lib/api/submission'
import { TileNeighborhood } from '@/components/game/TileNeighborhood'
import { PerspectiveEditor } from '@/components/game/PerspectiveEditor'
import type { TileResponse } from '@/types/api'

interface UploadSheetProps {
  tile: TileResponse | null
  imageUrl?: string
  /** Optional prompt text — shown for prompt-game tiles in place of the reference image. */
  prompt?: string
  gameType?: 'photo' | 'prompt'
  gridColumns: number
  gridRows: number
  /** All tiles in the current phase — used to render the neighbourhood context. */
  tiles: TileResponse[]
  /** ISO timestamp from the claim — used for the countdown. */
  expiresAt?: string | null
  onClose: () => void
  onSubmitted: () => void
}

type UploadStep = 'choose' | 'perspective' | 'uploading' | 'done' | 'error'

// Show the "give me 2 more minutes" button when the countdown drops below this.
const EXTEND_THRESHOLD_SECONDS = 120

export function UploadSheet({
  tile,
  imageUrl,
  prompt,
  gameType = 'photo',
  gridColumns,
  gridRows,
  tiles,
  expiresAt,
  onClose,
  onSubmitted,
}: UploadSheetProps) {
  const { t } = useTranslation()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'
  const { sessionId, unclaimTile, updateClaimExpiry } = useGameStore()
  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<UploadStep>('choose')
  const [preview, setPreview] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Countdown derived from claim expiry. Heartbeats are page-level (see
  // DailyImageGrid) so closing this sheet doesn't kill the claim — the user
  // can come back to it as long as they're still active in the app.
  const secondsLeft = useCountdown(tile && step !== 'done' ? (expiresAt ?? null) : null)
  const extendMutation = useExtendClaimMutation()
  const releaseMutation = useReleaseClaimMutation()

  // While the QR is showing on the laptop, poll the backend for a raw photo
  // the phone might have uploaded. Once it arrives, pull it down locally and
  // hand it to the perspective editor so the rest of the flow runs on the
  // big screen.
  const tileId = tile?.id ?? null
  const pollEnabled = !!tileId && !isMobile && step === 'choose'
  useEffect(() => {
    if (!pollEnabled || !tileId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      try {
        const url = await pollStagedUpload(tileId, sessionId)
        if (cancelled) return
        if (url) {
          const objectUrl = await fetchStagedAsObjectUrl(url)
          if (cancelled) {
            URL.revokeObjectURL(objectUrl)
            return
          }
          setPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return objectUrl
          })
          setStep('perspective')
          return
        }
      } catch {
        // Transient failures are fine — we'll try again on the next tick.
      }
      if (!cancelled) timer = setTimeout(tick, 2000)
    }

    tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [pollEnabled, tileId, sessionId])

  if (!tile) return null

  const handleExtend = () => {
    extendMutation.mutate(
      { tileId: tile.id, sessionId },
      {
        onSuccess: (data) => {
          updateClaimExpiry(tile.id, data.expires_at)
        },
      }
    )
  }

  // Closing the sheet keeps the claim alive — the page-level heartbeat keeps
  // the tile reserved for this session. The user can reopen the sheet by
  // tapping their tile in the grid (it shows the pencil icon).
  const handleClose = () => {
    onClose()
  }

  // Explicit "give up" — releases the claim on the backend, drops it
  // locally, and closes. Available from the choose + perspective steps.
  const handleRelease = () => {
    if (!tile) return
    const tileId = tile.id
    releaseMutation.mutate({ tileId, sessionId })
    unclaimTile(tileId)
    onClose()
  }

  const uploadUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${locale}/upload?tile=${tile.id}&session=${sessionId}&game=${gameType}`
      : ''

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Free a previous object URL if the user re-took the photo.
    if (preview) URL.revokeObjectURL(preview)

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setErrorMsg(null)
    setStep('perspective')
  }

  const handleCancelEditor = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setStep('choose')
  }

  // The merged editor returns the final, warped JPEG blob — upload it
  // directly without a separate crop step.
  const handlePerspectiveApplied = async (blob: Blob) => {
    if (preview) URL.revokeObjectURL(preview)
    const previewUrl = URL.createObjectURL(blob)
    setPreview(previewUrl)
    setStep('uploading')
    setErrorMsg(null)

    try {
      const presign = await getPresignedUploadUrl({
        tile_id: tile.id,
        session_id: sessionId,
        content_type: 'image/jpeg',
      })

      await uploadFile(presign.upload_url, blob)

      await submitTile(tile.id, {
        session_id: sessionId,
        storage_key: presign.storage_key,
        crop: { x: 0, y: 0, width: 1, height: 1 },
      })

      setStep('done')
      unclaimTile(tile.id)

      setTimeout(() => {
        onSubmitted()
        onClose()
      }, 1500)
    } catch (err) {
      setStep('error')
      setErrorMsg(err instanceof Error ? err.message : t('common.error'))
    }
  }

  const handleRetry = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setErrorMsg(null)
    setStep('choose')
  }

  return (
    <AnimatePresence>
      {tile && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="border-foreground bg-background fixed inset-x-0 bottom-0 z-50 flex max-h-[95svh] flex-col overflow-y-auto border-t px-6 pt-6 pb-8 md:inset-x-auto md:bottom-4 md:left-1/2 md:w-full md:max-w-2xl md:-translate-x-1/2 md:border lg:max-w-4xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground absolute top-4 right-4 z-10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-baseline justify-between">
                <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                  {t('upload.title')}
                </p>
                {(step === 'choose' || step === 'perspective') && (
                  <button
                    type="button"
                    onClick={handleRelease}
                    disabled={releaseMutation.isPending}
                    className="text-muted-foreground hover:text-foreground text-[10px] font-bold tracking-[0.15em] uppercase transition-colors disabled:opacity-30"
                  >
                    {t('upload.release')}
                  </button>
                )}
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-foreground font-mono text-xl font-black">
                  {tile.row + 1},{tile.col + 1}
                </p>
                {(step === 'choose' || step === 'perspective') && expiresAt && (
                  <div className="text-foreground flex items-center gap-1.5 font-mono text-sm font-bold tracking-tight">
                    <Clock className="h-3.5 w-3.5" />
                    <span
                      className={
                        secondsLeft <= EXTEND_THRESHOLD_SECONDS ? 'text-foreground' : ''
                      }
                    >
                      {formatCountdown(secondsLeft)}
                    </span>
                  </div>
                )}
              </div>

              {(step === 'choose' || step === 'perspective') &&
                expiresAt &&
                secondsLeft > 0 &&
                secondsLeft <= EXTEND_THRESHOLD_SECONDS && (
                  <button
                    onClick={handleExtend}
                    disabled={extendMutation.isPending}
                    className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-3 flex h-10 w-full items-center justify-center border text-[11px] font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-30"
                  >
                    {extendMutation.isPending ? '...' : t('upload.extend')}
                  </button>
                )}

              {(step === 'choose' || step === 'perspective') &&
                expiresAt &&
                secondsLeft === 0 && (
                  <div className="border-foreground mt-3 border border-dashed p-3 text-center">
                    <p className="text-foreground text-[11px] font-bold tracking-[0.15em] uppercase">
                      {t('upload.expired')}
                    </p>
                  </div>
                )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture={isMobile ? 'environment' : undefined}
              onChange={handleFileChange}
              className="hidden"
            />

            {step === 'choose' && (
              <div className="space-y-4 md:grid md:grid-cols-[18rem_1fr] md:gap-6 md:space-y-0">
                <div className="space-y-3">
                  {!imageUrl && prompt && (
                    <div className="border-foreground/40 border-2 border-dashed p-4 text-center">
                      <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                        Today&apos;s prompt
                      </p>
                      <p className="text-foreground mt-2 text-base font-bold tracking-tight">
                        “{prompt}”
                      </p>
                    </div>
                  )}
                  <TileNeighborhood
                    imageUrl={imageUrl}
                    tiles={tiles}
                    gridColumns={gridColumns}
                    gridRows={gridRows}
                    row={tile.row}
                    col={tile.col}
                    className="mx-auto w-full max-w-[14rem] md:max-w-none"
                  />
                </div>

                <div className="space-y-4">
                  {isMobile ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-foreground text-background hover:bg-foreground/90 flex h-14 w-full items-center justify-center text-sm font-bold tracking-[0.2em] uppercase transition-all"
                    >
                      {t('upload.take_photo')}
                    </button>
                  ) : (
                    <>
                      <div className="border-foreground flex flex-col items-center gap-3 border p-4">
                        <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                          {t('upload.scan_qr')}
                        </p>
                        <div className="bg-background border-foreground border p-2">
                          <QRCodeSVG value={uploadUrl} size={140} />
                        </div>
                        <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                          {t('upload.scan_qr_hint')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-foreground/20 h-px flex-1" />
                        <span className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                          {t('common.or')}
                        </span>
                        <div className="bg-foreground/20 h-px flex-1" />
                      </div>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-12 w-full items-center justify-center border text-sm font-bold tracking-[0.2em] uppercase transition-all"
                      >
                        {t('upload.choose_file')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {step === 'perspective' && preview && (
              <PerspectiveEditor
                imageSrc={preview}
                imageUrl={imageUrl}
                gridColumns={gridColumns}
                gridRows={gridRows}
                row={tile.row}
                col={tile.col}
                tiles={tiles}
                onCancel={handleCancelEditor}
                onConfirm={handlePerspectiveApplied}
              />
            )}

            {step === 'uploading' && (
              <div className="flex flex-col items-center gap-4 py-2">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt=""
                    className="border-foreground aspect-square w-full border object-cover"
                  />
                )}
                <p className="text-foreground text-xs font-bold tracking-[0.2em] uppercase">
                  {t('upload.uploading')}
                </p>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col items-center gap-4 py-2">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt=""
                    className="border-foreground aspect-square w-full border-2 object-cover"
                  />
                )}
                <p className="text-foreground text-xs font-bold tracking-[0.2em] uppercase">
                  ✓ {t('upload.success')}
                </p>
              </div>
            )}

            {step === 'error' && (
              <div className="space-y-4">
                <div className="border-foreground border border-dashed p-4 text-center">
                  <p className="text-foreground text-xs tracking-[0.15em] uppercase">
                    {errorMsg}
                  </p>
                </div>
                <button
                  onClick={handleRetry}
                  className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-14 w-full items-center justify-center border text-sm font-bold tracking-[0.2em] uppercase transition-all"
                >
                  {t('common.retry')}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
