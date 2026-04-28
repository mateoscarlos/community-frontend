'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getPresignedUploadUrl, uploadFile, submitTile } from '@/lib/api/submission'
import { periodQueryKey } from './period.queries'
import type { PresignRequest, SubmitRequest } from '@/types/api'

export function usePresignMutation() {
  return useMutation({
    mutationFn: (body: PresignRequest) => getPresignedUploadUrl(body),
  })
}

export function useUploadMutation() {
  return useMutation({
    mutationFn: ({ url, file }: { url: string; file: File }) => uploadFile(url, file),
  })
}

export function useSubmitTileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tileId, body }: { tileId: string; body: SubmitRequest }) =>
      submitTile(tileId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: periodQueryKey })
    },
  })
}
