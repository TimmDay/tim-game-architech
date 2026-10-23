import type { CardMark, Progress, QuizRecord } from "~/game/storage"
import {
  computeTotal,
  EMPTY,
  mergeReview,
  type ReviewState,
} from "~/game/review"

/**
 * A player's whole save, as one object: what syncs between devices. Builds
 * in progress stay on the device (they're scratch work, and large).
 */
export type Save = {
  progress: Progress
  review: ReviewState
  decks: Record<string, Record<string, CardMark>>
  quizzes: Record<string, QuizRecord>
}

export const EMPTY_SAVE: Save = {
  progress: {},
  review: { ...EMPTY, retention: {} },
  decks: {},
  quizzes: {},
}

export const isEmpty = (s: Save) =>
  Object.keys(s.progress).length === 0 &&
  Object.keys(s.review.awarded).length === 0 &&
  Object.keys(s.review.items).length === 0 &&
  Object.keys(s.decks).length === 0 &&
  Object.keys(s.quizzes).length === 0

/**
 * Combine two copies of one player's save. Order-independent where it
 * matters, and never loses progress: stars and quiz bests take the max,
 * first-try diagnoses and passes are kept once earned, review state merges
 * by its own rules, and deck marks keep the first copy's choice where both
 * marked a card.
 */
export function mergeSave(a: Save, b: Save): Save {
  const progress: Progress = { ...b.progress }
  for (const [id, p] of Object.entries(a.progress)) {
    const o = progress[id]
    progress[id] = o
      ? {
          stars: Math.max(p.stars, o.stars),
          diagnosedFirstTry:
            p.diagnosedFirstTry === true || o.diagnosedFirstTry === true
              ? true
              : undefined,
        }
      : p
  }
  const quizzes: Record<string, QuizRecord> = { ...b.quizzes }
  for (const [id, q] of Object.entries(a.quizzes)) {
    const o = quizzes[id]
    quizzes[id] = o
      ? { best: Math.max(q.best, o.best), passed: q.passed || o.passed }
      : q
  }
  const decks: Save["decks"] = { ...b.decks }
  for (const [id, marks] of Object.entries(a.decks))
    decks[id] = { ...decks[id], ...marks }
  return { progress, review: mergeReview(a.review, b.review), decks, quizzes }
}

/** What goes to the cloud: the total is left out because it's derived. */
export function toCloud(s: Save) {
  const { total: _total, ...review } = s.review
  void _total
  return {
    v: 1,
    progress: stripUndefined(s.progress),
    review: {
      awarded: review.awarded,
      items: review.items,
      retention: review.retention ?? {},
      reviewsRight: review.reviewsRight ?? 0,
    },
    decks: s.decks,
    quizzes: s.quizzes,
  }
}

export function fromCloud(
  d: Partial<ReturnType<typeof toCloud>> | undefined,
): Save {
  if (!d) return EMPTY_SAVE
  const review: ReviewState = {
    awarded: d.review?.awarded ?? {},
    items: d.review?.items ?? {},
    retention: d.review?.retention ?? {},
    reviewsRight: d.review?.reviewsRight ?? 0,
    total: 0,
  }
  return {
    progress: d.progress ?? {},
    review: { ...review, total: computeTotal(review) },
    decks: d.decks ?? {},
    quizzes: d.quizzes ?? {},
  }
}

/** Firestore rejects `undefined` values. */
function stripUndefined(p: Progress): Progress {
  const out: Progress = {}
  for (const [id, v] of Object.entries(p))
    out[id] = v.diagnosedFirstTry ? v : { stars: v.stars }
  return out
}

export const sameSave = (a: Save, b: Save) =>
  JSON.stringify(toCloud(a)) === JSON.stringify(toCloud(b))
