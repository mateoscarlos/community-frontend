import { ApiError } from './client'

// Admin calls go through the same-origin BFF (/api/admin/*), never straight
// to the backend — the Next route injects the secret server-side. Paths keep
// their original '/debug/...' shape and are remapped here.
async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const rel = path.replace(/^\/debug/, '/api/admin')
  const res = await fetch(rel, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    throw new ApiError(res.status, `API error ${res.status}: ${path}`)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export interface UploadURLResponse {
  upload_url: string
  key: string
  method: string
  expires_in: string
}

export function getDebugUploadURL(key: string): Promise<UploadURLResponse> {
  return adminFetch(`/debug/storage/upload-url?key=${encodeURIComponent(key)}`)
}

export function setActiveDailyImage(body: {
  storage_key: string
  width: number
  height: number
  date?: string
}) {
  return adminFetch('/debug/daily-image', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function createPeriod(gameType: 'photo' | 'prompt' = 'photo', prompt = '') {
  return adminFetch('/debug/period', {
    method: 'POST',
    body: JSON.stringify({ game_type: gameType, prompt }),
  })
}

export function resetPeriod(gameType: 'photo' | 'prompt' = 'photo') {
  return adminFetch<{ reset: string; message: string }>(
    `/debug/period/reset?game_type=${gameType}`,
    { method: 'POST' }
  )
}

export function resetTile(tileId: string) {
  return adminFetch<{ reset: string }>(`/debug/tiles/${tileId}/reset`, {
    method: 'POST',
  })
}

export function drawAllTiles(gameType: 'photo' | 'prompt' = 'photo') {
  return adminFetch<{ drawn: number; message: string }>(
    `/debug/tiles/draw-all?game_type=${gameType}`,
    { method: 'POST' }
  )
}

// --- Global period duration ---

export interface PeriodDurationResponse {
  hours: number | null // null = legacy daily (midnight) cutoff
}

export function getPeriodDuration(): Promise<PeriodDurationResponse> {
  return adminFetch<PeriodDurationResponse>('/debug/period-duration')
}

export function setPeriodDuration(hours: number): Promise<PeriodDurationResponse> {
  return adminFetch<PeriodDurationResponse>('/debug/period-duration', {
    method: 'PUT',
    body: JSON.stringify({ hours }),
  })
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
  return adminFetch<ScheduleListResponse>('/debug/schedule')
}

export function upsertSchedule(body: {
  date: string
  storage_key: string
  width: number
  height: number
}): Promise<ScheduleItem> {
  return adminFetch<ScheduleItem>('/debug/schedule', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteSchedule(date: string): Promise<void> {
  return adminFetch(`/debug/schedule/${date}`, { method: 'DELETE' })
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
  return adminFetch<PromptScheduleListResponse>('/debug/prompt-schedule')
}

export function upsertPromptSchedule(body: {
  date: string
  prompt: string
}): Promise<PromptScheduleItem> {
  return adminFetch<PromptScheduleItem>('/debug/prompt-schedule', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deletePromptSchedule(date: string): Promise<void> {
  return adminFetch(`/debug/prompt-schedule/${date}`, { method: 'DELETE' })
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
  return adminFetch<SessionsListResponse>('/debug/sessions')
}

export function getSession(id: string): Promise<SessionDetailResponse> {
  return adminFetch<SessionDetailResponse>(`/debug/sessions/${id}`)
}
