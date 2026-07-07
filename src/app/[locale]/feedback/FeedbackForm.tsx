'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSubmitFeedbackMutation } from '@/lib/query/feedback.queries'
import { AppNav } from '@/components/layout/AppNav'

export function FeedbackForm() {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const mutation = useSubmitFeedbackMutation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    mutation.mutate(
      { message: message.trim(), contact: contact.trim() || undefined },
      {
        onSuccess: () => {
          setMessage('')
          setContact('')
        },
      }
    )
  }

  return (
    <div className="min-h-svh px-4 pb-20 sm:px-6">
      <AppNav />
      <div className="mx-auto mt-8 max-w-xl space-y-10 sm:mt-10">
        <header className="border-foreground border-b pb-6">
          <h1 className="text-foreground text-4xl font-black tracking-tight uppercase">
            {t('feedback.title')}
          </h1>
          <p className="text-muted-foreground mt-2 text-xs tracking-[0.2em] uppercase">
            {t('feedback.subtitle')}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-muted-foreground block text-[10px] font-bold tracking-[0.2em] uppercase">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedback.placeholder')}
              className="bg-background border-foreground text-foreground placeholder:text-muted-foreground focus:ring-foreground min-h-[140px] w-full border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground block text-[10px] font-bold tracking-[0.2em] uppercase">
              Contact (optional)
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('feedback.contact_placeholder')}
              className="bg-background border-foreground text-foreground placeholder:text-muted-foreground focus:ring-foreground w-full border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending || !message.trim()}
            className="bg-foreground text-background hover:bg-foreground/90 flex h-14 w-full items-center justify-center text-sm font-bold tracking-[0.2em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-30"
          >
            {mutation.isPending ? '...' : t('feedback.submit')}
          </button>

          {mutation.isSuccess && (
            <div className="border-foreground border border-dashed p-4 text-center">
              <p className="text-foreground text-xs font-bold tracking-[0.2em] uppercase">
                ✓ {t('feedback.success')}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
