'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { periodQueryKey } from '@/lib/query/period.queries'
import { useGameStore } from '@/lib/store/game.store'
import type { CurrentPeriodResponse } from '@/types/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
const SSE_URL = `${API_URL}/api/v1/periods/current/events`

interface TileEvent {
  tile_id: string
  status: 'free' | 'locked' | 'drawn'
  image_url?: string
}

interface PhaseCompleteEvent {
  phase: number
  next_phase: number
  completed: boolean
}

export interface PhaseCompleteInfo {
  completedPhase: number
  nextPhase: number
  periodCompleted: boolean
}

/**
 * Connects to the SSE endpoint and updates the TanStack Query cache
 * in real time when tile states change. Falls back to polling if SSE
 * is unavailable or disconnects.
 *
 * Returns `onPhaseComplete` callback ref — set it to handle phase transitions.
 */
export function useTileEvents(onPhaseComplete?: (info: PhaseCompleteInfo) => void) {
  const onPhaseCompleteRef = useRef(onPhaseComplete)
  useEffect(() => {
    onPhaseCompleteRef.current = onPhaseComplete
  })
  const queryClient = useQueryClient()
  const unclaimTile = useGameStore((s) => s.unclaimTile)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const updateTileInCache = useCallback(
    (tileId: string, newStatus: 'free' | 'locked' | 'drawn', imageUrl?: string) => {
      queryClient.setQueryData<CurrentPeriodResponse & { isMock?: boolean }>(
        periodQueryKey,
        (old) => {
          if (!old?.grid?.tiles) return old
          const tiles = old.grid.tiles.map((t) =>
            t.id === tileId
              ? { ...t, status: newStatus, image_url: imageUrl || t.image_url }
              : t
          )
          const drawnCount = tiles.filter((t) => t.status === 'drawn').length
          return {
            ...old,
            grid: { ...old.grid, tiles, drawn_count: drawnCount },
          }
        }
      )
    },
    [queryClient]
  )

  const enablePolling = useCallback(
    (enabled: boolean) => {
      queryClient.setQueryDefaults(periodQueryKey, {
        refetchInterval: enabled ? 10_000 : false,
      })
    },
    [queryClient]
  )

  useEffect(() => {
    let disposed = false

    function connect() {
      if (disposed) return

      const es = new EventSource(SSE_URL)
      eventSourceRef.current = es

      es.onopen = () => {
        // SSE connected — disable polling
        enablePolling(false)
      }

      const handleEvent = (e: MessageEvent) => {
        try {
          const data: TileEvent = JSON.parse(e.data)
          updateTileInCache(data.tile_id, data.status, data.image_url)

          // If one of our claimed tiles was freed or drawn, remove it from local state.
          if (data.status !== 'locked') {
            unclaimTile(data.tile_id)
          }
        } catch {
          // Malformed event, ignore
        }
      }

      es.addEventListener('tile_locked', handleEvent)
      es.addEventListener('tile_freed', handleEvent)
      es.addEventListener('tile_drawn', handleEvent)

      es.addEventListener('phase_complete', (e: MessageEvent) => {
        try {
          const data: PhaseCompleteEvent = JSON.parse(e.data)
          onPhaseCompleteRef.current?.({
            completedPhase: data.phase,
            nextPhase: data.next_phase,
            periodCompleted: data.completed,
          })
        } catch {
          // ignore
        }
      })

      es.onerror = () => {
        // Connection lost — re-enable polling as fallback
        enablePolling(true)
        es.close()
        eventSourceRef.current = null

        // Reconnect after a short delay
        if (!disposed) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      disposed = true
      clearTimeout(reconnectTimeoutRef.current)
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      // Restore polling on unmount
      enablePolling(true)
    }
  }, [updateTileInCache, enablePolling])
}
