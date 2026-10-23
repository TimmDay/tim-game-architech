import type { Targets } from "~/sim/grade"
import type {
  ComponentKind,
  Fault,
  Graph,
  LoadProfile,
  PlacedComponent,
} from "~/sim/types"
import { CLIENT_ID } from "~/sim/types"
import type { ConceptId } from "./concepts"
import type { Scenario } from "./roles"

/**
 * Text in levels, findings and concept cards writes component names as
 * `{kind}` tokens, never as product names. The provider toggle then renames
 * every one of them, and a test greps for any product name that slipped in raw.
 */
export type Mode = "build" | "repair"

export type Level = {
  id: string
  mode: Mode
  /**
   * Levels that must have at least one star first: the ones that introduce
   * what this level assumes you know.
   */
  requires: string[]
  title: string
  /** One line for the level card. */
  tagline: string
  brief: string
  /** What the system is about, for the per-component discussion. */
  scenario: Scenario
  load: LoadProfile
  targets: Targets
  chaos: { faults: Fault[]; label: string }
  palette: ComponentKind[]
  /** Repair levels start from somebody else's architecture. */
  starter?: Graph
  /** Repair levels: the component that is really to blame. */
  rootCause?: { componentId: string; explanation: string }
  /** Must earn three stars: pins the level as winnable in CI. Never shown. */
  reference: Graph
  concepts: ConceptId[]
  hint: string
}

type Row = [
  id: string,
  kind: ComponentKind,
  x: number,
  y: number,
  instances?: number,
  zones?: number,
]

/** Terse graph literal: components as rows, edges as `from>to` strings. */
export function graph(rows: Row[], edges: string[]): Graph {
  const components: PlacedComponent[] = rows.map(
    ([id, kind, x, y, instances = 1, zones = 1]) => ({
      id,
      kind,
      x,
      y,
      instances,
      zones,
    }),
  )
  return {
    components,
    edges: edges.map((s) => {
      const [from = "", to = ""] = s.split(">")
      return { id: `${from}>${to}`, from, to }
    }),
  }
}

export const CLIENT_TILE = { x: 0, y: 4 }
const C = CLIENT_ID

const BUILD: Level[] = [
  {
    id: "first-customers",
    requires: [],
    mode: "build",
    title: "First Customers",
    tagline: "Your helpdesk app outgrew the laptop under the desk.",
    brief:
      "A helpdesk startup just signed its first real customers. At peak you'll see 500 requests a second, mostly agents reading tickets. Put a {load-balancer} in front of a pool of {app-server} instances and give them a {sql-primary} to keep tickets in. Then make sure losing one server doesn't take everyone down.",
    scenario: {
      product: "the helpdesk",
      reads: "agents opening tickets",
      writes: "ticket replies and status changes",
      hot: "the open-ticket queue and customer profiles",
      records: "tickets, replies and customer accounts",
    },
    load: {
      peakRps: 500,
      readFraction: 0.8,
      cacheableFraction: 0.5,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 400,
      writesReach: ["durable"],
      noBacklog: false,
    },
    chaos: {
      faults: [{ kind: "kill-instance", target: "app-server" }],
      label: "An app instance crashes",
    },
    palette: ["dns", "load-balancer", "app-server", "sql-primary"],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 3, 2],
        ["db", "sql-primary", 6, 4, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    ),
    concepts: ["horizontal-scaling", "n-plus-one-redundancy", "standby"],
    hint: "Two {app-server} instances can serve peak, but can they still serve it with one gone? And a single {sql-primary} lives in one zone.",
  },
  {
    id: "front-page",
    requires: ["first-customers"],
    mode: "build",
    title: "Front Page",
    tagline: "A story is trending and everyone reads the same 50 articles.",
    brief:
      "A news site's logged-in feed is personalised, so the page itself can't sit at the edge, but the articles behind it are the same for everyone. Peak is 3,000 requests a second and 95% of them are reads. The {sql-primary} tops out around 2,000 reads a second. Keep p99 under 250ms on a budget that won't stretch to a fleet of replicas.",
    scenario: {
      product: "the news site",
      reads: "readers loading their feed and articles",
      writes: "comments, likes and newly published articles",
      hot: "the trending articles that everyone is reading right now",
      records: "articles, comments and reader accounts",
    },
    load: {
      peakRps: 3_000,
      readFraction: 0.95,
      cacheableFraction: 0.9,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 250,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 750,
      writesReach: ["durable"],
      noBacklog: false,
    },
    chaos: {
      faults: [{ kind: "kill-instance", target: "cache" }],
      label: "The cache node restarts cold",
    },
    palette: [
      "load-balancer",
      "app-server",
      "cache",
      "sql-primary",
      "sql-replica",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 14, 2],
        ["cache", "cache", 6, 3, 2, 2],
        ["db", "sql-primary", 8, 4, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>cache", "cache>db"],
    ),
    concepts: ["cache-aside", "read-replicas", "latency-under-load"],
    hint: "Put a {cache} between the {app-server} tier and the {sql-primary}: hits never touch the database. Then check the database can survive the cache going cold.",
  },
  {
    id: "going-viral",
    requires: ["front-page"],
    mode: "build",
    title: "Going Viral",
    tagline: "One meme, twenty thousand requests a second.",
    brief:
      "An image of a cat in a tiny hat has escaped containment. 20,000 requests a second want the same few images, and almost none of them write anything. Serving files from {app-server} instances would take a hundred of them. You have $100 a month.",
    scenario: {
      product: "the meme site",
      reads: "people loading the same few images",
      writes: "new image uploads",
      hot: "the viral images themselves",
      records: "image files",
      files: "every uploaded image",
    },
    load: {
      peakRps: 20_000,
      readFraction: 0.995,
      cacheableFraction: 0.95,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 200,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 100,
      writesReach: ["object-store"],
      noBacklog: false,
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 2 }],
      label: "It hits the front page of everywhere (2x traffic)",
    },
    palette: ["dns", "cdn", "load-balancer", "app-server", "object-store"],
    reference: graph(
      [
        ["dns", "dns", 2, 4],
        ["cdn", "cdn", 4, 4],
        ["blobs", "object-store", 6, 4],
      ],
      [`${C}>dns`, "dns>cdn", "cdn>blobs"],
    ),
    concepts: ["cdn", "static-vs-dynamic", "object-storage"],
    hint: "Static files belong in an {object-store}, served from a {cdn} at the edge. Nothing in this level needs a server you run.",
  },
  {
    id: "upload-rush",
    requires: ["going-viral"],
    mode: "build",
    title: "Upload Rush",
    tagline: "Every upload needs resizing, and resizing takes two seconds.",
    brief:
      "A photo app: 600 requests a second, half of them uploads. Every upload must be resized into four sizes, which takes about two seconds of CPU. Users won't wait two seconds for a button to respond, and the resizing has to keep up with the uploads, or the backlog grows forever.",
    scenario: {
      product: "the photo app",
      reads: "people browsing albums",
      writes: "photo uploads",
      hot: "album pages and thumbnails",
      records: "photo metadata: owner, album and caption",
      files: "the original photos and their resized copies",
      job: "resizing each upload into four sizes",
    },
    load: {
      peakRps: 600,
      readFraction: 0.5,
      cacheableFraction: 0.3,
      heavyWriteFraction: 1,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.99,
      budgetUsd: 650,
      writesReach: ["object-store", "sql-primary"],
      noBacklog: true,
    },
    chaos: {
      faults: [{ kind: "kill-instance", target: "worker" }],
      label: "A worker dies mid-job",
    },
    palette: [
      "load-balancer",
      "app-server",
      "queue",
      "worker",
      "object-store",
      "sql-primary",
      "cache",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 3, 2],
        ["db", "sql-primary", 6, 6],
        ["q", "queue", 6, 2],
        ["workers", "worker", 8, 2, 8, 2],
        ["blobs", "object-store", 10, 3],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>q", "q>workers", "workers>blobs"],
    ),
    concepts: ["async-processing", "competing-consumers", "backpressure"],
    hint: "The {app-server} should accept the upload and drop a message on a {queue}. A pool of {worker} instances does the slow part, and needs enough of them to drain it.",
  },
  {
    id: "zone-outage",
    requires: ["upload-rush"],
    mode: "build",
    title: "Zone Outage",
    tagline:
      "A data centre is about to lose power. You just don't know which one.",
    brief:
      "A payments dashboard promises 99.95% availability. 1,500 requests a second, mostly reads. This time, during the load test, a whole availability zone goes dark. Everything you put in only one zone goes dark with it.",
    scenario: {
      product: "the payments dashboard",
      reads: "merchants checking balances and recent payments",
      writes: "refunds and settings changes",
      hot: "today's totals and recent payment lists",
      records: "payments, refunds and merchant accounts",
    },
    load: {
      peakRps: 1_500,
      readFraction: 0.9,
      cacheableFraction: 0.7,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 250,
      maxErrorRate: 0.001,
      availability: 0.9995,
      budgetUsd: 650,
      writesReach: ["durable"],
      noBacklog: false,
    },
    chaos: { faults: [{ kind: "zone-outage" }], label: "Zone A loses power" },
    palette: [
      "load-balancer",
      "app-server",
      "cache",
      "sql-primary",
      "sql-replica",
      "nosql",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 8, 2],
        ["cache", "cache", 6, 3],
        ["db", "sql-primary", 8, 4, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>cache", "cache>db"],
    ),
    concepts: ["availability-zones", "standby", "availability-math"],
    hint: "Spread instances over two or more zones, and make sure what's left after losing one zone can still carry the whole peak. A {sql-primary} needs a standby in another zone.",
  },
  {
    id: "feed-the-analysts",
    requires: ["zone-outage"],
    mode: "build",
    title: "Feed the Analysts",
    tagline:
      "Search wants every order. So does the warehouse. So does checkout.",
    brief:
      "An online shop takes 800 requests a second. Every order has to land in the {sql-primary}, become searchable in the {search-index}, and reach the {data-warehouse} for the finance team. The warehouse is built for big queries, not for sitting on the checkout path.",
    scenario: {
      product: "the shop",
      reads: "customers browsing and searching",
      writes: "orders",
      hot: "product pages",
      records: "orders, customers and stock levels",
      events: "an order-placed event for every order",
    },
    load: {
      peakRps: 800,
      readFraction: 0.6,
      cacheableFraction: 0.4,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 800,
      writesReach: ["sql-primary", "search-index", "data-warehouse"],
      noBacklog: true,
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 1.5 }],
      label: "Flash sale (1.5x traffic)",
    },
    palette: [
      "load-balancer",
      "app-server",
      "sql-primary",
      "queue",
      "event-stream",
      "worker",
      "search-index",
      "data-warehouse",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 4, 2],
        ["db", "sql-primary", 6, 6, 2, 2],
        ["stream", "event-stream", 6, 2],
        ["search", "search-index", 9, 1],
        ["dw", "data-warehouse", 9, 3],
      ],
      [
        `${C}>lb`,
        "lb>app",
        "app>db",
        "app>stream",
        "stream>search",
        "stream>dw",
      ],
    ),
    concepts: ["queue-vs-log", "fan-out", "oltp-vs-olap"],
    hint: "A {queue} gives each message to ONE consumer. An {event-stream} gives every consumer every message.",
  },
]

/**
 * Added after the original six, so they live in their own list but play as
 * build levels: see BUILD below.
 */
const LATER_BUILD: Level[] = [
  {
    id: "shoebox-receipts",
    mode: "build",
    requires: ["upload-rush"],
    title: "Shoebox of Receipts",
    tagline:
      "Everyone remembers their receipts the week before the tax deadline.",
    scenario: {
      product: "the receipts app",
      reads: "freelancers reviewing their expenses and running reports",
      writes: "receipts typed into a form or photographed",
      hot: "this year's expense categories and totals",
      records: "receipts: merchant, date, amount, tax and category",
      files: "receipt photos",
      job: "reading each receipt photo with OCR",
    },
    brief:
      "Freelancers log expenses for their tax return. They can type a receipt into a form, or photograph it and let OCR fill in merchant, date, amount and tax. Usage piles up before the filing deadline: the UK tax authority has had more than 600,000 returns filed on deadline day alone. Peak is 800 requests a second; a quarter are new receipts, and 60% of those are photos. The {doc-ai} takes seconds per receipt and caps how many calls you make each second.",
    load: {
      peakRps: 800,
      readFraction: 0.75,
      cacheableFraction: 0.2,
      heavyWriteFraction: 0.6,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 1_300,
      writesReach: ["sql-primary", "object-store"],
      noBacklog: true,
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 1.5 }],
      label: "Deadline day (1.5x traffic)",
    },
    palette: [
      "load-balancer",
      "app-server",
      "sql-primary",
      "object-store",
      "queue",
      "worker",
      "doc-ai",
      "cache",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 4, 2],
        ["db", "sql-primary", 7, 6, 2, 2],
        ["blobs", "object-store", 5, 7],
        ["q", "queue", 6, 2],
        ["workers", "worker", 8, 2, 4, 2],
        ["ocr", "doc-ai", 10, 2, 5],
      ],
      [
        `${C}>lb`,
        "lb>app",
        "app>db",
        "app>blobs",
        "app>q",
        "q>workers",
        "workers>ocr",
        "workers>db",
      ],
    ),
    concepts: ["provider-quotas", "async-processing", "backpressure"],
    hint: "Typed-in receipts can be saved straight away. Photos go on a {queue}, and {worker} instances call the {doc-ai} at a pace its quota allows. Size both for deadline day, not a normal Tuesday.",
  },
  {
    id: "plug-finder",
    mode: "build",
    requires: ["going-viral", "feed-the-analysts"],
    title: "Plug Finder",
    tagline:
      "Every EV on the road is looking for a free charger at the same time.",
    scenario: {
      product: "the charger-finding app",
      reads: "drivers panning the map for chargers near them",
      writes: "check-ins, 'in use' flags and notes for other drivers",
      hot: "station availability in busy areas and along motorways",
      records: "stations, their live status, check-ins and notes",
      events:
        "a status-changed event each time a charger is marked in use or free",
    },
    brief:
      "Drivers open the map to find a free charger nearby. They can mark a charger as in use while they charge, and leave notes for others ('bay 3 is blocked', 'card reader broken'). The US alone has over 250,000 public charging ports, and holiday road trips are the peak: Tesla reported more than two million Supercharger sessions over Thanksgiving 2025. Peak is 3,000 requests a second, nearly all map views; availability changes every few minutes.",
    load: {
      peakRps: 3_000,
      readFraction: 0.95,
      cacheableFraction: 0.6,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 400,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 600,
      writesReach: ["nosql", "search-index"],
      noBacklog: true,
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 2 }],
      label: "Holiday road trip (2x traffic)",
    },
    palette: [
      "dns",
      "cdn",
      "load-balancer",
      "app-server",
      "cache",
      "nosql",
      "sql-primary",
      "search-index",
      "event-stream",
      "queue",
    ],
    reference: graph(
      [
        ["dns", "dns", 1, 4],
        ["cdn", "cdn", 2, 3],
        ["lb", "load-balancer", 3, 2],
        ["app", "app-server", 5, 4, 8, 2],
        ["cache", "cache", 7, 4, 2, 2],
        ["kv", "nosql", 9, 5],
        ["geo", "search-index", 7, 1],
        ["stream", "event-stream", 6, 6],
      ],
      [
        `${C}>dns`,
        "dns>cdn",
        "cdn>lb",
        "lb>app",
        "app>cache",
        "cache>kv",
        "app>geo",
        "app>stream",
        "stream>geo",
      ],
    ),
    concepts: ["micro-caching", "geospatial-indexing", "fan-out"],
    hint: "Most map views ask the same question about the same area. A {cdn} that caches each answer for even 30 seconds takes most of the load off your servers. Keep live status in a fast {nosql} store, and feed the {search-index} with events.",
  },
]

const REPAIR: Level[] = [
  {
    id: "lost-writes",
    requires: ["front-page"],
    mode: "repair",
    title: "Lost Writes",
    tagline: "Support tickets are vanishing. The dashboards are all green.",
    brief:
      "Customers swear they saved their changes. The changes are gone. Nothing is erroring and latency looks fine. Load test it, work out which component is to blame, then fix it.",
    scenario: {
      product: "the helpdesk",
      reads: "customers and agents opening tickets",
      writes: "edits to tickets",
      hot: "recently viewed tickets",
      records: "tickets and their edit history",
    },
    load: {
      peakRps: 600,
      readFraction: 0.8,
      cacheableFraction: 0.5,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 600,
      writesReach: ["durable"],
      noBacklog: false,
    },
    chaos: {
      faults: [{ kind: "kill-instance", target: "app-server" }],
      label: "An app instance crashes",
    },
    palette: ["load-balancer", "app-server", "sql-primary", "sql-replica"],
    starter: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 3, 2],
        ["replica", "sql-replica", 7, 3],
        ["db", "sql-primary", 7, 6, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>replica"],
    ),
    rootCause: {
      componentId: "replica",
      explanation:
        "The app was pointed at the {sql-replica} and nothing else. A replica only serves reads, so every write had nowhere to go. The {sql-primary} is sitting right there, unconnected.",
    },
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 3, 2],
        ["replica", "sql-replica", 7, 3],
        ["db", "sql-primary", 7, 6, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>replica", "app>db"],
    ),
    concepts: ["read-replicas", "replication-lag"],
    hint: "Follow the writes. Where does a write go after it leaves the {app-server}?",
  },
  {
    id: "black-friday",
    requires: ["lost-writes"],
    mode: "repair",
    title: "Black Friday",
    tagline: "Traffic tripled overnight and checkout is timing out.",
    brief:
      "The shop scaled the app tier to ten instances last night and it's still falling over: 2,500 requests a second, nearly all of them browsing the same catalogue. Find the real bottleneck. Adding more of the wrong thing just burns money.",
    scenario: {
      product: "the shop",
      reads: "shoppers browsing the catalogue",
      writes: "orders and basket updates",
      hot: "the product catalogue, which is identical for every shopper",
      records: "products, orders and customers",
    },
    load: {
      peakRps: 2_500,
      readFraction: 0.9,
      cacheableFraction: 0.85,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 700,
      writesReach: ["durable"],
      noBacklog: false,
    },
    chaos: {
      faults: [{ kind: "kill-instance", target: "app-server" }],
      label: "An app instance crashes",
    },
    palette: [
      "load-balancer",
      "app-server",
      "cache",
      "sql-primary",
      "sql-replica",
    ],
    starter: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 10, 2],
        ["db", "sql-primary", 8, 4, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    ),
    rootCause: {
      componentId: "db",
      explanation:
        "The {sql-primary} is being asked for 2,250 reads a second and tops out around 2,000. The app tier was never the problem. The catalogue is the same for everyone, so a {cache} takes almost all of those reads off the database.",
    },
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 10, 2],
        ["cache", "cache", 6, 3],
        ["db", "sql-primary", 8, 4, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>cache", "cache>db"],
    ),
    concepts: ["finding-the-bottleneck", "cache-aside"],
    hint: "Run the load test and look for the red block. It isn't the one with ten instances.",
  },
  {
    id: "slow-checkout",
    requires: ["upload-rush", "black-friday"],
    mode: "repair",
    title: "Slow Checkout",
    tagline: "Every order takes two seconds and nobody knows why.",
    brief:
      "Each order generates a PDF invoice. Somebody wired that into the request: the user clicks Pay, then waits while a PDF renders. p99 is through the roof and the app tier needs far more instances than it should. Find the culprit and take the slow work off the critical path.",
    scenario: {
      product: "the shop",
      reads: "customers viewing orders and products",
      writes: "orders",
      hot: "product pages",
      records: "orders and payments",
      files: "the invoice PDFs",
      job: "rendering a PDF invoice for each order",
    },
    load: {
      peakRps: 400,
      readFraction: 0.7,
      cacheableFraction: 0.4,
      heavyWriteFraction: 1,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 750,
      writesReach: ["sql-primary", "object-store"],
      noBacklog: true,
    },
    chaos: {
      faults: [{ kind: "kill-instance", target: "app-server" }],
      label: "An app instance crashes",
    },
    palette: [
      "load-balancer",
      "app-server",
      "queue",
      "worker",
      "sql-primary",
      "object-store",
    ],
    starter: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 6, 2],
        ["db", "sql-primary", 7, 5, 2, 2],
        ["blobs", "object-store", 7, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>blobs"],
    ),
    rootCause: {
      componentId: "app",
      explanation:
        "The {app-server} renders each invoice inline, so every order costs the user about 1.8 seconds and costs the tier twenty requests' worth of capacity. Hand the job to a {queue} and let {worker} instances render it in the background.",
    },
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 3, 2],
        ["db", "sql-primary", 7, 6, 2, 2],
        ["q", "queue", 6, 2],
        ["workers", "worker", 8, 2, 4, 2],
        ["blobs", "object-store", 10, 3],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>q", "q>workers", "workers>blobs"],
    ),
    concepts: ["async-processing", "critical-path"],
    hint: "Which block's p99 is measured in seconds, and is the user waiting for it?",
  },
  {
    id: "three-am-page",
    requires: ["zone-outage", "slow-checkout"],
    mode: "repair",
    title: "The 3am Page",
    tagline: "Zone A went down last month. So did the whole company.",
    brief:
      "The app tier was spread across three zones after the last outage, so leadership assumed the job was done. It wasn't. Find the single point of failure that's still there before zone A goes dark again.",
    scenario: {
      product: "the booking app",
      reads: "users checking their bookings",
      writes: "new bookings and cancellations",
      hot: "availability calendars",
      records: "bookings and user accounts",
    },
    load: {
      peakRps: 1_200,
      readFraction: 0.85,
      cacheableFraction: 0.6,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.9995,
      budgetUsd: 600,
      writesReach: ["durable"],
      noBacklog: false,
    },
    chaos: { faults: [{ kind: "zone-outage" }], label: "Zone A loses power" },
    palette: [
      "load-balancer",
      "app-server",
      "cache",
      "sql-primary",
      "sql-replica",
    ],
    starter: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 6, 3],
        ["db", "sql-primary", 7, 4, 1, 1],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    ),
    rootCause: {
      componentId: "db",
      explanation:
        "One {sql-primary} instance in one zone. Lose that zone and every request fails, however many app servers survive. A standby in a second zone turns a total outage into a failover.",
    },
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 6, 3],
        ["db", "sql-primary", 7, 4, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    ),
    concepts: ["single-point-of-failure", "standby", "availability-math"],
    hint: "Availability multiplies along the path. Which block on it has only one failure domain?",
  },
  {
    id: "analytics-ate-prod",
    requires: ["feed-the-analysts", "three-am-page"],
    mode: "repair",
    title: "Analytics Ate Prod",
    tagline: "Finance wanted live numbers. Now checkout takes four seconds.",
    brief:
      "Someone wired the {app-server} straight into the {data-warehouse} so dashboards would be real-time. Every request now waits on a system built for ten-minute queries. Keep the dashboards fed without making customers wait.",
    scenario: {
      product: "the subscription app",
      reads: "customers using the app",
      writes: "sign-ups, upgrades and cancellations",
      hot: "plan and pricing pages",
      records: "customer accounts and subscriptions",
      events: "an event for every sign-up, upgrade and cancellation",
    },
    load: {
      peakRps: 700,
      readFraction: 0.7,
      cacheableFraction: 0.4,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 800,
      writesReach: ["sql-primary", "data-warehouse"],
      noBacklog: true,
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 1.5 }],
      label: "Month-end rush (1.5x traffic)",
    },
    palette: [
      "load-balancer",
      "app-server",
      "sql-primary",
      "queue",
      "event-stream",
      "data-warehouse",
    ],
    starter: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 4, 2],
        ["db", "sql-primary", 7, 6, 2, 2],
        ["dw", "data-warehouse", 7, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>dw"],
    ),
    rootCause: {
      componentId: "dw",
      explanation:
        "The {data-warehouse} sits on the synchronous path, so every request waits for it, and it can only answer about 50 small queries a second. Publish events to an {event-stream} and let the warehouse load them on its own schedule.",
    },
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 4, 2],
        ["db", "sql-primary", 7, 6, 2, 2],
        ["stream", "event-stream", 6, 2],
        ["dw", "data-warehouse", 9, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>stream", "stream>dw"],
    ),
    concepts: ["oltp-vs-olap", "critical-path", "fan-out"],
    hint: "Find the block whose p99 is measured in seconds. Does the user need its answer?",
  },
  {
    id: "half-the-orders",
    requires: ["analytics-ate-prod"],
    mode: "repair",
    title: "Half the Orders",
    tagline: "Search shows half the orders. Finance sees the other half.",
    brief:
      "Order events go onto a {queue} that feeds both the {search-index} and the {data-warehouse}. Each team swears it's the other team's bug. Neither is lying.",
    scenario: {
      product: "the shop",
      reads: "customers browsing and searching",
      writes: "orders",
      hot: "product pages",
      records: "orders, customers and stock levels",
      events: "an order-placed event for every order",
    },
    load: {
      peakRps: 800,
      readFraction: 0.6,
      cacheableFraction: 0.4,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 800,
      writesReach: ["sql-primary", "search-index", "data-warehouse"],
      noBacklog: true,
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 1.5 }],
      label: "Flash sale (1.5x traffic)",
    },
    palette: [
      "load-balancer",
      "app-server",
      "sql-primary",
      "queue",
      "event-stream",
      "search-index",
      "data-warehouse",
    ],
    starter: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 4, 2],
        ["db", "sql-primary", 6, 6, 2, 2],
        ["q", "queue", 6, 2],
        ["search", "search-index", 9, 1],
        ["dw", "data-warehouse", 9, 3],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>q", "q>search", "q>dw"],
    ),
    rootCause: {
      componentId: "q",
      explanation:
        "A {queue} delivers each message to exactly one consumer, so the two systems were splitting the orders between them. Fan-out needs an {event-stream}, where every consumer reads every event at its own pace.",
    },
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 4, 2],
        ["db", "sql-primary", 6, 6, 2, 2],
        ["stream", "event-stream", 6, 2],
        ["search", "search-index", 9, 1],
        ["dw", "data-warehouse", 9, 3],
      ],
      [
        `${C}>lb`,
        "lb>app",
        "app>db",
        "app>stream",
        "stream>search",
        "stream>dw",
      ],
    ),
    concepts: ["queue-vs-log", "competing-consumers", "fan-out"],
    hint: "Compare how many writes per second reach each consumer with how many orders come in.",
  },
]

export const LEVELS: Level[] = [...BUILD, ...LATER_BUILD, ...REPAIR]

export const levelById = (id: string) => LEVELS.find((l) => l.id === id)

/** Free play: every component, no targets that matter. */
export const SANDBOX_LOAD: LoadProfile = {
  peakRps: 1_000,
  readFraction: 0.8,
  cacheableFraction: 0.6,
  heavyWriteFraction: 0,
}
