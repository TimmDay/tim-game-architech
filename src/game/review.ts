import { ACHIEVEMENT_POINTS } from "./achievement-points"
/**
 * Points and spaced review, as pure functions over plain state. The store in
 * `points-store.ts` persists this and tells React when it changes.
 *
 * Item ids:
 *   card:<deckCardId>        a discussion deck card
 *   mc:<levelId>:<index>     a quiz question, by position in QUIZZES
 *   schema:<levelId>:<index> a schema or API question, by position in SCHEMA
 *   est:<levelId>:<index>    an estimation card, by position in ESTIMATES
 *   level:<levelId>          revisiting a passed scenario
 *
 * Award keys also include star:<levelId>:<n> for each star reached,
 * got:<deckCardId> the first time a card is marked "got it", and
 * kept:<itemId> the first time an item is answered right in Retention.
 */
export const POINTS = {
  /** First time you mark a flash card, either way. */
  flashCard: 1,
  /** First time you mark a flash card "got it". */
  cardGot: 2,
  /** Retention, the first time each item comes back right: once, so it counts toward rank. */
  keptCard: 1,
  keptQuestion: 2,
  keptScenario: 25,
  /** First time you answer a quiz question correctly. */
  mcCorrect: 2,
  /** First time you answer a schema or API question correctly. */
  schemaCorrect: 1,
  /** First time you get an estimate right, or reveal one's working. */
  estimate: 1,
  /** First time you earn a star on a scenario. */
  scenarioPass: 20,
  /** Each of a scenario's three stars, the first time you reach it. */
  star: 10,
  /** Retention: getting right something you got right last time. */
  reviewRight: 1,
  /** Retention: getting right something you got wrong last time. */
  reviewRecovered: 2,
  /** Retention: passing a scenario again, a week or more later. */
  scenarioRevisit: 25,
  /** Survival: each wave number, the first time you clear it. */
  survivalWave: 10,
  /** The daily puzzle: three stars on it, once a day. */
  dailyWin: 15,
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
  /**
   * Retention points earned, per device. Kept apart from one-time awards so
   * two devices' saves merge without losing or double-counting anything:
   * awards merge as a set, these as a per-device maximum.
   */
  retention?: Record<string, number>
}

export const EMPTY: ReviewState = { total: 0, awarded: {}, items: {} }

export const isLevelItem = (id: string) => id.startsWith("level:")

const interval = (id: string, box: number) => {
  const table = isLevelItem(id) ? LEVEL_INTERVAL_DAYS : CARD_INTERVAL_DAYS
  return (table[Math.min(box, table.length - 1)] ?? 1) * DAY
}

/**
 * What a one-time award is worth, from its key alone. That's what lets the
 * total be recomputed after a merge rather than trusted.
 */
export function awardValue(key: string): number {
  if (key.startsWith("flash:")) return POINTS.flashCard
  if (key.startsWith("got:")) return POINTS.cardGot
  if (key.startsWith("kept:")) return keptValue(key.slice("kept:".length))
  if (key.startsWith("mc:")) return POINTS.mcCorrect
  if (key.startsWith("schema:")) return POINTS.schemaCorrect
  if (key.startsWith("est:")) return POINTS.estimate
  if (key.startsWith("pass:")) return POINTS.scenarioPass
  if (key.startsWith("star:")) return POINTS.star
  if (key.startsWith("survival:")) return POINTS.survivalWave
  if (key.startsWith("dailywin:")) return POINTS.dailyWin
  if (key.startsWith("ach:")) return ACHIEVEMENT_POINTS
  return 0 // markers: "event:", "provider:"
}

/** Points, recomputed from the parts that merge safely. */
export const computeTotal = (s: ReviewState) =>
  Object.keys(s.awarded).reduce((t, k) => t + awardValue(k), 0) +
  Object.values(s.retention ?? {}).reduce((t, n) => t + n, 0)

/** What the first right answer in Retention is worth, by item id. */
export function keptValue(id: string): number {
  if (isLevelItem(id)) return POINTS.keptScenario
  if (id.startsWith("mc:")) return POINTS.keptQuestion
  return POINTS.keptCard
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
  const seen = award(s, `flash:${cardId}`, POINTS.flashCard)
  const awarded = got ? award(seen, `got:${cardId}`, POINTS.cardGot) : seen
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

/** A schema or API question answered: a point the first time it's right. */
export function answerSchema(
  s: ReviewState,
  levelId: string,
  index: number,
  correct: boolean,
) {
  return correct
    ? award(s, `schema:${levelId}:${index}`, POINTS.schemaCorrect)
    : s
}

/**
 * An estimation card done: a choice answered (a point the first time it's
 * right), or a prompt's working revealed (a point the first time).
 */
export function answerEstimate(
  s: ReviewState,
  levelId: string,
  index: number,
  correct: boolean,
) {
  return correct ? award(s, `est:${levelId}:${index}`, POINTS.estimate) : s
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

/**
 * Pay for each star a level has reached, once each: a level's best stars
 * live in progress, so this catches up whenever they rise.
 */
export function awardStars(
  s: ReviewState,
  best: Record<string, number>,
): ReviewState {
  let next = s
  for (const [id, stars] of Object.entries(best))
    for (let n = 1; n <= stars; n++)
      next = award(next, `star:${id}:${n}`, POINTS.star)
  return next
}

/**
 * Saves from before "got" and first-retain awards earn them here: cards
 * already marked "got it" (deck marks are synced), and items whose schedule
 * shows a right answer in Retention. A card or question starts at box 1 at
 * best and a scenario at box 0, so anything higher has been kept.
 */
export function catchUpAwards(s: ReviewState, gotCards: string[]): ReviewState {
  let next = s
  for (const id of gotCards) next = award(next, `got:${id}`, POINTS.cardGot)
  for (const [id, item] of Object.entries(s.items))
    if (item.box >= (isLevelItem(id) ? 1 : 2))
      next = award(next, `kept:${id}`, keptValue(id))
  return next
}

/** What a correct answer to this item is worth in Retention right now. */
export function reviewValue(s: ReviewState, id: string) {
  // The first one is a one-time award; after that, Retention's own points.
  if (!s.awarded[`kept:${id}`]) return keptValue(id)
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
  device = "local",
): { state: ReviewState; earned: number } {
  const prev = s.items[id]
  if (!prev) return { state: s, earned: 0 }
  const box = right ? prev.box + 1 : 0
  const item = { box, weak: !right, last: now, due: now + interval(id, box) }
  const counted = {
    ...s,
    items: { ...s.items, [id]: item },
    reviewsRight: (s.reviewsRight ?? 0) + (right ? 1 : 0),
  }
  if (!right) return { state: counted, earned: 0 }
  // A card got right in Retention is also a card marked "got it".
  const got = id.startsWith("card:")
    ? award(counted, `got:${id.slice("card:".length)}`, POINTS.cardGot)
    : counted
  const firstKept = `kept:${id}`
  if (!s.awarded[firstKept]) {
    const kept = award(got, firstKept, keptValue(id))
    return { state: kept, earned: kept.total - s.total }
  }
  const earned = reviewValue(s, id)
  return {
    state: {
      ...got,
      total: got.total + earned,
      retention: {
        ...s.retention,
        [device]: (s.retention?.[device] ?? 0) + earned,
      },
    },
    earned: got.total + earned - s.total,
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

/**
 * Bring a save from before per-device retention into the current shape: any
 * points not explained by one-time awards must have come from Retention on
 * this device.
 */
export function normalize(s: ReviewState, device: string): ReviewState {
  if (s.retention) return { ...s, total: computeTotal(s) }
  const awards = computeTotal({ ...s, retention: {} })
  const retention = { [device]: Math.max(0, s.total - awards) }
  return { ...s, retention, total: awards + (retention[device] ?? 0) }
}

/**
 * Combine two saves of the same player from different devices. Nothing is
 * lost and nothing counts twice: awards are a set, retention is per device,
 * and each review item keeps whichever copy was reviewed most recently.
 */
export function mergeReview(a: ReviewState, b: ReviewState): ReviewState {
  const items = { ...a.items }
  for (const [id, it] of Object.entries(b.items)) {
    const mine = items[id]
    if (!mine || it.last > mine.last) items[id] = it
  }
  const retention = { ...a.retention }
  for (const [d, n] of Object.entries(b.retention ?? {}))
    retention[d] = Math.max(retention[d] ?? 0, n)
  const merged: ReviewState = {
    awarded: { ...a.awarded, ...b.awarded },
    items,
    retention,
    reviewsRight: Math.max(a.reviewsRight ?? 0, b.reviewsRight ?? 0),
    total: 0,
  }
  return { ...merged, total: computeTotal(merged) }
}
