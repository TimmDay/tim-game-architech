import { COLS, ROWS } from "~/game/edit"
import type { Category } from "~/sim/types"

/** Tile size on screen. 2:1 is classic isometric (really dimetric) pixel art. */
export const TW = 88
export const TH = 44

export const iso = (x: number, y: number) => ({
  sx: ((x - y) * TW) / 2,
  sy: ((x + y) * TH) / 2,
})

/** Inverse of `iso`, rounded to the nearest tile. */
export function tileAt(sx: number, sy: number) {
  const a = sx / (TW / 2)
  const b = sy / (TH / 2)
  return { x: Math.round((a + b) / 2), y: Math.round((b - a) / 2) }
}

/** World-space bounding box of the whole board, with headroom for blocks. */
export const BOARD_BOUNDS = (() => {
  const left = iso(0, ROWS - 1).sx - TW / 2
  const right = iso(COLS - 1, 0).sx + TW / 2
  const top = iso(0, 0).sy - TH / 2 - 60
  const bottom = iso(COLS - 1, ROWS - 1).sy + TH / 2 + 30
  return { left, right, top, bottom, width: right - left, height: bottom - top }
})()

export const CATEGORY_HUE: Record<Category, number> = {
  edge: 188,
  compute: 222,
  data: 272,
  messaging: 36,
}

/** Utilisation to a hue: green when idle, through amber, to red when saturated. */
export function healthHue(utilization: number) {
  if (!Number.isFinite(utilization) || utilization >= 1) return 352
  if (utilization >= 0.8) return 32
  if (utilization >= 0.6) return 62
  return 152
}

export const faces = (hue: number, sat = 85) => ({
  top: `hsl(${hue} ${sat}% 62%)`,
  left: `hsl(${hue} ${sat - 10}% 38%)`,
  right: `hsl(${hue} ${sat - 15}% 26%)`,
  glow: `hsl(${hue} 100% 65%)`,
})

export const diamond = (hw: number, hh: number, cy = 0) =>
  `${0},${cy - hh} ${hw},${cy} ${0},${cy + hh} ${-hw},${cy}`
