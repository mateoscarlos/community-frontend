import type { FeedbackRequest, FeedbackResponse } from '@/types/api'
import { apiFetch } from './client'

export async function submitFeedback(body: FeedbackRequest): Promise<FeedbackResponse> {
  return apiFetch<FeedbackResponse>('/api/v1/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
