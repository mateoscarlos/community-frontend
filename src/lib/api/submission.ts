import type {
  PresignRequest,
  PresignResponse,
  SubmitRequest,
  SubmitResponse,
} from '@/types/api'
import { ApiError, apiFetch } from './client'

export async function getPresignedUploadUrl(
  body: PresignRequest
): Promise<PresignResponse> {
  return apiFetch<PresignResponse>('/api/v1/uploads/presign', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// Presign a raw camera upload from the phone to the staging area. The laptop
// driving the game polls /uploads/staged for the result.
export async function getStagePresignedUrl(
  tileId: string,
  sessionId: string
): Promise<PresignResponse> {
  return apiFetch<PresignResponse>('/api/v1/uploads/stage-presign', {
    method: 'POST',
    body: JSON.stringify({ tile_id: tileId, session_id: sessionId }),
  })
}

// Poll for a staged photo. Returns the download URL when the phone has
// uploaded; returns null while waiting.
export async function pollStagedUpload(
  tileId: string,
  sessionId: string
): Promise<string | null> {
  try {
    const res = await apiFetch<{ download_url: string }>(
      `/api/v1/uploads/staged?tile=${encodeURIComponent(tileId)}&session=${encodeURIComponent(sessionId)}`
    )
    return res.download_url
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

// Pull the staged image bytes into an object URL the editor can work on
// locally. We download client-side so the editor's existing image-as-URL
// pipeline stays unchanged.
export async function fetchStagedAsObjectUrl(downloadUrl: string): Promise<string> {
  const res = await fetch(downloadUrl)
  if (!res.ok) throw new Error(`fetch staged: ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export async function uploadFile(url: string, file: Blob): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`)
  }
}

export async function submitTile(
  tileId: string,
  body: SubmitRequest
): Promise<SubmitResponse> {
  return apiFetch<SubmitResponse>(`/api/v1/tiles/${tileId}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
