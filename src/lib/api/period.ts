import type { CurrentPeriodResponse, ArchiveListResponse } from '@/types/api'
import { apiFetch } from './client'
import { mockCurrentPeriodResponse } from './mock/period'

export async function fetchCurrentPeriod(): Promise<
  CurrentPeriodResponse & { isMock?: boolean }
> {
  try {
    return await apiFetch<CurrentPeriodResponse>(`/api/v1/periods/current`)
  } catch (err) {
    // Outside local dev, never fabricate a period: painting a placeholder photo
    // as if it were today's picture reads as a glitch when the real one lands a
    // moment later. Let it throw so the grid shows its retry state instead.
    if (process.env.NODE_ENV === 'production') throw err
    // The fallback used to swallow this silently, which hid real backend
    // outages behind a stock photo.
    console.error('fetchCurrentPeriod failed — using mock period (dev only)', err)
    return { ...mockCurrentPeriodResponse, isMock: true }
  }
}

export async function fetchArchive(page = 1, perPage = 20): Promise<ArchiveListResponse> {
  return apiFetch<ArchiveListResponse>(
    `/api/v1/periods/archive?page=${page}&per_page=${perPage}`
  )
}

export async function fetchPeriod(id: string): Promise<CurrentPeriodResponse> {
  return apiFetch<CurrentPeriodResponse>(`/api/v1/periods/${id}`)
}
