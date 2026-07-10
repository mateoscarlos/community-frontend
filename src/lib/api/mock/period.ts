import type { CurrentPeriodResponse, TileStatus } from '@/types/api'

const FINAL_GRID = 9
const PHASE_GRID = 3
const CENTER = Math.floor(FINAL_GRID / 2)

const tiles = Array.from({ length: FINAL_GRID * FINAL_GRID }, (_, i) => {
  const row = Math.floor(i / FINAL_GRID)
  const col = i % FINAL_GRID
  const dr = Math.abs(row - CENTER)
  const dc = Math.abs(col - CENTER)
  const inWindow = Math.max(dr, dc) <= Math.floor(PHASE_GRID / 2)
  const status: TileStatus = inWindow ? 'free' : 'future_locked'
  return { id: `mock-tile-${i}`, row, col, status }
})

export const mockCurrentPeriodResponse: CurrentPeriodResponse = {
  period: {
    id: 'mock-period',
    game_type: 'photo',
    status: 'active',
    phase: 1,
    final_grid_size: FINAL_GRID,
    phase_grid_size: PHASE_GRID,
    phase_grid_sizes: [3, 5, 7, 9],
    started_at: new Date().toISOString(),
    image: {
      id: 'mock-daily-image',
      date: new Date().toISOString().slice(0, 10),
      image_url: 'https://picsum.photos/seed/community/900/900',
      width: 900,
      height: 900,
      expires_in_seconds: 900,
    },
  },
  grid: {
    outer_tile_display: 'blocked',
    columns: FINAL_GRID,
    rows: FINAL_GRID,
    // Scoped to the currently-playable window — matches drawn_count's scope.
    total_tiles: tiles.filter((t) => t.status !== 'future_locked').length,
    drawn_count: 0,
    tiles,
  },
}
