'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useGameStore } from '@/lib/store/game.store'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { getPresignedUploadUrl, uploadFile, submitTile } from '@/lib/api/submission'
import type { TileResponse } from '@/types/api'

interface UploadSheetProps {
  tile: TileResponse | null
  imageUrl?: string
  gridColumns: number
  gridRows: number
  onClose: () => void
  onSubmitted: () => void
}

type UploadStep = 'choose' | 'uploading' | 'done' | 'error'

export function UploadSheet({
  tile,
  imageUrl,
  gridColumns,
  gridRows,
  onClose,
  onSubmitted,
}: UploadSheetProps) {
  const { t } = useTranslation()
  const { sessionId, unclaimTile } = useGameStore()
  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<UploadStep>('choose')
  const [preview, setPreview] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setStep('choose')
    setPreview(null)
    setErrorMsg(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [tile?.id])

  if (!tile) return null

  const uploadUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/upload?tile=${tile.id}&session=${sessionId}`
      : ''

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setStep('uploading')
    setErrorMsg(null)

    try {
      const presign = await getPresignedUploadUrl({
        tile_id: tile.id,
        session_id: sessionId,
        content_type: file.type || 'image/jpeg',
      })

      await uploadFile(presign.upload_url, file)

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
      URL.revokeObjectURL(objectUrl)
      setPreview(null)
    }
  }

  const handleRetry = () => {
    setStep('choose')
    setPreview(null)
    setErrorMsg(null)
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
            onClick={onClose}
          />

          <motion.div
            className="border-foreground bg-background fixed inset-x-0 bottom-0 z-50 border-t px-6 pt-6 pb-8 md:inset-x-auto md:bottom-8 md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:border"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground absolute top-4 right-4 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 flex items-start gap-4">
              {imageUrl && (
                <div className="border-foreground relative h-20 w-20 flex-shrink-0 overflow-hidden border">
                  <div
                    className="absolute"
                    style={{
                      width: `${gridColumns * 100}%`,
                      height: `${gridRows * 100}%`,
                      left: `-${tile.col * 100}%`,
                      top: `-${tile.row * 100}%`,
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                </div>
              )}
              <div className="flex-1 pt-1">
                <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                  {t('upload.title')}
                </p>
                <p className="text-foreground mt-1 font-mono text-2xl font-black">
                  {tile.row + 1},{tile.col + 1}
                </p>
                <p className="text-muted-foreground mt-2 text-[10px] tracking-[0.15em] uppercase">
                  {t('upload.hint')}
                </p>
              </div>
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
                    <div className="border-foreground flex flex-col items-center gap-3 border p-6">
                      <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                        {t('upload.scan_qr')}
                      </p>
                      <div className="bg-background border-foreground border p-2">
                        <QRCodeSVG value={uploadUrl} size={160} />
                      </div>
                      <p className="text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                        {t('upload.scan_qr_hint')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-foreground/20 h-px flex-1" />
                      <span className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                        {t('account.or')}
                      </span>
                      <div className="bg-foreground/20 h-px flex-1" />
                    </div>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="border-foreground text-foreground hover:bg-foreground hover:text-background flex h-14 w-full items-center justify-center border text-sm font-bold tracking-[0.2em] uppercase transition-all"
                    >
                      {t('upload.choose_file')}
                    </button>
                  </>
                )}
              </div>
            )}

            {step === 'uploading' && (
              <div className="flex flex-col items-center gap-4 py-4">
                {preview && (
                  <img
                    src={preview}
                    alt=""
                    className="border-foreground h-32 w-32 border object-cover"
                  />
                )}
                <p className="text-foreground text-xs font-bold tracking-[0.2em] uppercase">
                  {t('upload.uploading')}
                </p>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col items-center gap-4 py-4">
                {preview && (
                  <img
                    src={preview}
                    alt=""
                    className="border-foreground h-32 w-32 border-2 object-cover"
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
