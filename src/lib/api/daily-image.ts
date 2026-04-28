import type { DailyImageResponse } from '@/types/api'
import { apiFetch } from './client'
import { mockDailyImageResponse } from './mock/daily-image'

export async function fetchDailyImage(): Promise<
  DailyImageResponse & { isMock?: boolean }
> {
  try {
    return await apiFetch<DailyImageResponse>('/daily-image')
  } catch {
    return { ...mockDailyImageResponse, isMock: true }
  }
}
