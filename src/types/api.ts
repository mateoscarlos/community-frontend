export interface HealthResponse {
  status: 'ok' | 'error'
  version: string
}

export interface DailyImageResponse {
  id: string
  date: string
  image_url: string
  width: number
  height: number
  expires_in_seconds: number
  grid_size?: number
}

export interface ApiError {
  message: string
  code?: string
}

// --- Period / Grid ---

export interface PeriodImageResponse {
  id: string
  date: string
  image_url: string
  width: number
  height: number
  expires_in_seconds: number
}

export interface TileResponse {
  id: string
  row: number
  col: number
  status: 'free' | 'locked' | 'drawn'
  image_url?: string
}

export interface GridResponse {
  columns: number
  rows: number
  total_tiles: number
  drawn_count: number
  tiles: TileResponse[]
}

export interface PhaseMosaicResponse {
  phase: number
  image_url: string
  composed_at: string
}

export interface PeriodInfo {
  id: string
  game_type: string
  status: 'active' | 'completed' | 'archived'
  phase: number
  started_at: string
  image?: PeriodImageResponse
  phase_mosaics?: PhaseMosaicResponse[]
}

export interface CurrentPeriodResponse {
  period: PeriodInfo
  grid: GridResponse
}

export interface ArchivePeriodResponse {
  id: string
  game_type: string
  phase: number
  started_at: string
  ended_at?: string
  final_image_url?: string
}

export interface ArchiveListResponse {
  periods: ArchivePeriodResponse[]
  page: number
  per_page: number
}

// --- Claims ---

export interface ClaimRequest {
  session_id: string
  nickname?: string
}

export interface ClaimResponse {
  claim_id: string
  tile_id: string
  expires_at: string
}

// --- Submissions ---

export interface PresignRequest {
  tile_id: string
  session_id: string
  content_type?: string
}

export interface PresignResponse {
  upload_url: string
  storage_key: string
  expires_in_seconds: number
}

export interface SubmitRequest {
  session_id: string
  storage_key: string
  crop: { x: number; y: number; width: number; height: number }
}

export interface SubmitResponse {
  id: string
  tile_id: string
  storage_key: string
}

// --- Feedback ---

export interface FeedbackRequest {
  message: string
  contact?: string
}

export interface FeedbackResponse {
  id: string
  created_at: string
}
