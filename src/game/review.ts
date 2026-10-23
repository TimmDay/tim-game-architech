/**
 * Points and spaced review, as pure functions over plain state. The store in
 * `points-store.ts` persists this and tells React when it changes.
 *
 * Item ids:
 *   card:<deckCardId>        a discussion deck card
 *   mc:<levelId>:<index>     a quiz question, by position in QUIZZES
 *   level:<levelId>          revisiting a passed scenario
 */
export const POINTS = {
  /** First time you mark a flash card, either way. */
  flashCard: 1,
  /** First time you answer a quiz question correctly. */
  mcCorrect: 2,
  /** First time you earn a star on a scenario. */
  scenarioPass: 50,
  /** Retention: getting right something you got right last time. */
  reviewRight: 1,
  /** Retention: getting right something you got wrong last time. */
  reviewRecovered: 2,
  /** Retention: passing a scenario again, a week or more later. */
  scenarioRevisit: 25,
  /** Survival: each wave number, the first time you clear it. */
  survivalWave: 10,
} as const

const DAY = 24 * 60 * 60 * 1000

/** Leitner boxes: right answers move an item up, so it comes back less often. */
export const CARD_INTERVAL_DAYS = [1, 3, 7, 14, 30]
/** Scenarios come back a week after you pass them, then less often. */
export const LEVEL_INTERVAL_DAYS = [7, 14, 30, 60]

export type ReviewItem = {
  box: number
  /** Got it wrong last time: worth more when you get it right. */
  weak: boolean
  last: number
  due: number
}

export type ReviewState = {
  total: number
  /** One-time awards already given, so retries can't farm them. */
  awarded: Record<string, true>
  items: Record<string, ReviewItem>
  /** Retention reviews answered correctly, ever. */
  reviewsRight?: number
}

export const EMPTY: ReviewState = { total: 0, awarded: {}, items: {} }

export const isLevelItem = (id: string) => id.startsWith("level:")

const interval = (id: string, box: number) => {
  const table = isLevelItem(id) ? LEVEL_INTERVAL_DAYS : CARD_INTERVAL_DAYS
  return (table[Math.min(box, table.length - 1)] ?? 1) * DAY
}

/** Give a one-time award, unless it has been given before. */
function award(s: ReviewState, key: string, points: number): ReviewState {
  if (s.awarded[key]) return s
  return {
    ...s,
    total: s.total + points,
    awarded: { ...s.awarded, [key]: true },
  }
}

/** Put an item on the schedule the first time it's seen. Seen items keep theirs. */
function schedule(s: ReviewState, id: string, right: boolean, now: number) {
  if (s.items[id]) return s
  const box = right ? 1 : 0
  const item = { box, weak: !right, last: now, due: now + interval(id, box) }
  return { ...s, items: { ...s.items, [id]: item } }
}

/** A deck card marked "got it" or "revisit" outside Retention. */
export function seeCard(
  s: ReviewState,
  cardId: string,
  got: boolean,
  now: number,
) {
  const id = `card:${cardId}`
  const awarded = award(s, `flash:${cardId}`, POINTS.flashCard)
  return schedule(awarded, id, got, now)
}

/** A quiz question answered outside Retention. */
export function answerQuestion(
  s: ReviewState,
  levelId: string,
  index: number,
  correct: boolean,
  now: number,
) {
  const id = `mc:${levelId}:${index}`
  const awarded = correct ? award(s, id, POINTS.mcCorrect) : s
  return schedule(awarded, id, correct, now)
}

/** A scenario graded with at least one star. */
export function passScenario(s: ReviewState, levelId: string, now: number) {
  const id = `level:${levelId}`
  const awarded = award(s, `pass:${levelId}`, POINTS.scenarioPass)
  if (awarded.items[id]) return awarded
  // Box 0 for a level means "first revisit in a week".
  const item = { box: 0, weak: false, last: now, due: now + interval(id, 0) }
  return { ...awarded, items: { ...awarded.items, [id]: item } }
}

/** What a correct answer to this item is worth in Retention right now. */
export function reviewValue(s: ReviewState, id: string) {
  if (isLevelItem(id)) return POINTS.scenarioRevisit
  return s.items[id]?.weak ? POINTS.reviewRecovered : POINTS.reviewRight
}

/**
 * Answer a due item in Retention. Right moves it up a box and earns points;
 * wrong sends it back to the first box and marks it weak.
 */
export function review(
  s: ReviewState,
  id: string,
  right: boolean,
  now: number,
): { state: ReviewState; earned: number } {
  const prev = s.items[id]
  if (!prev) return { state: s, earned: 0 }
  const earned = right ? reviewValue(s, id) : 0
  const box = right ? prev.box + 1 : 0
  const item = { box, weak: !right, last: now, due: now + interval(id, box) }
  return {
    state: {
      ...s,
      total: s.total + earned,
      items: { ...s.items, [id]: item },
      reviewsRight: (s.reviewsRight ?? 0) + (right ? 1 : 0),
    },
    earned,
  }
}

export const isDue = (s: ReviewState, id: string, now: number) =>
  (s.items[id]?.due ?? Infinity) <= now

/**
 * Today's Retention queue: weak items first, then the most overdue, capped so
 * a session stays short.
 */
export function dueQueue(s: ReviewState, now: number, limit = 20): string[] {
  return Object.entries(s.items)
    .filter(([, it]) => it.due <= now)
    .sort(([, a], [, b]) => Number(b.weak) - Number(a.weak) || a.due - b.due)
    .slice(0, limit)
    .map(([id]) => id)
}

export const nextDue = (s: ReviewState) =>
  Object.values(s.items).reduce((m, it) => Math.min(m, it.due), Infinity)

/** Survival: clearing wave n pays out once per wave number, ever. */
export const clearSurvivalWave = (s: ReviewState, n: number) =>
  award(s, `survival:${n}`, POINTS.survivalWave)

/** The furthest Survival wave ever cleared, read back from the awards. */
export const bestSurvivalWave = (s: ReviewState) =>
  Object.keys(s.awarded).reduce((best, k) => {
    const m = /^survival:(\d+)$/.exec(k)
    return m ? Math.max(best, Number(m[1])) : best
  }, 0)
