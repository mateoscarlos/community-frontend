import type { ClaimRequest, ClaimResponse } from '@/types/api'
import { apiFetch } from './client'

export async function claimTile(tileId: string, body: ClaimRequest): Promise<ClaimResponse> {
  return apiFetch<ClaimResponse>(`/api/v1/tiles/${tileId}/claim`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function releaseClaim(tileId: string, sessionId: string): Promise<void> {
  await apiFetch(`/api/v1/tiles/${tileId}/claim`, {
    method: 'DELETE',
    body: JSON.stringify({ session_id: sessionId }),
  })
}
