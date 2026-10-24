import { backend, isSynced, notifySaveChanged, scoped } from "./profile"
import type { Provider } from "~/providers/names"
import type { Graph } from "~/sim/types"

/**
 * Everything persisted lives in localStorage, per device. Every access is
 * wrapped: private windows and blocked storage throw, and the game must still
 * work without it.
 */
const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = backend(key).getItem(scoped(key))
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const write = (key: string, value: unknown) => {
  try {
    backend(key).setItem(scoped(key), JSON.stringify(value))
    if (isSynced(key)) notifySaveChanged()
  } catch {
    // Storage full or blocked: progress just won't survive a reload.
  }
}

export type LevelProgress = { stars: number; diagnosedFirstTry?: boolean }
export type Progress = Record<string, LevelProgress>

export const loadProvider = () => read<Provider>("lb.provider", "aws")
export const saveProvider = (p: Provider) => write("lb.provider", p)

/** Which home-page shelves are open. Per device, never synced. */
export const loadOpenShelves = () => read<string[]>("lb.shelves", [])
export const saveOpenShelves = (ids: string[]) => write("lb.shelves", ids)

/** The install card was dismissed. Per device, never synced. */
export const loadInstallDismissed = () => read<boolean>("lb.install", false)
export const saveInstallDismissed = () => write("lb.install", true)

export const loadProgress = () => read<Progress>("lb.progress", {})
export const saveProgress = (p: Progress) => write("lb.progress", p)

export const loadBuild = (levelId: string) =>
  read<Graph | null>(`lb.build.${levelId}`, null)
export const saveBuild = (levelId: string, g: Graph) =>
  write(`lb.build.${levelId}`, g)
export const clearBuild = (levelId: string) => {
  try {
    backend(`lb.build.${levelId}`).removeItem(scoped(`lb.build.${levelId}`))
  } catch {
    // Nothing to clear.
  }
}

export type CardMark = "got" | "revisit"
export const loadDeckMarks = (levelId: string) =>
  read<Record<string, CardMark>>(`lb.deck.${levelId}`, {})
export const saveDeckMarks = (levelId: string, m: Record<string, CardMark>) =>
  write(`lb.deck.${levelId}`, m)

export type QuizRecord = { best: number; passed: boolean }
export const loadQuiz = (levelId: string) =>
  read<QuizRecord>(`lb.quiz.${levelId}`, { best: 0, passed: false })
export const saveQuiz = (levelId: string, r: QuizRecord) =>
  write(`lb.quiz.${levelId}`, r)
