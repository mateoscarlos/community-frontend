'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '@/lib/api/health'

export const healthQueryKey = ['health'] as const

export function useHealthQuery() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: fetchHealth,
    staleTime: 30_000,
    retry: 1,
  })
}
