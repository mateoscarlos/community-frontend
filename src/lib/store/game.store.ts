import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface ClaimedTile {
  tileId: string
  expiresAt: string
}

interface GameState {
  sessionId: string
  nickname: string
  claimedTiles: ClaimedTile[]
  setNickname: (nickname: string) => void
  claimTile: (tileId: string, expiresAt: string) => void
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
                { tileId, expiresAt },
              ],
            }),
            false,
            'claimTile'
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
