import type { CurrentPeriodResponse } from '@/types/api'

const tiles = Array.from({ length: 9 }, (_, i) => ({
  id: `mock-tile-${i}`,
  row: Math.floor(i / 3),
  col: i % 3,
  status: 'free' as const,
}))

export const mockCurrentPeriodResponse: CurrentPeriodResponse = {
  period: {
    id: 'mock-period',
    game_type: 'photo',
    status: 'active',
    phase: 1,
    started_at: new Date().toISOString(),
    image: {
      id: 'mock-daily-image',
      date: new Date().toISOString().slice(0, 10),
      image_url: 'https://picsum.photos/seed/community/800/800',
      width: 800,
      height: 800,
      expires_in_seconds: 900,
    },
  },
  grid: {
    columns: 3,
    rows: 3,
    total_tiles: 9,
    drawn_count: 0,
    tiles,
  },
}
