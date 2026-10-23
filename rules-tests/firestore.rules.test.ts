import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { readFileSync } from "node:fs"
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest"

/**
 * The security rules, exercised against the Firestore emulator. Run with
 * `pnpm test:rules` (needs Java for the emulator; CI has it).
 */
let env: RulesTestEnvironment

const save = () => ({
  v: 1,
  progress: { "front-page": { stars: 3 } },
  review: {
    awarded: { "pass:front-page": true },
    items: {},
    retention: {},
    reviewsRight: 0,
  },
  decks: {},
  quizzes: {},
  updatedAt: serverTimestamp(),
})

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-architech",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  })
})
beforeEach(() => env.clearFirestore())
afterAll(() => env.cleanup())

const as = (uid: string | null) =>
  (uid
    ? env.authenticatedContext(uid)
    : env.unauthenticatedContext()
  ).firestore()

describe("a player's save", () => {
  it("can be written and read by its owner", async () => {
    const db = as("alice")
    await assertSucceeds(setDoc(doc(db, "users/alice/save/main"), save()))
    await assertSucceeds(getDoc(doc(db, "users/alice/save/main")))
  })

  it("can't be read or written by anyone else", async () => {
    await env.withSecurityRulesDisabled((c) =>
      setDoc(doc(c.firestore(), "users/alice/save/main"), {
        ...save(),
        updatedAt: new Date(),
      }),
    )
    await assertFails(getDoc(doc(as("mallory"), "users/alice/save/main")))
    await assertFails(
      setDoc(doc(as("mallory"), "users/alice/save/main"), save()),
    )
    await assertFails(getDoc(doc(as(null), "users/alice/save/main")))
  })

  it("rejects unexpected fields and oversized data", async () => {
    const db = as("alice")
    await assertFails(
      setDoc(doc(db, "users/alice/save/main"), { ...save(), extra: "x" }),
    )
    const huge = Object.fromEntries(
      Array.from({ length: 5001 }, (_, i) => [`k${i}`, true]),
    )
    await assertFails(
      setDoc(doc(db, "users/alice/save/main"), {
        ...save(),
        review: { ...save().review, awarded: huge },
      }),
    )
  })

  it("rejects a client-chosen timestamp", async () => {
    await assertFails(
      setDoc(doc(as("alice"), "users/alice/save/main"), {
        ...save(),
        updatedAt: new Date(0),
      }),
    )
  })

  it("throttles rapid rewrites", async () => {
    const db = as("alice")
    await assertSucceeds(setDoc(doc(db, "users/alice/save/main"), save()))
    await assertFails(setDoc(doc(db, "users/alice/save/main"), save()))
  })

  it("allows nothing outside a player's own save", async () => {
    await assertFails(
      setDoc(doc(as("alice"), "leaderboard/alice"), { score: 1e9 }),
    )
    await assertFails(setDoc(doc(as("alice"), "users/alice/other/x"), { a: 1 }))
  })
})
