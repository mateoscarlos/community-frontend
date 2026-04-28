'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchDailyImage } from '@/lib/api/daily-image'
import type { DailyImageResponse } from '@/types/api'

export const dailyImageQueryKey = ['daily-image'] as const

export function useDailyImageQuery(
  initialData?: DailyImageResponse & { isMock?: boolean }
) {
  return useQuery({
    queryKey: dailyImageQueryKey,
    queryFn: fetchDailyImage,
    staleTime: 13 * 60 * 1000, // refetch ~2 min before 900s expiry
    retry: 1,
    initialData,
  })
}
