import type { PresignRequest, PresignResponse, SubmitRequest, SubmitResponse } from '@/types/api'
import { apiFetch } from './client'

export async function getPresignedUploadUrl(body: PresignRequest): Promise<PresignResponse> {
  return apiFetch<PresignResponse>('/api/v1/uploads/presign', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function uploadFile(url: string, file: File): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`)
  }
}

export async function submitTile(tileId: string, body: SubmitRequest): Promise<SubmitResponse> {
  return apiFetch<SubmitResponse>(`/api/v1/tiles/${tileId}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
