import type { DailyImageResponse } from '@/types/api'

export const mockDailyImageResponse: DailyImageResponse = {
  id: 'mock-daily-image',
  date: new Date().toISOString().slice(0, 10),
  image_url: 'https://picsum.photos/seed/community/800/800',
  width: 800,
  height: 800,
  expires_in_seconds: 900,
  grid_size: 9,
}
