'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchCurrentPeriod, fetchArchive, fetchPeriod } from '@/lib/api/period'
import type { CurrentPeriodResponse } from '@/types/api'

export const periodQueryKey = ['period', 'current'] as const
export const archiveQueryKey = ['period', 'archive'] as const
export const periodByIdQueryKey = (id: string) => ['period', 'byId', id] as const

export function useCurrentPeriodQuery(
  initialData?: CurrentPeriodResponse & { isMock?: boolean }
) {
  return useQuery({
    queryKey: periodQueryKey,
    queryFn: () => fetchCurrentPeriod(),
    staleTime: 5_000,
    refetchInterval: 10_000, // Poll every 10s to see other users' claims
    retry: 1,
    // Mock data must never seed the cache: it would paint the placeholder
    // picture and then visibly swap to the real one on the first refetch.
    initialData: initialData?.isMock ? undefined : initialData,
  })
}

export function useArchiveQuery(page = 1, perPage = 20) {
  return useQuery({
    queryKey: [...archiveQueryKey, page, perPage],
    queryFn: () => fetchArchive(page, perPage),
    retry: 1,
  })
}

export function usePeriodByIdQuery(id: string) {
  return useQuery({
    queryKey: periodByIdQueryKey(id),
    queryFn: () => fetchPeriod(id),
    enabled: !!id,
    retry: 1,
  })
}
