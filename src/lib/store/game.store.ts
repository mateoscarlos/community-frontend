import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface ClaimedTile {
  tileId: string
  expiresAt: string
  /** When the local claim was added (ISO). Used as a grace window so the
   *  cleanup effect doesn't drop a freshly-claimed tile before the period
   *  query has a chance to refetch. */
  claimedAt: string
}

interface GameState {
  sessionId: string
  nickname: string
  claimedTiles: ClaimedTile[]
  setNickname: (nickname: string) => void
  claimTile: (tileId: string, expiresAt: string) => void
  /** Updates the local expires_at after a successful extend or heartbeat sync. */
  updateClaimExpiry: (tileId: string, expiresAt: string) => void
  unclaimTile: (tileId: string) => void
  clearAllClaims: () => void
}

function generateSessionId(): string {
  return crypto.randomUUID()
}

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set) => ({
        sessionId: generateSessionId(),
        nickname: '',
        claimedTiles: [],
        setNickname: (nickname) => set({ nickname }, false, 'setNickname'),
        claimTile: (tileId, expiresAt) =>
          set(
            (state) => ({
              claimedTiles: [
                ...state.claimedTiles.filter((c) => c.tileId !== tileId),
                {
                  tileId,
                  expiresAt,
                  claimedAt: new Date().toISOString(),
                },
              ],
            }),
            false,
            'claimTile'
          ),
        updateClaimExpiry: (tileId, expiresAt) =>
          set(
            (state) => ({
              claimedTiles: state.claimedTiles.map((c) =>
                c.tileId === tileId ? { ...c, expiresAt } : c
              ),
            }),
            false,
            'updateClaimExpiry'
          ),
        unclaimTile: (tileId) =>
          set(
            (state) => ({
              claimedTiles: state.claimedTiles.filter((c) => c.tileId !== tileId),
            }),
            false,
            'unclaimTile'
          ),
        clearAllClaims: () => set({ claimedTiles: [] }, false, 'clearAllClaims'),
      }),
      {
        name: 'community-game',
        partialize: (state) => ({
          sessionId: state.sessionId,
          nickname: state.nickname,
          claimedTiles: state.claimedTiles,
        }),
      }
    ),
    { name: 'game-store' }
  )
)
