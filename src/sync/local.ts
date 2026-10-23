import { backend, scoped } from "~/game/profile"
import { normalize, type ReviewState } from "~/game/review"
import { deviceId } from "~/game/device"
import { LEVELS } from "~/levels"
import { EMPTY_SAVE, type Save } from "./save"

/**
 * Read and write a whole save for one profile, straight from storage. Used
 * by sync, which then asks the live stores to reload.
 */
const get = <T>(key: string, profile: string | null): T | undefined => {
  try {
    const raw = backend(key, profile).getItem(scoped(key, profile))
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}
const put = (key: string, profile: string | null, value: unknown) => {
  try {
    backend(key, profile).setItem(scoped(key, profile), JSON.stringify(value))
  } catch {
    // Storage full or blocked.
  }
}

export function readSave(profile: string | null): Save {
  const decks: Save["decks"] = {}
  const quizzes: Save["quizzes"] = {}
  for (const l of LEVELS) {
    const d = get<Save["decks"][string]>(`lb.deck.${l.id}`, profile)
    if (d && Object.keys(d).length) decks[l.id] = d
    const q = get<Save["quizzes"][string]>(`lb.quiz.${l.id}`, profile)
    if (q) quizzes[l.id] = q
  }
  const review = get<ReviewState>("lb.review", profile)
  return {
    progress: get("lb.progress", profile) ?? {},
    review: review
      ? normalize({ ...EMPTY_SAVE.review, ...review }, deviceId())
      : EMPTY_SAVE.review,
    decks,
    quizzes,
  }
}

export function writeSave(profile: string | null, s: Save) {
  put("lb.progress", profile, s.progress)
  put("lb.review", profile, s.review)
  for (const [id, d] of Object.entries(s.decks))
    put(`lb.deck.${id}`, profile, d)
  for (const [id, q] of Object.entries(s.quizzes))
    put(`lb.quiz.${id}`, profile, q)
}
