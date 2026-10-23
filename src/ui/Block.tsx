import {
  Archive,
  Boxes,
  Cog,
  Database,
  DatabaseBackup,
  DoorOpen,
  Globe,
  ListOrdered,
  MemoryStick,
  Radio,
  Search,
  Server,
  Signpost,
  Split,
  Users,
  Warehouse,
  ScanText,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { CATALOGUE } from "~/sim/catalogue"
import type { ComponentKind } from "~/sim/types"
import { CATEGORY_HUE, TH, TW, diamond, faces, healthHue } from "./iso"

export const ICONS: Record<ComponentKind, LucideIcon> = {
  dns: Signpost,
  cdn: Globe,
  "load-balancer": Split,
  "api-gateway": DoorOpen,
  "app-server": Server,
  serverless: Zap,
  cache: MemoryStick,
  "sql-primary": Database,
  "sql-replica": DatabaseBackup,
  nosql: Boxes,
  queue: ListOrdered,
  "event-stream": Radio,
  worker: Cog,
  "object-store": Archive,
  "search-index": Search,
  "data-warehouse": Warehouse,
  "doc-ai": ScanText,
}

const S = 0.62
const HW = (TW / 2) * S
const HH = (TH / 2) * S

/** Lays a flat icon on the top face of a block, in the iso plane. */
function FlatIcon({
  Icon,
  cy,
  color,
}: {
  Icon: LucideIcon
  cy: number
  color: string
}) {
  const size = HW * 0.95
  return (
    <g transform={`translate(0 ${cy}) scale(1 0.5) rotate(45)`}>
      <Icon
        x={-size / 2}
        y={-size / 2}
        width={size}
        height={size}
        color={color}
        strokeWidth={2.2}
      />
    </g>
  )
}

function Box({
  z,
  h,
  hue,
  dim,
}: {
  z: number
  h: number
  hue: number
  dim?: boolean
}) {
  const f = faces(hue, dim ? 10 : 85)
  const top = -(z + h)
  return (
    <g>
      <polygon
        points={`${-HW},${top} 0,${top + HH} 0,${top + HH + h} ${-HW},${top + h}`}
        fill={f.left}
      />
      <polygon
        points={`${HW},${top} 0,${top + HH} 0,${top + HH + h} ${HW},${top + h}`}
        fill={f.right}
      />
      <polygon points={diamond(HW, HH, top)} fill={f.top} />
      <polyline
        points={`${-HW},${top} 0,${top - HH} ${HW},${top}`}
        fill="none"
        stroke="white"
        strokeOpacity={0.45}
        strokeWidth={1}
      />
    </g>
  )
}

function Cylinder({
  h,
  hue,
  rings,
  dim,
}: {
  h: number
  hue: number
  rings: number
  dim?: boolean
}) {
  const f = faces(hue, dim ? 10 : 85)
  const rx = HW * 0.92
  const ry = HH * 0.92
  const id = `cyl-${hue}-${dim ? "d" : "l"}`
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor={f.left} />
          <stop offset="1" stopColor={f.right} />
        </linearGradient>
      </defs>
      <path
        d={`M ${-rx} ${-h} L ${-rx} 0 A ${rx} ${ry} 0 0 0 ${rx} 0 L ${rx} ${-h} Z`}
        fill={`url(#${id})`}
      />
      {Array.from({ length: rings }, (_, i) => {
        const y = -h + ((i + 1) * h) / (rings + 1)
        return (
          <path
            key={i}
            d={`M ${-rx} ${y} A ${rx} ${ry} 0 0 0 ${rx} ${y}`}
            fill="none"
            stroke="white"
            strokeOpacity={0.25}
          />
        )
      })}
      <ellipse cx={0} cy={-h} rx={rx} ry={ry} fill={f.top} />
      <ellipse
        cx={0}
        cy={-h}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="white"
        strokeOpacity={0.4}
      />
    </g>
  )
}

export type BlockStatus = {
  utilization: number
  dead: boolean
  /** Instances still standing, so a chaos round visibly knocks slabs out. */
  alive?: number
}

/**
 * One component, drawn at the origin. The shape says what family it is
 * (servers stack, stores are cylinders, edge services are platforms, messaging
 * is a low slab with lanes); the colour says how it's coping once traffic runs.
 */
export function Block({
  kind,
  instances,
  status,
  selected,
  flagged,
}: {
  kind: ComponentKind
  instances: number
  status?: BlockStatus
  selected?: boolean
  flagged?: boolean
}) {
  const spec = CATALOGUE[kind]
  const dead = status?.dead ?? false
  const hue =
    status && !dead
      ? healthHue(status.utilization)
      : CATEGORY_HUE[spec.category]
  const overloaded = status && !dead && status.utilization >= 1
  const Icon = ICONS[kind]
  const iconColor = dead ? "#64748b" : "rgba(10,14,28,0.85)"

  let body: React.ReactNode
  let topY: number
  if (spec.category === "data") {
    const h = 30
    topY = -h
    body = (
      <Cylinder h={h} hue={hue} rings={Math.min(instances, 4) - 1} dim={dead} />
    )
  } else if (spec.category === "compute") {
    const slabs = Math.min(instances, 4)
    const sh = 10
    const gap = 3
    topY = -(slabs * (sh + gap) - gap)
    body = (
      <g>
        {Array.from({ length: slabs }, (_, i) => (
          <Box
            key={i}
            z={i * (sh + gap)}
            h={sh}
            hue={hue}
            // Knock out slabs from the bottom up as instances die.
            dim={
              dead ||
              (status?.alive !== undefined &&
                i < slabs - Math.min(slabs, status.alive))
            }
          />
        ))}
      </g>
    )
  } else if (spec.category === "messaging") {
    const h = 12
    topY = -h
    body = (
      <g>
        <Box z={0} h={h} hue={hue} dim={dead} />
        {[-0.5, 0, 0.5].map((t) => {
          // Lanes run along one axis of the top face: c + t*v +/- 0.7u.
          const ux = HW / 2
          const uy = -HH / 2
          const cx = (t * HW) / 2
          const cy = -h + (t * HH) / 2
          return (
            <line
              key={t}
              x1={cx - 1.4 * ux}
              y1={cy - 1.4 * uy}
              x2={cx + 1.4 * ux}
              y2={cy + 1.4 * uy}
              stroke="rgba(10,14,28,0.3)"
              strokeWidth={2}
            />
          )
        })}
      </g>
    )
  } else {
    const h = 8
    topY = -h
    body = (
      <g>
        <Box z={0} h={h} hue={hue} dim={dead} />
      </g>
    )
  }

  return (
    <g>
      {selected && (
        <polygon
          className="pulse"
          points={diamond(TW / 2 - 6, TH / 2 - 3)}
          fill="hsl(188 100% 60% / 0.12)"
          stroke="hsl(188 100% 65%)"
          strokeWidth={2}
        />
      )}
      {flagged && (
        <polygon
          points={diamond(TW / 2 - 4, TH / 2 - 2)}
          fill="none"
          stroke="hsl(140 90% 60%)"
          strokeWidth={2.5}
          strokeDasharray="6 4"
        />
      )}
      {/* Ground shadow / glow */}
      <ellipse
        cx={0}
        cy={2}
        rx={HW * 1.15}
        ry={HH * 1.15}
        fill={
          overloaded
            ? "hsl(352 100% 60% / 0.45)"
            : `hsl(${hue} 100% 60% / 0.16)`
        }
        className={overloaded ? "throb" : undefined}
      />
      {body}
      {!dead && <FlatIcon Icon={Icon} cy={topY} color={iconColor} />}
      {dead && (
        <g stroke="hsl(352 90% 62%)" strokeWidth={3} strokeLinecap="round">
          <line x1={-8} y1={topY - 5} x2={8} y2={topY + 5} />
          <line x1={8} y1={topY - 5} x2={-8} y2={topY + 5} />
        </g>
      )}
    </g>
  )
}

/** The traffic source: a little crowd on a platform. */
export function ClientBlock({ selected }: { selected?: boolean }) {
  const f = faces(320, 90)
  return (
    <g>
      {selected && (
        <polygon
          className="pulse"
          points={diamond(TW / 2 - 6, TH / 2 - 3)}
          fill="hsl(188 100% 60% / 0.12)"
          stroke="hsl(188 100% 65%)"
          strokeWidth={2}
        />
      )}
      <ellipse
        cx={0}
        cy={2}
        rx={HW * 1.2}
        ry={HH * 1.2}
        fill="hsl(320 100% 60% / 0.2)"
      />
      <polygon points={diamond(HW, HH, -6)} fill={f.top} />
      <polygon
        points={`${-HW},-6 0,${-6 + HH} 0,${HH} ${-HW},0`}
        fill={f.left}
      />
      <polygon
        points={`${HW},-6 0,${-6 + HH} 0,${HH} ${HW},0`}
        fill={f.right}
      />
      <Users
        x={-13}
        y={-36}
        width={26}
        height={26}
        color="hsl(320 100% 85%)"
        strokeWidth={2.2}
      />
    </g>
  )
}
