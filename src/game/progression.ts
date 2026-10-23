import { LEVELS, levelById, type Level } from "~/levels"
import type { Progress } from "./storage"

/** A level counts as completed once it has earned a star. */
export const isComplete = (id: string, progress: Progress) =>
  (progress[id]?.stars ?? 0) > 0

export const isUnlocked = (level: Level, progress: Progress) =>
  level.requires.every((id) => isComplete(id, progress))

/** The titles still standing between the player and this level. */
export const missingPrereqs = (level: Level, progress: Progress) =>
  level.requires
    .filter((id) => !isComplete(id, progress))
    .flatMap((id) => levelById(id)?.title ?? [])

export const lockedCount = (progress: Progress) =>
  LEVELS.filter((l) => !isUnlocked(l, progress)).length
