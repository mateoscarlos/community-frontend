import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { GameType } from '@/types/api'

export interface ClaimedTile {
  tileId: string
  expiresAt: string
  /** When the local claim was added (ISO). Used as a grace window so the
   *  cleanup effect doesn't drop a freshly-claimed tile before the period
   *  query has a chance to refetch. */
  claimedAt: string
  /** Which parallel game this claim belongs to. Backwards-compat: claims
   *  persisted before the prompt game existed default to 'photo' on read. */
  gameType: GameType
}

interface GameState {
  sessionId: string
  nickname: string
  claimedTiles: ClaimedTile[]
  /** Which game the user last played — powers the global Play chrome button
   *  so a jump-back lands on the same mode they left. */
  lastGameType: GameType
  setNickname: (nickname: string) => void
  claimTile: (tileId: string, expiresAt: string, gameType: GameType) => void
  /** Updates the local expires_at after a successful extend or heartbeat sync. */
  updateClaimExpiry: (tileId: string, expiresAt: string) => void
  unclaimTile: (tileId: string) => void
  /** Clears claims for a specific game, or all if `gameType` is omitted. */
  clearAllClaims: (gameType?: GameType) => void
  setLastGameType: (gameType: GameType) => void
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
        lastGameType: 'photo',
        setNickname: (nickname) => set({ nickname }, false, 'setNickname'),
        claimTile: (tileId, expiresAt, gameType) =>
          set(
            (state) => ({
              claimedTiles: [
                ...state.claimedTiles.filter((c) => c.tileId !== tileId),
                {
                  tileId,
                  expiresAt,
                  claimedAt: new Date().toISOString(),
                  gameType,
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
        clearAllClaims: (gameType) =>
          set(
            (state) => ({
              claimedTiles: gameType
                ? state.claimedTiles.filter((c) => c.gameType !== gameType)
                : [],
            }),
            false,
            'clearAllClaims'
          ),
        setLastGameType: (gameType) =>
          set({ lastGameType: gameType }, false, 'setLastGameType'),
      }),
      {
        name: 'community-game',
        partialize: (state) => ({
          sessionId: state.sessionId,
          nickname: state.nickname,
          claimedTiles: state.claimedTiles,
          lastGameType: state.lastGameType,
        }),
        // Backfill gameType on persisted claims from before the prompt game
        // existed so we don't lose them on first load after upgrade.
        merge: (persisted, current) => {
          const p = persisted as Partial<GameState> | undefined
          const tiles = (p?.claimedTiles ?? []).map((c) => ({
            ...c,
            gameType: (c.gameType ?? 'photo') as GameType,
          }))
          return {
            ...current,
            ...p,
            claimedTiles: tiles,
            lastGameType: p?.lastGameType ?? current.lastGameType,
          }
        },
      }
    ),
    { name: 'game-store' }
  )
)
