import type { HealthResponse } from '@/types/api'
import { apiFetch } from './client'
import { mockHealthResponse } from './mock/health'

export async function fetchHealth(): Promise<HealthResponse & { isMock?: boolean }> {
  try {
    const data = await apiFetch<HealthResponse>('/health')
    return data
  } catch {
    return { ...mockHealthResponse, isMock: true }
  }
}
