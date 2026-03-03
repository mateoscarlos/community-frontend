import { describe, it, expect } from 'vitest'
import { mockHealthResponse } from '@/lib/api/mock/health'

describe('health mock', () => {
  it('returns ok status', () => {
    expect(mockHealthResponse.status).toBe('ok')
  })

  it('returns a version string', () => {
    expect(typeof mockHealthResponse.version).toBe('string')
    expect(mockHealthResponse.version.length).toBeGreaterThan(0)
  })
})
