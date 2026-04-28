'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchCurrentPeriod, fetchArchive } from '@/lib/api/period'
import type { CurrentPeriodResponse } from '@/types/api'

export const periodQueryKey = ['period', 'current'] as const
export const archiveQueryKey = ['period', 'archive'] as const

export function useCurrentPeriodQuery(
  initialData?: CurrentPeriodResponse & { isMock?: boolean }
) {
  return useQuery({
    queryKey: periodQueryKey,
    queryFn: fetchCurrentPeriod,
    staleTime: 5_000,
    refetchInterval: 10_000, // Poll every 10s to see other users' claims
    retry: 1,
    initialData,
  })
}

export function useArchiveQuery(page = 1, perPage = 20) {
  return useQuery({
    queryKey: [...archiveQueryKey, page, perPage],
    queryFn: () => fetchArchive(page, perPage),
    retry: 1,
  })
}
