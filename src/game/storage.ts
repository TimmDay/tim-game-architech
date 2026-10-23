import type { Provider } from "~/providers/names"
import type { Graph } from "~/sim/types"

/**
 * Everything persisted lives in localStorage, per device. Every access is
 * wrapped: private windows and blocked storage throw, and the game must still
 * work without it.
 */
const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: progress just won't survive a reload.
  }
}

export type LevelProgress = { stars: number; diagnosedFirstTry?: boolean }
export type Progress = Record<string, LevelProgress>

export const loadProvider = () => read<Provider>("lb.provider", "aws")
export const saveProvider = (p: Provider) => write("lb.provider", p)

export const loadProgress = () => read<Progress>("lb.progress", {})
export const saveProgress = (p: Progress) => write("lb.progress", p)

export const loadBuild = (levelId: string) =>
  read<Graph | null>(`lb.build.${levelId}`, null)
export const saveBuild = (levelId: string, g: Graph) =>
  write(`lb.build.${levelId}`, g)
export const clearBuild = (levelId: string) => {
  try {
    localStorage.removeItem(`lb.build.${levelId}`)
  } catch {
    // Nothing to clear.
  }
}

export type CardMark = "got" | "revisit"
export const loadDeckMarks = (levelId: string) =>
  read<Record<string, CardMark>>(`lb.deck.${levelId}`, {})
export const saveDeckMarks = (levelId: string, m: Record<string, CardMark>) =>
  write(`lb.deck.${levelId}`, m)
