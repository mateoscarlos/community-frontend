export interface HealthResponse {
  status: 'ok' | 'error'
  version: string
}

export interface ApiError {
  message: string
  code?: string
}
