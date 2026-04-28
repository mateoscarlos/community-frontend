import { apiFetch } from './client'

export interface UploadURLResponse {
  upload_url: string
  key: string
  method: string
  expires_in: string
}

export function getDebugUploadURL(key: string): Promise<UploadURLResponse> {
  return apiFetch(`/debug/storage/upload-url?key=${encodeURIComponent(key)}`)
}

export function setActiveDailyImage(body: {
  storage_key: string
  width: number
  height: number
  date?: string
}) {
  return apiFetch('/debug/daily-image', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function createPeriod(gameType = 'photo') {
  return apiFetch('/debug/period', {
    method: 'POST',
    body: JSON.stringify({ game_type: gameType }),
  })
}

export function deletePeriod() {
  return apiFetch<{ deleted: string }>('/debug/period', { method: 'DELETE' })
}

export function resetPeriod() {
  return apiFetch<{ reset: string; message: string }>('/debug/period/reset', {
    method: 'POST',
  })
}

export function resetTile(tileId: string) {
  return apiFetch<{ reset: string }>(`/debug/tiles/${tileId}/reset`, {
    method: 'POST',
  })
}

export function drawAllTiles() {
  return apiFetch<{ drawn: number; message: string }>('/debug/tiles/draw-all', {
    method: 'POST',
  })
}
