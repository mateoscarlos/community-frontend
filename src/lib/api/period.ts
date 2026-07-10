import type { CurrentPeriodResponse, ArchiveListResponse } from '@/types/api'
import { apiFetch } from './client'
import { mockCurrentPeriodResponse } from './mock/period'

export async function fetchCurrentPeriod(): Promise<
  CurrentPeriodResponse & { isMock?: boolean }
> {
  try {
    return await apiFetch<CurrentPeriodResponse>(`/api/v1/periods/current`)
  } catch {
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
