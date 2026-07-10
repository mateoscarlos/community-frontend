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

/**
 * Tile wire status. `future_locked` marks tiles whose concentric ring hasn't
 * unlocked yet — distinct from `locked` (which means another player is
 * currently claiming this tile). See community-backend/docs/game-model-rework.md.
 */
export type TileStatus = 'free' | 'locked' | 'drawn' | 'future_locked'

export interface TileResponse {
  id: string
  row: number
  col: number
  status: TileStatus
  image_url?: string
}

export type OuterTileDisplay = 'blocked' | 'hidden'

export interface GridResponse {
  /**
   * How the frontend should render tiles whose phase > current phase.
   * `blocked` = render inert; `hidden` = don't render. Backend-configurable
   * via app_settings.outer_tile_display (M5 admin toggle).
   */
  outer_tile_display: OuterTileDisplay
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
  /** Retained for archive compatibility. Always `"photo"` on new periods. */
  game_type: string
  status: 'active' | 'completed' | 'archived'
  phase: number
  /** Side length of the fully-revealed grid, e.g. 9 for a 9×9. */
  final_grid_size: number
  /** Side length of the currently-unlocked window, e.g. 5 at phase 2. */
  phase_grid_size: number
  /**
   * The full ring progression this period was seeded with, e.g. [3,5,7,9].
   * Length = total phases. Drives the PhaseIndicator pip count so it stays
   * accurate when the admin changes the app-setting.
   */
  phase_grid_sizes: number[]
  started_at: string
  /** Set only when `status === 'completed'` — the resting-state countdown target. */
  next_period_starts_at?: string
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

export interface ExpiresAtResponse {
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
  /** One-tap sentiment: 1 = negative, 2 = neutral, 3 = positive. */
  rating?: number
  /** Where the feedback came from, e.g. "post_upload". */
  context?: string
}

export interface FeedbackResponse {
  id: string
  created_at: string
}
