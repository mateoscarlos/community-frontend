'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { claimTile, releaseClaim } from '@/lib/api/claim'
import { ApiError } from '@/lib/api/client'
import { periodQueryKey } from './period.queries'

export function useClaimTileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      tileId,
      nickname,
      sessionId,
    }: {
      tileId: string
      nickname: string
      sessionId: string
    }) => claimTile(tileId, { nickname, session_id: sessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: periodQueryKey })
    },
    onError: (error) => {
      // Always refresh tiles on error — the grid state is likely stale.
      queryClient.invalidateQueries({ queryKey: periodQueryKey })

      // 409 = tile was claimed by someone else between render and click.
      if (error instanceof ApiError && error.status === 409) {
        return // handled by the component via isConflict
      }
    },
  })
}

/** Check if a claim error was a 409 conflict (tile taken by another user). */
export function isClaimConflict(error: Error | null): boolean {
  return error instanceof ApiError && error.status === 409
}

export function useReleaseClaimMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tileId, sessionId }: { tileId: string; sessionId: string }) =>
      releaseClaim(tileId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: periodQueryKey })
    },
  })
}
