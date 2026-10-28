/**
 * What a screen reader hears for each thing on the board. Pure, so the words
 * are tested without a DOM; every number comes from `simulate()`.
 */

export type NodeFacts = {
  /** The component's name under the current provider. */
  name: string
  instances?: number
  shards?: number
  /** Only while traffic runs. */
  utilization?: number
  dead?: boolean
  selected?: boolean
}

export function nodeLabel(n: NodeFacts): string {
  const parts = [n.name]
  if ((n.instances ?? 1) > 1) parts.push(`${n.instances} instances`)
  if ((n.shards ?? 1) > 1) parts.push(`${n.shards} shards`)
  if (n.dead) parts.push("down")
  else if (n.utilization !== undefined) {
    parts.push(
      Number.isFinite(n.utilization)
        ? `${Math.round(n.utilization * 100)}% load`
        : "unlimited load",
    )
    if (!Number.isFinite(n.utilization) || n.utilization >= 1)
      parts.push("overloaded")
  }
  if (n.selected) parts.push("selected")
  return parts.join(", ")
}

/** `carries` is the connection's inferred traffic: "all", "reads", "writes" or labels. */
export function edgeLabel(from: string, to: string, carries?: string): string {
  return `Connection from ${from} to ${to}${carries && carries !== "all" ? `, ${carries}` : ""}`
}
