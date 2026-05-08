import type { CurrentPeriodResponse, ArchiveListResponse, GameType } from '@/types/api'
import { apiFetch } from './client'
import { mockCurrentPeriodResponse } from './mock/period'

export async function fetchCurrentPeriod(
  gameType: GameType = 'photo'
): Promise<CurrentPeriodResponse & { isMock?: boolean }> {
  try {
    return await apiFetch<CurrentPeriodResponse>(
      `/api/v1/periods/current?game_type=${gameType}`
    )
  } catch {
    return { ...mockCurrentPeriodResponse, isMock: true }
  }
}

export async function fetchArchive(
  gameType: GameType = 'photo',
  page = 1,
  perPage = 20
): Promise<ArchiveListResponse> {
  return apiFetch<ArchiveListResponse>(
    `/api/v1/periods/archive?game_type=${gameType}&page=${page}&per_page=${perPage}`
  )
}

export async function fetchPeriod(id: string): Promise<CurrentPeriodResponse> {
  return apiFetch<CurrentPeriodResponse>(`/api/v1/periods/${id}`)
}
