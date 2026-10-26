import clsx from "clsx"
import { CATALOGUE } from "~/sim/catalogue"
import {
  copies,
  failureDomains,
  partitionKeyOf,
  shardsOf,
} from "~/sim/simulate"
import type {
  ComponentMetrics,
  LoadProfile,
  PlacedComponent,
} from "~/sim/types"
import { pct } from "./format"

/** More rows than this and the map stops being readable on a phone. */
const MAX_ROWS = 8
const ZONES = ["A", "B", "C"]

const tone = (u: number | undefined) =>
  u === undefined
    ? "border-white/15 bg-white/[0.04] text-slate-300"
    : u >= 1
      ? "border-rose-400/60 bg-rose-400/20 text-rose-100"
      : u >= 0.7
        ? "border-amber-300/50 bg-amber-300/15 text-amber-100"
        : "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"

/**
 * Inside a partitioned store: one row per shard (different data), one
 * column per zone, and in each row the copies of that shard's data (the
 * same data). Every number is the engine's; only where a lost copy is drawn
 * is a choice, and it's always zone A first, as the zone outage is.
 */
export function ShardMap({
  c,
  load,
  m,
}: {
  c: PlacedComponent
  load: LoadProfile
  /** While a test runs: load per shard and copies alive. */
  m?: ComponentMetrics
}) {
  const key = partitionKeyOf(c, load)
  if (!key) return null
  const shards = shardsOf(c, load)
  const managed = CATALOGUE[c.kind].managed
  const perShard = managed ? copies(c) : c.instances
  const zones = managed ? 3 : failureDomains(c)
  const lost = m && !managed ? Math.max(0, c.instances - m.aliveInstances) : 0
  const hot = m && shards > 1 && (m.hotShardShare ?? 0) > 1 / shards + 0.01
  const loadOf = (row: number) =>
    !m
      ? undefined
      : row === 0 || !hot
        ? m.utilization
        : (m.restShardUtilization ?? m.utilization)
  const rows = Math.min(shards, MAX_ROWS)

  return (
    <div className="rounded-xl border border-indigo-300/20 bg-indigo-300/[0.04] p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-slate-200">Inside the store</span>
        <span className="font-mono text-[11px] text-slate-500">
          {shards} shard{shards === 1 ? "" : "s"} × {perShard} cop
          {perShard === 1 ? "y" : "ies"}
        </span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 font-mono text-[10px]">
          <thead>
            <tr className="text-slate-500">
              <th className="w-12 text-left font-normal">Shard</th>
              {ZONES.slice(0, zones).map((z) => (
                <th key={z} className="font-normal">
                  Zone {z}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => {
              const u = loadOf(row)
              // Copy j sits in zone j % zones; the lost ones are the first.
              const cells = Array.from({ length: zones }, (_, z) =>
                Array.from({ length: perShard }, (_, j) => j).filter(
                  (j) => j % zones === z,
                ),
              )
              const primary = lost < perShard ? lost : -1
              return (
                <tr key={row}>
                  <td
                    className={clsx(
                      "rounded-md border px-1.5 py-1 text-center",
                      tone(u),
                    )}
                  >
                    {row + 1}
                    {u !== undefined && (
                      <div className="opacity-70">
                        {pct(Math.min(u, 9.99), 0)}
                      </div>
                    )}
                  </td>
                  {cells.map((js, z) => (
                    <td key={z} className="text-center align-middle">
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {js.map((j) => (
                          <span
                            key={j}
                            title={
                              j < lost
                                ? "Lost in the incident"
                                : j === primary
                                  ? "Primary: takes this shard's writes"
                                  : "Standby: same data, ready to take over"
                            }
                            className={clsx(
                              "rounded px-1 py-0.5",
                              j < lost
                                ? "bg-white/5 text-slate-600 line-through"
                                : j === primary
                                  ? "bg-indigo-300 font-bold text-slate-950"
                                  : "bg-indigo-300/20 text-indigo-100",
                            )}
                          >
                            {managed ? "copy" : j === primary ? "P" : "S"}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {shards > rows && (
        <p className="mt-1 font-mono text-[10px] text-slate-500">
          …and {shards - rows} more shards like these
        </p>
      )}
      <p className="mt-2 text-[11px] leading-snug text-slate-400">
        Rows hold <span className="text-slate-200">different</span> data, split
        by {key.label.toLowerCase()}. Copies in a row hold the{" "}
        <span className="text-slate-200">same</span> data.{" "}
        {managed
          ? "The provider keeps three copies of each, one per zone."
          : perShard === 1
            ? "One copy each: lose it and that shard's data is gone."
            : "P takes the writes; an S takes over if it fails."}
        {hot && m?.hotShardShare !== undefined && (
          <>
            {" "}
            <span className="text-amber-200">
              Shard 1 is the busiest: {pct(m.hotShardShare, 0)} of the traffic.
            </span>
          </>
        )}
      </p>
    </div>
  )
}
