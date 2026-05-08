'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchCurrentPeriod, fetchArchive, fetchPeriod } from '@/lib/api/period'
import type { CurrentPeriodResponse, GameType } from '@/types/api'

// Prefix used to invalidate the query across all game types — React Query
// matches by prefix when the queryKey is partial.
export const periodQueryKey = ['period', 'current'] as const
export const periodQueryKeyFor = (gameType: GameType = 'photo') =>
  ['period', 'current', gameType] as const
export const archiveQueryKey = ['period', 'archive'] as const
export const periodByIdQueryKey = (id: string) => ['period', 'byId', id] as const

export function useCurrentPeriodQuery(
  gameType: GameType = 'photo',
  initialData?: CurrentPeriodResponse & { isMock?: boolean }
) {
  return useQuery({
    queryKey: periodQueryKeyFor(gameType),
    queryFn: () => fetchCurrentPeriod(gameType),
    staleTime: 5_000,
    refetchInterval: 10_000, // Poll every 10s to see other users' claims
    retry: 1,
    initialData,
  })
}

export function useArchiveQuery(
  gameType: GameType = 'photo',
  page = 1,
  perPage = 20
) {
  return useQuery({
    queryKey: [...archiveQueryKey, gameType, page, perPage],
    queryFn: () => fetchArchive(gameType, page, perPage),
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
