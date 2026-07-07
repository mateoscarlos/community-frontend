'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { useGameStore } from '@/lib/store/game.store'
import { useSubmitFeedbackMutation } from '@/lib/query/feedback.queries'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { useCountdown, formatCountdown } from '@/lib/hooks/useCountdown'
import { SketchyBox } from '@/components/ui/SketchyBox'
import { ModalCloseButton } from '@/components/ui/ModalCloseButton'
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
import { normalizeImageFile } from '@/lib/image'
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
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<UploadStep>('choose')
  const [preview, setPreview] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Reveal QR panel on demand — Done expands it so the user has a "did
  // anything happen?" confirmation, instead of silently opening the camera
  // (desktop) or doing nothing useful.
  const [showQr, setShowQr] = useState(false)
  // Cancel asks for confirmation before releasing the tile, since dropping the
  // claim is destructive and the user may have tapped Cancel by accident.
  const [confirmReleaseOpen, setConfirmReleaseOpen] = useState(false)

  // Chrome / Firefox / Edge on iOS render a black-preview camera when the
  // input has `capture`. Drop it on those browsers so iOS shows its native
  // picker dialog (Camera / Photo Library); Safari iOS keeps capture and
  // goes straight to the camera.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !cameraInputRef.current) return
    if (/(CriOS|FxiOS|EdgiOS|OPiOS|GSA|YaBrowser)/.test(navigator.userAgent)) {
      cameraInputRef.current.removeAttribute('capture')
    }
  }, [])

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
    setConfirmReleaseOpen(false)
    onClose()
  }

  const uploadUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${locale}/upload?tile=${tile.id}&session=${sessionId}&game=${gameType}`
      : ''

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Free a previous object URL if the user re-took the photo.
    if (preview) URL.revokeObjectURL(preview)

    try {
      const normalized = await normalizeImageFile(file)
      const objectUrl = URL.createObjectURL(normalized)
      setPreview(objectUrl)
      setErrorMsg(null)
      setStep('perspective')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('common.error'))
      setStep('error')
    }
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
      // DoneStep owns the close timing now — it may hold the sheet open a
      // little longer to offer a one-tap reaction.
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

          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            <motion.div
              className="border-foreground bg-background pointer-events-auto relative flex max-h-[92svh] w-full max-w-3xl flex-col overflow-y-auto border px-6 pt-8 pb-8 sm:px-10 lg:max-w-4xl"
              initial={{ opacity: 0, scale: 0.92, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            >
              <ModalCloseButton onClick={handleClose} ariaLabel={t('info.close')} />

              {step === 'choose' ? (
                <div className="mb-6 text-center">
                  {expiresAt && (
                    <>
                      <p className="text-muted-foreground text-[10px] font-bold tracking-[0.25em] uppercase">
                        {t('upload.time_left')}
                      </p>
                      <p className="text-foreground font-handwritten mt-1 text-3xl leading-none tabular-nums sm:text-4xl">
                        {formatCountdown(secondsLeft)}
                      </p>
                    </>
                  )}
                  {prompt && (
                    <h2 className="text-foreground font-handwritten mt-4 text-2xl leading-tight sm:text-3xl">
                      {prompt}
                    </h2>
                  )}
                  {expiresAt &&
                    secondsLeft > 0 &&
                    secondsLeft <= EXTEND_THRESHOLD_SECONDS && (
                      <button
                        onClick={handleExtend}
                        disabled={extendMutation.isPending}
                        className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-4 inline-flex h-9 items-center justify-center border px-4 text-[11px] font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-30"
                      >
                        {extendMutation.isPending ? '...' : t('upload.extend')}
                      </button>
                    )}
                  {expiresAt && secondsLeft === 0 && (
                    <p className="text-foreground font-handwritten mt-3 text-lg">
                      {t('upload.expired')}
                    </p>
                  )}
                </div>
              ) : step === 'done' ? null : (
                <div className="mb-4">
                  <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                    {t('upload.title')}
                  </p>
                  <p className="text-foreground mt-1 font-mono text-xl font-black">
                    {tile.row + 1},{tile.col + 1}
                  </p>
                </div>
              )}

              {/* Desktop file picker can advertise HEIC explicitly — it has no
                  capture attribute, so iOS Safari's black-preview quirk doesn't
                  apply. */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,image/heic,image/heif,.heic,.heif"
                onChange={handleFileChange}
                className="hidden"
              />
              {/* Mobile camera: pair `capture` with a plain `image/*` accept.
                  iOS shows a black camera preview if the accept lists specific
                  HEIC types alongside capture. */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {step === 'choose' && (
                <div className="flex flex-col items-center gap-6 sm:gap-8">
                  <TileNeighborhood
                    imageUrl={imageUrl}
                    tiles={tiles}
                    gridColumns={gridColumns}
                    gridRows={gridRows}
                    row={tile.row}
                    col={tile.col}
                    promptMode={gameType === 'prompt'}
                    className="mx-auto w-full max-w-md sm:max-w-lg"
                  />

                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
                    <SketchyActionButton
                      onClick={() => {
                        if (isMobile) {
                          cameraInputRef.current?.click()
                        } else {
                          setShowQr((v) => !v)
                        }
                      }}
                      variant={0}
                    >
                      {t('upload.done')}
                    </SketchyActionButton>
                    <SketchyActionButton
                      onClick={() => setConfirmReleaseOpen(true)}
                      disabled={releaseMutation.isPending}
                      variant={1}
                    >
                      {t('upload.cancel')}
                    </SketchyActionButton>
                  </div>

                  <AnimatePresence initial={false}>
                    {showQr && !isMobile && (
                      <motion.div
                        key="qr-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="w-full overflow-hidden"
                      >
                        <div className="flex flex-col items-center justify-center gap-6 pt-2 sm:flex-row sm:items-start sm:gap-10">
                          <div className="flex flex-col items-center gap-2">
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
                          <div className="flex flex-col items-center gap-2 sm:pt-6">
                            <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                              {t('common.or')}
                            </p>
                            <SketchyActionButton
                              onClick={() => fileInputRef.current?.click()}
                              variant={2}
                            >
                              {t('upload.upload')}
                            </SketchyActionButton>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                <DoneStep
                  preview={preview}
                  onDone={() => {
                    onSubmitted()
                    onClose()
                  }}
                />
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
          </div>

          <ConfirmReleaseDialog
            open={confirmReleaseOpen}
            onCancel={() => setConfirmReleaseOpen(false)}
            onConfirm={handleRelease}
            busy={releaseMutation.isPending}
          />
        </>
      )}
    </AnimatePresence>
  )
}

function ConfirmReleaseDialog({
  open,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  busy?: boolean
}) {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            onClick={onCancel}
            className="absolute inset-0"
            style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              className="pointer-events-auto relative w-full max-w-md"
              style={{
                background: '#e6e6e6',
                color: '#111',
                boxShadow:
                  '0 25px 60px -18px rgba(0,0,0,0.7), 0 14px 32px -16px rgba(0,0,0,0.45)',
              }}
              initial={{ opacity: 0, scale: 0.92, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            >
              <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-7 text-center sm:px-9 sm:pt-10 sm:pb-9">
                <h3 className="font-handwritten text-2xl leading-none sm:text-3xl">
                  {t('upload.confirm_release_title')}
                </h3>
                <p className="text-[14px] leading-relaxed text-zinc-700 sm:text-[15px]">
                  {t('upload.confirm_release_body')}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={busy}
                    className="relative inline-flex h-12 w-32 items-center justify-center text-zinc-900 disabled:opacity-40 sm:h-14 sm:w-36"
                  >
                    <SketchyBox variant={1} />
                    <span className="font-handwritten relative z-10 text-xl leading-none sm:text-2xl">
                      {t('upload.confirm_release_yes')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={busy}
                    className="relative inline-flex h-12 w-32 items-center justify-center text-zinc-900 disabled:opacity-40 sm:h-14 sm:w-36"
                  >
                    <SketchyBox variant={3} />
                    <span className="font-handwritten relative z-10 text-xl leading-none sm:text-2xl">
                      {t('upload.confirm_release_no')}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Success screen. Beyond the "submitted" confirmation it offers an optional
// one-tap reaction — the highest-emotion moment in the app and the least
// annoying place to ask. It's shown on every completed upload (no per-device
// suppression for now). While it's asking, the sheet does NOT auto-close:
// the user votes, or dismisses it with the ✕ / backdrop. After a vote it
// shows "Thanks!" and closes on its own a couple of seconds later.
function DoneStep({ preview, onDone }: { preview: string | null; onDone: () => void }) {
  const { t } = useTranslation()
  const feedbackMutation = useSubmitFeedbackMutation()
  const [thanked, setThanked] = useState(false)
  const showStrip = !thanked

  // Keep a live ref to the close callback so the timer always calls the
  // latest one without re-arming on every parent re-render.
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  // Don't auto-close while the reaction is on screen — the sheet must hold
  // still so the user can vote (or dismiss it themselves via the ✕ button or
  // backdrop). After a vote, linger a beat on "Thanks!" so the screen doesn't
  // yank away, then close.
  useEffect(() => {
    if (showStrip) return
    const id = setTimeout(() => onDoneRef.current(), 2600)
    return () => clearTimeout(id)
  }, [showStrip])

  const pick = (rating: number) => {
    setThanked(true)
    // Fire-and-forget — the rating is captured server-side; the user never
    // waits on it and an error here must not disrupt the flow.
    feedbackMutation.mutate({ message: '', rating, context: 'post_upload' })
  }

  const faces = [
    { rating: 3, emoji: '🙂', label: t('feedback.rate_good') },
    { rating: 2, emoji: '😐', label: t('feedback.rate_ok') },
    { rating: 1, emoji: '🙁', label: t('feedback.rate_bad') },
  ]

  return (
    // Success text + the vote come first so they're visible immediately with
    // no scrolling; the drawing preview sits below as the reward.
    <div className="flex flex-col items-center gap-4 py-2">
      <p className="text-foreground text-xs font-bold tracking-[0.2em] uppercase">
        ✓ {t('upload.success')}
      </p>

      <AnimatePresence mode="wait">
        {showStrip ? (
          <motion.div
            key="ask"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <p className="text-foreground font-handwritten text-xl leading-none sm:text-2xl">
              {t('feedback.rate_q')}
            </p>
            <div className="flex items-start gap-2 sm:gap-4">
              {faces.map((f) => (
                <button
                  key={f.rating}
                  type="button"
                  onClick={() => pick(f.rating)}
                  aria-label={f.label}
                  className="hover:bg-foreground/10 flex w-20 flex-col items-center gap-1 px-2 py-2 transition-colors sm:w-24"
                >
                  <span className="text-3xl sm:text-4xl">{f.emoji}</span>
                  <span className="text-muted-foreground text-[10px] tracking-[0.12em] uppercase">
                    {f.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : thanked ? (
          <motion.p
            key="thanks"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 320 }}
            className="text-foreground font-handwritten text-xl leading-none sm:text-2xl"
          >
            {t('feedback.rate_thanks')}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="border-foreground aspect-square w-full max-w-xs border-2 object-cover sm:max-w-sm"
        />
      )}
    </div>
  )
}

function SketchyActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-foreground relative inline-flex h-14 w-24 items-center justify-center disabled:opacity-40 sm:h-16 sm:w-32"
    >
      <SketchyBox variant={variant} />
      <span className="font-handwritten relative z-10 text-xl leading-none sm:text-2xl">
        {children}
      </span>
    </button>
  )
}
