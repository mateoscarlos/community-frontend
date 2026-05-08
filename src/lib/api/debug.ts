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

export function createPeriod(gameType: 'photo' | 'prompt' = 'photo', prompt = '') {
  return apiFetch('/debug/period', {
    method: 'POST',
    body: JSON.stringify({ game_type: gameType, prompt }),
  })
}

export function resetPeriod(gameType: 'photo' | 'prompt' = 'photo') {
  return apiFetch<{ reset: string; message: string }>(
    `/debug/period/reset?game_type=${gameType}`,
    { method: 'POST' }
  )
}

export function resetTile(tileId: string) {
  return apiFetch<{ reset: string }>(`/debug/tiles/${tileId}/reset`, {
    method: 'POST',
  })
}

export function drawAllTiles(gameType: 'photo' | 'prompt' = 'photo') {
  return apiFetch<{ drawn: number; message: string }>(
    `/debug/tiles/draw-all?game_type=${gameType}`,
    { method: 'POST' }
  )
}

// --- Daily image schedule ---

export interface ScheduleItem {
  date: string // YYYY-MM-DD
  storage_key: string
  width: number
  height: number
  image_url?: string
}

export interface ScheduleListResponse {
  from: string
  to: string
  items: ScheduleItem[]
}

export function listSchedule(): Promise<ScheduleListResponse> {
  return apiFetch<ScheduleListResponse>('/debug/schedule')
}

export function upsertSchedule(body: {
  date: string
  storage_key: string
  width: number
  height: number
}): Promise<ScheduleItem> {
  return apiFetch<ScheduleItem>('/debug/schedule', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteSchedule(date: string): Promise<void> {
  return apiFetch(`/debug/schedule/${date}`, { method: 'DELETE' })
}

// --- Prompt schedule (parallel prompt-based game) ---

export interface PromptScheduleItem {
  date: string // YYYY-MM-DD
  prompt: string
}

export interface PromptScheduleListResponse {
  from: string
  to: string
  items: PromptScheduleItem[]
}

export function listPromptSchedule(): Promise<PromptScheduleListResponse> {
  return apiFetch<PromptScheduleListResponse>('/debug/prompt-schedule')
}

export function upsertPromptSchedule(body: {
  date: string
  prompt: string
}): Promise<PromptScheduleItem> {
  return apiFetch<PromptScheduleItem>('/debug/prompt-schedule', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deletePromptSchedule(date: string): Promise<void> {
  return apiFetch(`/debug/prompt-schedule/${date}`, { method: 'DELETE' })
}

// --- Sessions ---

export interface SessionItem {
  session_id: string
  latest_nickname: string
  total_claims: number
  drawn_count: number
  released_count: number
  first_seen: string
  last_seen: string
}

export interface SessionsListResponse {
  sessions: SessionItem[]
  limit: number
}

export interface SessionClaimItem {
  claim_id: string
  tile_id: string
  nickname: string
  claimed_at: string
  expires_at: string
  released_at?: string
  submission_id?: string
  submitted_at?: string
  image_url?: string
  period_id: string
  phase: number
  row: number
  col: number
  tile_status: string
}

export interface SessionDetailResponse {
  session_id: string
  claims: SessionClaimItem[]
}

export function listSessions(): Promise<SessionsListResponse> {
  return apiFetch<SessionsListResponse>('/debug/sessions')
}

export function getSession(id: string): Promise<SessionDetailResponse> {
  return apiFetch<SessionDetailResponse>(`/debug/sessions/${id}`)
}
