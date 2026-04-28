'use client'

import { useMutation } from '@tanstack/react-query'
import { submitFeedback } from '@/lib/api/feedback'
import type { FeedbackRequest } from '@/types/api'

export function useSubmitFeedbackMutation() {
  return useMutation({
    mutationFn: (body: FeedbackRequest) => submitFeedback(body),
  })
}
