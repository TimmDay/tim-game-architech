import type { Targets } from "~/sim/grade"
import type {
  ComponentKind,
  Fault,
  Graph,
  LoadProfile,
  PlacedComponent,
} from "~/sim/types"
import { withPractices } from "~/sim/practices"
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
  /**
   * Build levels with their own shelf: classic interview questions, and the
   * CAP trade-offs (network splits, consistency and sharding).
   */
  track?: "classic" | "cap" | "ops"
}

type Row = [
  id: string,
  kind: ComponentKind,
  x: number,
  y: number,
  instances?: number,
  zones?: number,
  data?: Pick<
    PlacedComponent,
    "shards" | "partitionKey" | "consistency" | "practices"
  >,
]

/** Terse graph literal: components as rows, edges as `from>to` strings. */
export function graph(rows: Row[], edges: string[]): Graph {
  const components: PlacedComponent[] = rows.map(
    ([id, kind, x, y, instances = 1, zones = 1, data]) => ({
      id,
      kind,
      x,
      y,
      instances,
      zones,
      ...data,
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
      "A helpdesk startup just signed its first real customers. At peak you'll see 1,500 requests a second, mostly agents reading tickets. Put a {load-balancer} in front of a pool of {app-server} instances and give them a {sql-primary} to keep tickets in. Then make sure losing one server doesn't take everyone down.",
    scenario: {
      product: "the helpdesk",
      reads: "agents opening tickets",
      writes: "ticket replies and status changes",
      hot: "the open-ticket queue and customer profiles",
      records: "tickets, replies and customer accounts",
    },
    load: {
      peakRps: 1_500,
      readFraction: 0.8,
      cacheableFraction: 0.5,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 1_200,
      writesReach: ["durable"],
      noBacklog: false,
      stakes: {
        signedIn: true,
        personalData: true,
        money: false,
        abuse: false,
      },
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
      "A news site's logged-in feed is personalised, so the page itself can't sit at the edge, but the articles behind it are the same for everyone. Peak is 15,000 requests a second and 95% of them are reads. The {sql-primary} tops out around 10,000 reads a second. Keep p99 under 250ms on a budget that won't stretch to a fleet of replicas.",
    scenario: {
      product: "the news site",
      reads: "readers loading their feed and articles",
      writes: "comments, likes and newly published articles",
      hot: "the trending articles that everyone is reading right now",
      records: "articles, comments and reader accounts",
    },
    load: {
      peakRps: 15_000,
      readFraction: 0.95,
      cacheableFraction: 0.9,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 250,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 3_300,
      writesReach: ["durable"],
      noBacklog: false,
      stakes: {
        signedIn: true,
        personalData: true,
        money: false,
        abuse: false,
      },
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
        ["app", "app-server", 4, 4, 27, 2],
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
      "An image of a cat in a tiny hat has escaped containment. 10,000 requests a second want the same few images, and almost none of them write anything. The {object-store} that holds them answers about 5,500 reads a second for files that share a key prefix, as these do, and putting {app-server} instances in front doesn't change that. You have $9,000 a month. This level is about the image traffic: the site's own pages are static files too, and they're served the same way.",
    scenario: {
      product: "the meme site",
      reads: "people loading the same few images",
      writes: "new image uploads",
      hot: "the viral images themselves",
      records: "image files",
      files: "every uploaded image",
    },
    load: {
      peakRps: 10_000,
      readFraction: 0.995,
      cacheableFraction: 0.95,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 200,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 9_000,
      writesReach: ["object-store"],
      noBacklog: false,
      stakes: {
        signedIn: false,
        personalData: false,
        money: false,
        abuse: false,
      },
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
      "A photo app: 200 requests a second, half of them uploads. Every upload must be resized into four sizes, which takes about half a second of CPU. Users won't wait that long every time they tap upload, and the resizing has to keep up with the uploads, or the backlog grows forever. The other half of the traffic is people browsing albums, which reads the photo details from the database. This level is about the uploads, so it leaves out how the photo files reach their screens.",
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
      peakRps: 200,
      readFraction: 0.5,
      cacheableFraction: 0.3,
      heavyWriteFraction: 1,
      job: { seconds: 0.5, cpuBound: true },
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.99,
      budgetUsd: 3_300,
      writesReach: ["object-store", "sql-primary"],
      noBacklog: true,
      stakes: {
        signedIn: true,
        personalData: true,
        money: false,
        abuse: false,
      },
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
        ["app", "app-server", 4, 4, 2, 2],
        ["db", "sql-primary", 6, 6],
        ["q", "queue", 6, 2],
        ["workers", "worker", 8, 2, 16, 2],
        ["blobs", "object-store", 10, 3],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>q", "q>workers", "workers>blobs"],
    ),
    concepts: ["async-processing", "competing-consumers", "backpressure"],
    hint: "The {app-server} should accept the upload and drop a message on a {queue}. A pool of {worker} instances does the slow part, and needs enough of them to drain it.",
  },
  {
    id: "step-counter",
    requires: ["front-page"],
    mode: "build",
    title: "Step Counter",
    tagline: "A million wristbands, all syncing at once.",
    brief:
      "A fitness app's wristbands sync step counts and heart rate every few minutes. Peak is 5,000 requests a second and seven in ten are syncs: writes, each one a small record for one user and one day. People open the app to see today and this week, always their own data, and nobody ever joins one user's records with another's. One {sql-primary} manages about 3,000 writes a second. The chaos round is the first Monday of January, when everyone's new resolution means 1.5 times the traffic.",
    scenario: {
      product: "the fitness app",
      reads: "people checking today's steps and this week's heart rate",
      writes: "wristband syncs",
      hot: "today's totals for people looking right now",
      records: "step counts and heart-rate samples, by user and day",
    },
    load: {
      peakRps: 5_000,
      readFraction: 0.3,
      cacheableFraction: 0,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 7_000,
      writesReach: ["durable"],
      noBacklog: true,
      stakes: {
        signedIn: true,
        personalData: true,
        money: false,
        abuse: false,
      },
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 1.5 }],
      label: "New year, new resolutions (1.5x traffic)",
    },
    palette: [
      "dns",
      "load-balancer",
      "app-server",
      "cache",
      "sql-primary",
      "sql-replica",
      "nosql",
      "queue",
      "worker",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 9, 2],
        ["steps", "nosql", 7, 4, 6],
      ],
      [`${C}>lb`, "lb>app", "app>steps"],
    ),
    concepts: ["key-value-modelling", "partitioning", "horizontal-scaling"],
    hint: "Count the writes against what one {sql-primary} can take, then look at how the data is read: always one user, one day, never joined. What kind of store is built for that?",
  },
  {
    id: "zone-outage",
    requires: ["upload-rush"],
    mode: "build",
    title: "Zone Outage",
    tagline:
      "A data centre is about to lose power. You just don't know which one.",
    brief:
      "A payments dashboard promises 99.95% availability. 7,500 requests a second, mostly reads. This time, during the load test, a whole availability zone goes dark. Everything you put in only one zone goes dark with it.",
    scenario: {
      product: "the payments dashboard",
      reads: "merchants checking balances and recent payments",
      writes: "refunds and settings changes",
      hot: "today's totals and recent payment lists",
      records: "payments, refunds and merchant accounts",
    },
    load: {
      peakRps: 7_500,
      readFraction: 0.9,
      cacheableFraction: 0.7,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 250,
      maxErrorRate: 0.001,
      availability: 0.9995,
      budgetUsd: 2_600,
      writesReach: ["durable"],
      noBacklog: false,
      stakes: { signedIn: true, personalData: true, money: true, abuse: false },
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
        ["app", "app-server", 4, 4, 16, 2],
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
      "An online shop takes 4,000 requests a second. Every order has to land in the {sql-primary}, become searchable in the {search-index}, and reach the {data-warehouse} for the finance team. The warehouse is built for big queries, not for sitting on the checkout path.",
    scenario: {
      product: "the shop",
      reads: "customers browsing and searching",
      writes: "orders",
      hot: "product pages",
      records: "orders, customers and stock levels",
      events: "an order-placed event for every order",
    },
    load: {
      peakRps: 4_000,
      readFraction: 0.6,
      cacheableFraction: 0.4,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 2_900,
      writesReach: ["sql-primary", "search-index", "data-warehouse"],
      noBacklog: true,
      stakes: { signedIn: true, personalData: true, money: true, abuse: false },
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
        ["app", "app-server", 4, 4, 7, 2],
        ["db", "sql-primary", 6, 6, 2, 2],
        ["stream", "event-stream", 6, 2, 3],
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
      "Freelancers log expenses for their tax return. They can type a receipt into a form, or photograph it and let OCR fill in merchant, date, amount and tax. Usage piles up before the filing deadline: the UK tax authority has had more than 600,000 returns filed on deadline day alone. Peak is 200 requests a second; a quarter are new receipts, and 60% of those are photos. The {doc-ai} takes seconds per receipt, caps how many calls you make each second, and charges about a cent a page.",
    load: {
      peakRps: 200,
      readFraction: 0.75,
      cacheableFraction: 0.2,
      heavyWriteFraction: 0.6,
      job: { seconds: 3, cpuBound: false },
      averageOfPeak: 0.05,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 45_000,
      writesReach: ["sql-primary", "object-store"],
      noBacklog: true,
      stakes: { signedIn: true, personalData: true, money: false, abuse: true },
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
        ["app", "app-server", 4, 4, 2, 2],
        ["db", "sql-primary", 7, 6, 2, 2],
        ["blobs", "object-store", 5, 7],
        ["q", "queue", 6, 2],
        ["workers", "worker", 8, 2, 2, 2],
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
      "Drivers open the map to find a free charger nearby. They can mark a charger as in use while they charge, and leave notes for others ('bay 3 is blocked', 'card reader broken'). The US alone has over 250,000 public charging ports, and holiday road trips are the peak: Tesla reported more than two million Supercharger sessions over Thanksgiving 2025. Peak is 10,000 requests a second, nearly all map views; availability changes every few minutes.",
    load: {
      peakRps: 10_000,
      readFraction: 0.95,
      cacheableFraction: 0.6,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 400,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 13_000,
      writesReach: ["nosql", "search-index"],
      noBacklog: true,
      stakes: {
        signedIn: true,
        personalData: true,
        money: false,
        abuse: false,
      },
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
        ["app", "app-server", 5, 4, 11, 2],
        ["cache", "cache", 7, 4, 2, 2],
        ["kv", "nosql", 9, 5, 2],
        ["geo", "search-index", 7, 1, 5],
        ["stream", "event-stream", 6, 6, 2],
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
      budgetUsd: 1_550,
      writesReach: ["durable"],
      noBacklog: false,
      stakes: {
        signedIn: true,
        personalData: true,
        money: false,
        abuse: false,
      },
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
      "The shop scaled the app tier to twenty instances last night and it's still falling over: 12,500 requests a second, nearly all of them browsing the same catalogue. Find the real bottleneck. Adding more of the wrong thing just burns money.",
    scenario: {
      product: "the shop",
      reads: "shoppers browsing the catalogue",
      writes: "orders and basket updates",
      hot: "the product catalogue, which is identical for every shopper",
      records: "products, orders and customers",
    },
    load: {
      peakRps: 12_500,
      readFraction: 0.9,
      cacheableFraction: 0.85,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 2_700,
      writesReach: ["durable"],
      noBacklog: false,
      stakes: { signedIn: true, personalData: true, money: true, abuse: true },
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
        ["app", "app-server", 4, 4, 20, 2],
        ["db", "sql-primary", 8, 4, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    ),
    rootCause: {
      componentId: "db",
      explanation:
        "The {sql-primary} is being asked for 11,250 reads a second and tops out around 10,000. The app tier was never the problem. The catalogue is the same for everyone, so a {cache} takes almost all of those reads off the database.",
    },
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 20, 2],
        ["cache", "cache", 6, 3],
        ["db", "sql-primary", 8, 4, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>cache", "cache>db"],
    ),
    concepts: ["finding-the-bottleneck", "cache-aside"],
    hint: "Run the load test and look for the red block. It isn't the one with twenty instances.",
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
      readFraction: 0.98,
      cacheableFraction: 0.4,
      heavyWriteFraction: 1,
      // Rendering an invoice in a headless browser: about 1.5 seconds of CPU.
      job: { seconds: 1.5, cpuBound: true },
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 1_750,
      writesReach: ["sql-primary", "object-store"],
      noBacklog: true,
      stakes: { signedIn: true, personalData: true, money: true, abuse: false },
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
        ["app", "app-server", 4, 4, 10, 2],
        ["db", "sql-primary", 7, 5, 2, 2],
        ["blobs", "object-store", 7, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>blobs"],
    ),
    rootCause: {
      componentId: "app",
      explanation:
        "The {app-server} renders each invoice inline, so every order costs the user about 1.5 seconds and costs the tier 750 requests' worth of capacity. Hand the job to a {queue} and let {worker} instances render it in the background.",
    },
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 2, 2],
        ["db", "sql-primary", 7, 6, 2, 2],
        ["q", "queue", 6, 2],
        ["workers", "worker", 8, 2, 5, 2],
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
      budgetUsd: 1_150,
      writesReach: ["durable"],
      noBacklog: false,
      stakes: { signedIn: true, personalData: true, money: true, abuse: false },
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
        ["app", "app-server", 4, 4, 3, 3],
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
        ["app", "app-server", 4, 4, 3, 3],
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
      budgetUsd: 2_200,
      writesReach: ["sql-primary", "data-warehouse"],
      noBacklog: true,
      stakes: { signedIn: true, personalData: true, money: true, abuse: false },
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
        ["app", "app-server", 4, 4, 2, 2],
        ["db", "sql-primary", 7, 6, 2, 2],
        ["dw", "data-warehouse", 7, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>dw"],
    ),
    rootCause: {
      componentId: "dw",
      explanation:
        "The {data-warehouse} sits on the synchronous path, so every request waits for it, and it can only answer about 20 small queries a second. Publish events to an {event-stream} and let the warehouse load them on its own schedule.",
    },
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 2, 2],
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
      peakRps: 4_000,
      readFraction: 0.6,
      cacheableFraction: 0.4,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 2_900,
      writesReach: ["sql-primary", "search-index", "data-warehouse"],
      noBacklog: true,
      stakes: { signedIn: true, personalData: true, money: true, abuse: false },
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
        ["app", "app-server", 4, 4, 7, 2],
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
        ["app", "app-server", 4, 4, 7, 2],
        ["db", "sql-primary", 6, 6, 2, 2],
        ["stream", "event-stream", 6, 2, 3],
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

/**
 * The questions interviewers ask most, as build levels. Each one's graded
 * trap is the mistake that question is designed to catch.
 */
const CLASSICS: Level[] = [
  {
    id: "short-links",
    mode: "build",
    track: "classic",
    requires: ["front-page"],
    title: "Short Links",
    tagline: "A billion links, and every one of them must redirect instantly.",
    scenario: {
      product: "the link shortener",
      reads: "people clicking short links",
      writes: "new short links being created",
      hot: "the most-clicked links and where they point",
      records: "every short code and the long URL it points to",
    },
    brief:
      "Paste a long URL, get a short one; anyone who clicks it is redirected. Bitly has reported more than 6 billion clicks a month on links created by its users. Clicks outnumber new links about fifty to one, and a few viral links take most of them. Peak is 20,000 requests a second. The links live in a {sql-primary}, which manages about 10,000 reads a second on its own.",
    load: {
      peakRps: 20_000,
      readFraction: 0.98,
      cacheableFraction: 0.9,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 3_800,
      writesReach: ["sql-primary"],
      noBacklog: false,
      stakes: {
        signedIn: false,
        personalData: false,
        money: false,
        abuse: true,
      },
    },
    chaos: {
      faults: [{ kind: "kill-instance", target: "cache" }],
      label: "A cache node dies",
    },
    palette: [
      "dns",
      "load-balancer",
      "app-server",
      "cache",
      "sql-primary",
      "sql-replica",
    ],
    reference: graph(
      [
        ["dns", "dns", 1, 4],
        ["lb", "load-balancer", 3, 4],
        ["app", "app-server", 5, 4, 32, 2],
        ["cache", "cache", 7, 3, 2, 2],
        ["db", "sql-primary", 9, 5, 2, 2],
      ],
      [`${C}>dns`, "dns>lb", "lb>app", "app>cache", "cache>db"],
    ),
    concepts: ["cache-aside", "cache-stampede", "id-generation"],
    hint: "A {cache} takes most clicks off the {sql-primary}. Then ask what happens to the database the moment that cache disappears.",
  },
  {
    id: "group-chat",
    mode: "build",
    track: "classic",
    requires: ["zone-outage"],
    title: "Group Chat",
    tagline: "Half of all traffic is writes, and every one must arrive.",
    scenario: {
      product: "the chat app",
      reads: "people opening a chat and syncing its history",
      writes: "messages being sent",
      hot: "the latest messages in active chats",
      records: "every message, by conversation and time",
      events: "a message-sent event for every message",
      job: "pushing each message to recipients who are offline",
    },
    brief:
      "A messaging app. WhatsApp has said it delivers around 100 billion messages a day. Here, peak is 10,000 requests a second and half of them are messages being sent: 5,000 writes a second, every one of which must be stored and then delivered. Recipients who aren't online get a push notification. A {sql-primary} takes about 3,000 writes a second, and adding instances doesn't add write capacity.",
    load: {
      peakRps: 10_000,
      readFraction: 0.5,
      cacheableFraction: 0.1,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 10_500,
      writesReach: ["nosql", "event-stream"],
      noBacklog: true,
      stakes: { signedIn: true, personalData: true, money: false, abuse: true },
    },
    chaos: {
      faults: [{ kind: "zone-outage" }],
      label: "A zone goes dark",
    },
    palette: [
      "dns",
      "load-balancer",
      "app-server",
      "cache",
      "sql-primary",
      "nosql",
      "queue",
      "event-stream",
      "worker",
      "serverless",
    ],
    reference: graph(
      [
        ["dns", "dns", 1, 4],
        ["lb", "load-balancer", 3, 4],
        ["app", "app-server", 5, 4, 18, 3],
        ["kv", "nosql", 8, 5, 7],
        ["stream", "event-stream", 7, 2, 7],
        ["push", "serverless", 10, 2, 1],
      ],
      [`${C}>dns`, "dns>lb", "lb>app", "app>kv", "app>stream", "stream>push"],
    ),
    concepts: ["partitioning", "delivery-guarantees", "availability-zones"],
    hint: "Count the writes before choosing the store. Something that scales writes out by adding partitions beats one primary that can't.",
  },
  {
    id: "home-timeline",
    mode: "build",
    track: "classic",
    requires: ["upload-rush", "front-page"],
    title: "Home Timeline",
    tagline:
      "Every post must land in the timeline of everyone who follows you.",
    scenario: {
      product: "the social app",
      reads: "people scrolling their home timeline",
      writes: "new posts",
      hot: "precomputed home timelines: each user's latest posts from people they follow",
      records: "posts, follows and stored timelines",
      events: "a post-created event for every new post",
      job: "copying each new post into every follower's timeline",
    },
    brief:
      "A social app's home timeline: the latest posts from everyone you follow. Twitter's engineers described 300,000 timeline reads a second against about 6,000 writes. Here, peak is 25,000 requests a second and 97% are timeline loads. Building a timeline at read time means querying everyone a user follows, every time they scroll. The alternative is to copy each post into followers' timelines when it's written, which is slow work per post.",
    load: {
      peakRps: 25_000,
      readFraction: 0.97,
      cacheableFraction: 0.9,
      heavyWriteFraction: 1,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 10_000,
      writesReach: ["nosql"],
      noBacklog: true,
      stakes: { signedIn: true, personalData: true, money: false, abuse: true },
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 1.5 }],
      label: "Cup final goal (1.5x traffic)",
    },
    palette: [
      "dns",
      "load-balancer",
      "app-server",
      "cache",
      "sql-primary",
      "nosql",
      "queue",
      "event-stream",
      "worker",
    ],
    reference: graph(
      [
        ["dns", "dns", 1, 4],
        ["lb", "load-balancer", 3, 4],
        ["app", "app-server", 5, 4, 40, 2],
        ["cache", "cache", 7, 5, 2, 2],
        ["kv", "nosql", 9, 6, 3],
        ["stream", "event-stream", 7, 2, 2],
        ["fanout", "worker", 9, 2, 25, 2],
      ],
      [
        `${C}>dns`,
        "dns>lb",
        "lb>app",
        "app>cache",
        "cache>kv",
        "app>stream",
        "stream>fanout",
        "fanout>kv",
      ],
    ),
    concepts: ["fan-out-on-write", "hot-keys", "async-processing"],
    hint: "Do the work once per post rather than once per scroll. Posts go onto an {event-stream}; {worker} instances write them into followers' timelines, and timeline loads come from the {cache}.",
  },
  {
    id: "ticket-drop",
    mode: "build",
    track: "classic",
    requires: ["upload-rush", "front-page"],
    title: "The Ticket Drop",
    tagline: "Two million fans, forty thousand seats, one minute past ten.",
    scenario: {
      product: "the ticketing site",
      reads: "fans refreshing the event page and seat map",
      writes: "seat holds and purchases",
      hot: "the event page and the seat map",
      records: "seats, holds and orders",
      job: "admitting the next fan from the waiting room to hold a seat",
    },
    brief:
      "Tickets for a stadium tour go on sale at 10:00. For the 2022 Eras Tour presale, Ticketmaster reported 3.5 billion system requests, four times its previous peak. Here, peak is 20,000 requests a second, and the on-sale minute triples it. Nine in ten are fans refreshing the seat map; the rest try to hold seats. No seat may be sold twice, so holds go to one {sql-primary}, which manages about 3,000 writes a second. Nobody should see an error: making fans wait in line is fine.",
    load: {
      peakRps: 20_000,
      readFraction: 0.9,
      cacheableFraction: 0.8,
      heavyWriteFraction: 0,
      // A hold waits on row locks in the database: little CPU, a lot of waiting.
      job: { seconds: 0.2, cpuBound: false },
      // Quiet between on-sales.
      averageOfPeak: 0.05,
    },
    targets: {
      p99Ms: 400,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 7_500,
      writesReach: ["sql-primary"],
      noBacklog: false,
      stakes: { signedIn: true, personalData: true, money: true, abuse: true },
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 3 }],
      label: "The on-sale minute (3x traffic)",
    },
    palette: [
      "dns",
      "cdn",
      "load-balancer",
      "app-server",
      "cache",
      "sql-primary",
      "sql-replica",
      "queue",
      "worker",
    ],
    reference: graph(
      [
        ["dns", "dns", 1, 4],
        ["cdn", "cdn", 2, 3],
        ["lb", "load-balancer", 3, 2],
        ["app", "app-server", 5, 4, 24, 2],
        ["replica", "sql-replica", 7, 6, 2],
        ["line", "queue", 6, 2],
        ["admit", "worker", 8, 2, 6, 2],
        ["db", "sql-primary", 10, 4, 2, 2],
      ],
      [
        `${C}>dns`,
        "dns>cdn",
        "cdn>lb",
        "lb>app",
        "app>replica",
        "app>line",
        "line>admit",
        "admit>db",
      ],
    ),
    concepts: ["waiting-room", "inventory-contention", "read-replicas"],
    hint: "Seat maps can be a second stale; seat holds can't be wrong. Serve the first from the edge and replicas, and put the second in a line that the {sql-primary} drains at its own pace.",
  },
  {
    id: "video-night",
    mode: "build",
    track: "classic",
    requires: ["going-viral", "upload-rush"],
    title: "Video Night",
    tagline: "Hours of video uploaded every minute, and a premiere at eight.",
    scenario: {
      product: "the video site",
      reads: "viewers streaming video segments",
      writes: "creators uploading videos",
      hot: "the segments of popular videos",
      records: "videos, their renditions and their metadata",
      files: "uploaded videos and their transcoded renditions",
      job: "transcoding each upload into every resolution and bitrate",
    },
    brief:
      "A video site. YouTube has said more than 500 hours of video are uploaded to it every minute. Viewers stream videos in short segments, so peak is 20,000 requests a second, nearly all of them for the same popular videos. Uploads are rare by comparison, about one every two seconds, but every upload must be transcoded into several resolutions before anyone can watch it, which takes minutes of compute.",
    load: {
      peakRps: 20_000,
      readFraction: 0.999975,
      cacheableFraction: 0.95,
      heavyWriteFraction: 1,
      // Transcoding one upload into five renditions: two minutes of CPU.
      job: { seconds: 120, cpuBound: true },
    },
    targets: {
      p99Ms: 500,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 23_500,
      writesReach: ["object-store"],
      noBacklog: true,
      stakes: {
        signedIn: true,
        personalData: false,
        money: false,
        abuse: false,
      },
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 2 }],
      label: "Season finale premiere (2x traffic)",
    },
    palette: [
      "dns",
      "cdn",
      "load-balancer",
      "app-server",
      "cache",
      "object-store",
      "sql-primary",
      "queue",
      "worker",
    ],
    reference: graph(
      [
        ["dns", "dns", 1, 4],
        ["cdn", "cdn", 2, 3],
        ["lb", "load-balancer", 3, 2],
        ["app", "app-server", 5, 4, 6, 2],
        ["videos", "object-store", 8, 6],
        ["jobs", "queue", 6, 2],
        ["transcode", "worker", 8, 2, 40, 2],
      ],
      [
        `${C}>dns`,
        "dns>cdn",
        "cdn>lb",
        "lb>app",
        "app>videos",
        "app>jobs",
        "jobs>transcode",
        "transcode>videos",
      ],
    ),
    concepts: ["adaptive-bitrate", "cdn", "async-processing"],
    hint: "Two very different paths: watching is a {cdn} job, and uploading is a {queue} and {worker} job. Neither should touch the other's capacity.",
  },
  {
    id: "ride-hailing",
    mode: "build",
    track: "classic",
    requires: ["plug-finder", "group-chat"],
    title: "Where's My Driver?",
    tagline: "Every driver's phone reports its location every few seconds.",
    scenario: {
      product: "the ride-hailing app",
      reads: "riders looking for nearby cars and watching theirs arrive",
      writes: "driver location pings",
      hot: "every online driver's latest location, bucketed by area",
      records: "trips, payments and location history",
      events: "a location-ping event for every update",
      memoryOnly:
        "every driver reports again within seconds, so a lost location is replaced almost at once.",
    },
    brief:
      "Riders request a car; the app finds the nearest drivers and shows the car approaching. Uber's own developer docs describe driver location updates sent every 4 seconds. Here, peak is 25,000 requests a second, and 85% are location pings. Only the latest position matters for matching; the history is kept for pricing and ETA models. If a zone goes down mid rush hour, riders must still find cars.",
    load: {
      peakRps: 25_000,
      readFraction: 0.15,
      cacheableFraction: 1,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 6_200,
      writesReach: ["cache", "data-warehouse"],
      noBacklog: true,
      stakes: { signedIn: true, personalData: true, money: true, abuse: false },
    },
    chaos: {
      faults: [{ kind: "zone-outage" }],
      label: "A zone goes dark at rush hour",
    },
    palette: [
      "dns",
      "load-balancer",
      "app-server",
      "cache",
      "sql-primary",
      "nosql",
      "search-index",
      "event-stream",
      "worker",
      "data-warehouse",
    ],
    reference: graph(
      [
        ["dns", "dns", 1, 4],
        ["lb", "load-balancer", 3, 4],
        ["app", "app-server", 5, 4, 45, 3],
        ["live", "cache", 8, 5, 2, 2],
        ["stream", "event-stream", 7, 2, 40],
        ["dw", "data-warehouse", 10, 2],
      ],
      [`${C}>dns`, "dns>lb", "lb>app", "app>live", "app>stream", "stream>dw"],
    ),
    concepts: ["ephemeral-state", "geospatial-indexing", "oltp-vs-olap"],
    hint: "A location that's four seconds old is already out of date. Does it need a durable database at all, or just fast memory, plus a stream for the history?",
  },
  {
    id: "typeahead",
    mode: "build",
    track: "classic",
    requires: ["going-viral", "feed-the-analysts"],
    title: "Type Ahead",
    tagline: "Suggestions must appear before the next keystroke.",
    scenario: {
      product: "search autocomplete",
      reads: "people typing a search, one request per keystroke",
      writes: "completed searches, logged to improve suggestions",
      hot: "the top suggestions for every popular prefix",
      records: "the search log",
      events: "a searched event for every completed search",
      memoryOnly:
        "the suggestions are rebuilt from the search log every day, so a lost node is simply reloaded.",
    },
    brief:
      "As someone types, show the ten most likely searches for what they've typed so far. Google says autocomplete cuts typing by about 25%. Every keystroke is a request, so peak is 10,000 a second, and suggestions are useless if they arrive after the next keystroke: p99 must stay under 200ms. Completed searches are logged so tomorrow's suggestions reflect today's trends.",
    load: {
      peakRps: 10_000,
      readFraction: 0.95,
      cacheableFraction: 1,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 200,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 3_500,
      writesReach: ["data-warehouse"],
      noBacklog: true,
      stakes: {
        signedIn: false,
        personalData: false,
        money: false,
        abuse: false,
      },
    },
    chaos: {
      faults: [{ kind: "traffic-spike", multiplier: 2 }],
      label: "Breaking news (2x traffic)",
    },
    palette: [
      "dns",
      "cdn",
      "load-balancer",
      "app-server",
      "cache",
      "nosql",
      "search-index",
      "event-stream",
      "worker",
      "data-warehouse",
    ],
    reference: graph(
      [
        ["dns", "dns", 1, 4],
        ["lb", "load-balancer", 3, 2],
        ["app", "app-server", 5, 4, 25, 2],
        ["topk", "cache", 7, 5, 2, 2],
        ["stream", "event-stream", 7, 2, 2],
        ["dw", "data-warehouse", 10, 2],
      ],
      [`${C}>dns`, "dns>lb", "lb>app", "app>topk", "app>stream", "stream>dw"],
    ),
    concepts: ["precomputation", "latency-budget", "cdn"],
    hint: "There's no time to search on every keystroke. Work out the top suggestions for each prefix ahead of time, and keep them in memory, so each keystroke is a lookup.",
  },
]

const SPLIT: Fault[] = [{ kind: "network-split" }]
const SPLIT_LABEL = "A network split cuts one zone off"

/**
 * The CAP shelf. Each level turns on the sidebar's consistency choice, its
 * partition keys, or both, and none of them changes how any other level runs.
 */
const CAP: Level[] = [
  {
    id: "balance-sheet",
    mode: "build",
    track: "cap",
    requires: ["zone-outage"],
    title: "Balance Sheet",
    tagline: "A refused transfer beats a wrong balance.",
    scenario: {
      product: "the payments app",
      reads: "people checking balances and statements",
      writes: "transfers between accounts",
      hot: "account balances",
      records: "accounts, balances and the ledger of every transfer",
    },
    brief:
      "A payments app moves money between friends. Peak is 600 requests a second, and four in ten are transfers. Every copy of the ledger must agree: if two copies both accept a withdrawal during a network split, someone spends the same money twice. The chaos round cuts one zone off from the others. Nothing crashes, but the copies can't talk. Refusing transfers on the cut-off side is fine. Accepting a transfer the rest of the system can't see is not.",
    load: {
      peakRps: 600,
      readFraction: 0.6,
      cacheableFraction: 0,
      heavyWriteFraction: 0,
      tunableConsistency: true,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 1_550,
      writesReach: ["durable"],
      noBacklog: false,
      stakes: { signedIn: true, personalData: true, money: true, abuse: true },
      onSplit: "consistent",
    },
    chaos: { faults: SPLIT, label: SPLIT_LABEL },
    palette: ["dns", "load-balancer", "app-server", "sql-primary", "nosql"],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 3, 2],
        ["db", "sql-primary", 7, 4, 3, 3, { consistency: "strong" }],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    ),
    concepts: ["cap-theorem", "quorum", "pacelc"],
    hint: "Set the {sql-primary} to refuse during a split, then count its copies: a side can keep writing only if it holds a majority of them. Is there a majority on either side of two?",
  },
  {
    id: "full-basket",
    mode: "build",
    track: "cap",
    requires: ["balance-sheet"],
    title: "Full Basket",
    tagline: "Never refuse an add-to-basket.",
    scenario: {
      product: "the online shop",
      reads: "shoppers viewing their basket",
      writes: "items added to and removed from baskets",
      hot: "each shopper's basket",
      records: "every shopper's basket",
    },
    brief:
      "An online shop's basket takes 15,000 requests a second at peak, three in ten of them adds and removals. Each refused add is a sale lost, so the business's rule is that the basket always works. If two copies disagree for a while, the shop can merge them later: showing an item someone removed is annoying, refusing their purchase is worse. A {sql-primary} manages about 3,000 writes a second. The chaos round cuts one zone off from the others.",
    load: {
      peakRps: 15_000,
      readFraction: 0.7,
      cacheableFraction: 0,
      heavyWriteFraction: 0,
      tunableConsistency: true,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 8_500,
      writesReach: ["durable"],
      noBacklog: false,
      stakes: {
        signedIn: true,
        personalData: true,
        money: false,
        abuse: false,
      },
      onSplit: "available",
    },
    chaos: { faults: SPLIT, label: SPLIT_LABEL },
    palette: ["dns", "load-balancer", "app-server", "sql-primary", "nosql"],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 28, 2],
        ["baskets", "nosql", 7, 4, 6, 1, { consistency: "eventual" }],
      ],
      [`${C}>lb`, "lb>app", "app>baskets"],
    ),
    concepts: ["cap-theorem", "conflict-resolution", "pacelc"],
    hint: "Here it's the opposite of a bank: during a split, every side should keep taking writes. Then think about how two versions of a basket become one.",
  },
  {
    id: "tenant-split",
    mode: "build",
    track: "cap",
    requires: ["balance-sheet"],
    title: "Tenant Split",
    tagline: "One database can't take the writes. How do you cut it?",
    scenario: {
      product: "the project-management tool",
      reads: "people opening projects and task lists",
      writes: "new tasks, comments and status changes",
      hot: "each company's active projects",
      records: "companies, projects, tasks and comments",
    },
    brief:
      "A project-management tool serves 5,000 companies. Peak is 15,000 requests a second and 6,000 of them are writes, double what one {sql-primary} takes. You'll split the data into shards, and the partition key decides which shard each record lives on. A good key spreads the writes evenly and lets the common reads go to a single shard. The biggest customer is about an eighth of all traffic. Pick the shard count and the key in the sidebar.",
    load: {
      peakRps: 15_000,
      readFraction: 0.6,
      cacheableFraction: 0,
      heavyWriteFraction: 0,
      partitionKeys: [
        {
          id: "created",
          label: "Created date",
          hotShare: 0.95,
          scatterReads: 0,
        },
        { id: "task", label: "Task ID", hotShare: 0, scatterReads: 0.85 },
        {
          id: "project",
          label: "Project ID",
          hotShare: 0.05,
          scatterReads: 0.35,
        },
        {
          id: "tenant",
          label: "Company ID",
          hotShare: 0.12,
          scatterReads: 0.02,
        },
      ],
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 5_900,
      writesReach: ["sql-primary"],
      noBacklog: false,
      stakes: {
        signedIn: true,
        personalData: true,
        money: false,
        abuse: false,
      },
    },
    chaos: {
      faults: [{ kind: "kill-instance", target: "sql-primary" }],
      label: "A primary crashes",
    },
    palette: ["dns", "load-balancer", "app-server", "sql-primary"],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 30, 2],
        [
          "db",
          "sql-primary",
          7,
          4,
          2,
          2,
          { shards: 4, partitionKey: "tenant" },
        ],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    ),
    concepts: ["partitioning", "scatter-gather", "hot-keys"],
    hint: "For each key, ask two things: does every new write land on the same shard, and does opening a task list name the key? A key the common reads don't name sends them to every shard.",
  },
  {
    id: "like-storm",
    mode: "build",
    track: "cap",
    requires: ["full-basket", "tenant-split"],
    title: "Like Storm",
    tagline: "One post is getting four in ten of all likes.",
    scenario: {
      product: "the social app",
      reads: "people seeing like counts",
      writes: "likes and unlikes",
      hot: "like counts on popular posts",
      records: "every like, by post and by user",
    },
    brief:
      "A singer with a hundred million followers posts a photo, and four in ten of the app's likes now go to it. Peak is 6,000 requests a second, half of them likes. Counts can be a few seconds stale, and a like must never fail: if a split leaves the copies apart, they can be added up later. Likes live in a {nosql} store, which spreads keys across its partitions, but any one key tops out around 1,000 writes a second, however much capacity you buy.",
    load: {
      peakRps: 6_000,
      readFraction: 0.5,
      cacheableFraction: 0.8,
      heavyWriteFraction: 0,
      tunableConsistency: true,
      partitionKeys: [
        { id: "post", label: "Post ID", hotShare: 0.4, scatterReads: 0 },
        {
          id: "salted",
          label: "Post ID + random suffix",
          hotShare: 0.04,
          scatterReads: 0.3,
          // A count reads all ten suffixes.
          scatterFanout: 10,
        },
        {
          id: "user",
          label: "ID of who liked",
          hotShare: 0.002,
          scatterReads: 0.95,
          // Counting one post's likes scans every page of the table.
          scatterFanout: 50,
        },
      ],
    },
    targets: {
      p99Ms: 400,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 5_500,
      writesReach: ["durable"],
      noBacklog: false,
      stakes: {
        signedIn: true,
        personalData: false,
        money: false,
        abuse: true,
      },
      onSplit: "available",
    },
    chaos: { faults: SPLIT, label: SPLIT_LABEL },
    palette: ["dns", "load-balancer", "app-server", "cache", "nosql"],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 10, 2],
        ["cache", "cache", 6, 3, 2, 2],
        [
          "db",
          "nosql",
          8,
          4,
          4,
          1,
          { partitionKey: "salted", consistency: "eventual" },
        ],
      ],
      [`${C}>lb`, "lb>app", "app>cache", "cache>db"],
    ),
    concepts: ["hot-keys", "conflict-resolution", "scatter-gather"],
    hint: "No key that keeps one post's likes together can spread them. Split the hot post's likes across several keys, cache the counts, and let a split be reconciled afterwards.",
  },
  {
    id: "claim-your-name",
    mode: "build",
    track: "cap",
    requires: ["like-storm"],
    title: "Claim Your Name",
    tagline: "Launch day: everybody wants a short username.",
    scenario: {
      product: "the new social network",
      reads: "username checks and profile lookups",
      writes: "sign-ups and profile changes",
      hot: "profiles being looked up",
      records: "accounts and their usernames",
    },
    brief:
      "A new social network opens sign-ups. Peak is 15,000 requests a second and 6,000 of them are writes, so one {sql-primary} isn't enough: shard it. Usernames must be unique. If both sides of a network split accept the same name, two people end up with it, and one of them loses it later. Refusing sign-ups on the cut-off side for a minute is fine. Pick the key, the shard count, the copies per shard and what each shard does during a split.",
    load: {
      peakRps: 15_000,
      readFraction: 0.6,
      cacheableFraction: 0,
      heavyWriteFraction: 0,
      tunableConsistency: true,
      partitionKeys: [
        {
          id: "signup",
          label: "Sign-up time",
          hotShare: 0.9,
          scatterReads: 0,
        },
        {
          id: "domain",
          label: "Email domain",
          hotShare: 0.55,
          scatterReads: 0,
        },
        {
          id: "username",
          label: "Username",
          hotShare: 0.01,
          scatterReads: 0.05,
        },
      ],
    },
    targets: {
      p99Ms: 400,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 6_300,
      writesReach: ["durable"],
      noBacklog: false,
      stakes: { signedIn: true, personalData: true, money: false, abuse: true },
      onSplit: "consistent",
    },
    chaos: { faults: SPLIT, label: SPLIT_LABEL },
    palette: ["dns", "load-balancer", "app-server", "sql-primary", "nosql"],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 30, 2],
        [
          "db",
          "sql-primary",
          7,
          4,
          3,
          3,
          { shards: 3, partitionKey: "username", consistency: "strong" },
        ],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    ),
    concepts: ["quorum", "partitioning", "cap-theorem"],
    hint: "A uniqueness check is only safe if the name's shard can't be written on both sides of a split. And a key that sends every new sign-up to the same place doesn't spread anything.",
  },
]

/**
 * Production incidents: chaos rounds that only the production settings can
 * survive. A slow partner, a poison message, a login flood, a bad migration
 * and a silent hang.
 */
const OPS: Level[] = [
  {
    id: "slow-partner",
    mode: "build",
    track: "ops",
    requires: ["upload-rush"],
    title: "Slow Partner",
    tagline: "The payment provider is having a bad day. Are you?",
    scenario: {
      product: "the food-delivery app",
      reads: "people browsing menus and tracking orders",
      writes: "orders being placed",
      hot: "restaurant menus",
      records: "orders and their payment status",
      job: "charging each order through the payment provider",
    },
    brief:
      "A food-delivery app takes 1,200 requests a second at dinner time, and one in ten places an order. Each order is charged through a payment provider: a {third-party-api} you don't run, with a quota of 100 calls a second per block. The chaos round is the provider slowing down: every call takes five seconds longer. Browsing must keep working, no order may be lost, and nobody may be charged twice.",
    load: {
      peakRps: 1_200,
      readFraction: 0.9,
      cacheableFraction: 0,
      heavyWriteFraction: 0,
      // A charge is a call to the provider: about 150ms, nearly all waiting.
      job: { seconds: 0.15, cpuBound: false },
    },
    targets: {
      p99Ms: 350,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 1_450,
      writesReach: ["sql-primary", "third-party-api"],
      noBacklog: true,
      stakes: { signedIn: true, personalData: true, money: true, abuse: false },
    },
    chaos: {
      faults: [
        { kind: "slow-dependency", target: "third-party-api", extraMs: 5_000 },
      ],
      label: "The payment provider takes five seconds a call",
    },
    palette: [
      "dns",
      "load-balancer",
      "app-server",
      "sql-primary",
      "queue",
      "worker",
      "third-party-api",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 2, 2],
        ["db", "sql-primary", 6, 6, 2, 2],
        ["charges", "queue", 6, 2],
        ["pay", "worker", 8, 2, 2, 2],
        ["provider", "third-party-api", 10, 2, 2],
      ],
      [
        `${C}>lb`,
        "lb>app",
        "app>db",
        "app>charges",
        "charges>pay",
        "pay>provider",
      ],
    ),
    concepts: ["timeouts-and-retries", "idempotency", "async-processing"],
    hint: "Charge orders from workers behind a {queue}, not while the customer waits. Then ask what a worker does while the provider takes five seconds: how long does it wait, and how often does it try again?",
  },
  {
    id: "poison-pill",
    mode: "build",
    track: "ops",
    requires: ["upload-rush"],
    title: "Poison Pill",
    tagline: "One corrupt file, retried forever.",
    scenario: {
      product: "the document app",
      reads: "people opening documents and previews",
      writes: "uploaded documents",
      hot: "recently shared documents",
      records: "documents and their previews",
      files: "every uploaded document and its previews",
      job: "turning each upload into page previews",
    },
    brief:
      "A document app takes 800 requests a second, and one in twenty is an upload that needs page previews made by a {worker}. The chaos round is a batch of corrupt files that crash the converter every time they're tried. The queue keeps handing them back, so they're retried forever, and the uploads behind them wait. The previews must keep up.",
    load: {
      peakRps: 800,
      readFraction: 0.95,
      cacheableFraction: 0,
      heavyWriteFraction: 1,
      // Rendering a few pages of previews: about half a second of CPU.
      job: { seconds: 0.5, cpuBound: true },
    },
    targets: {
      p99Ms: 400,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 1_900,
      writesReach: ["object-store"],
      noBacklog: true,
      stakes: {
        signedIn: true,
        personalData: true,
        money: false,
        abuse: false,
      },
    },
    chaos: {
      faults: [{ kind: "poison-message" }],
      label: "Corrupt files crash the converter every time",
    },
    palette: [
      "dns",
      "load-balancer",
      "app-server",
      "object-store",
      "queue",
      "worker",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 2, 2],
        ["files", "object-store", 7, 6],
        ["jobs", "queue", 6, 2],
        ["convert", "worker", 8, 2, 8, 2],
      ],
      [
        `${C}>lb`,
        "lb>app",
        "app>files",
        "app>jobs",
        "jobs>convert",
        "convert>files",
      ],
    ),
    concepts: ["dead-letter-queue", "async-processing", "backpressure"],
    hint: "Adding workers is an expensive way to keep retrying a file that will never work. What should happen to a message after its third failure?",
  },
  {
    id: "login-flood",
    mode: "build",
    track: "ops",
    requires: ["front-page"],
    title: "Login Flood",
    tagline: "A million stolen passwords, tried at once.",
    scenario: {
      product: "the streaming service",
      reads: "people browsing the catalogue and their profile",
      writes: "sign-ins and watch history",
      hot: "the catalogue and popular titles",
      records: "accounts and watch history",
    },
    brief:
      "A streaming service serves 10,000 requests a second at peak. Passwords leaked from another site are being tried against yours: in the chaos round, attackers send four times your normal traffic at the sign-in endpoint, and someone probes the API without signing in at all. Real users must keep working, and nobody unsigned may read anything.",
    load: {
      peakRps: 10_000,
      readFraction: 0.9,
      cacheableFraction: 0.6,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 350,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 2_500,
      writesReach: ["sql-primary"],
      noBacklog: false,
      stakes: { signedIn: true, personalData: true, money: false, abuse: true },
    },
    chaos: {
      faults: [
        { kind: "credential-stuffing", multiplier: 4 },
        { kind: "unauthenticated-probe" },
      ],
      label: "Credential stuffing at 4x traffic, and an unsigned probe",
    },
    palette: [
      "dns",
      "load-balancer",
      "api-gateway",
      "app-server",
      "cache",
      "sql-primary",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 16, 2],
        ["cache", "cache", 6, 3, 2, 2],
        ["db", "sql-primary", 8, 4, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>cache", "cache>db"],
    ),
    concepts: ["rate-limiting", "authn-authz", "finding-the-bottleneck"],
    hint: "Four times the traffic is far more than any budget buys. Stop it where it first lands, and make sure the code behind checks who's calling.",
  },
  {
    id: "bad-migration",
    mode: "build",
    track: "ops",
    requires: ["zone-outage"],
    title: "Bad Migration",
    tagline: "The standby copied the mistake perfectly.",
    scenario: {
      product: "the lab notebook",
      reads: "scientists reading results and notes",
      writes: "new measurements and attached files",
      hot: "this week's experiments",
      records: "experiments, measurements and notes",
      files: "attached images and instrument files",
    },
    brief:
      "Research labs keep their results in an online notebook: 600 requests a second, one in ten adding measurements or files. A day of results can be a day of fieldwork nobody can repeat, so the labs' contract says a restore loses at most 15 minutes. The chaos round is a migration that deletes a column of results. It runs on the primary, and the standby copies it straight away.",
    load: {
      peakRps: 600,
      readFraction: 0.9,
      cacheableFraction: 0,
      heavyWriteFraction: 0,
    },
    targets: {
      p99Ms: 300,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 1_550,
      writesReach: ["sql-primary", "object-store"],
      noBacklog: false,
      stakes: {
        signedIn: true,
        personalData: false,
        money: false,
        abuse: false,
      },
      rpoMinutes: 15,
    },
    chaos: {
      faults: [{ kind: "bad-migration" }],
      label: "A migration deletes a column of results",
    },
    palette: [
      "dns",
      "load-balancer",
      "app-server",
      "sql-primary",
      "sql-replica",
      "object-store",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 2, 2],
        [
          "db",
          "sql-primary",
          7,
          3,
          2,
          2,
          { practices: { backups: "point-in-time" } },
        ],
        [
          "files",
          "object-store",
          7,
          6,
          1,
          1,
          { practices: { backups: "point-in-time" } },
        ],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>files"],
    ),
    concepts: ["backups-and-rpo", "standby", "read-replicas"],
    hint: "Standbys and replicas copy the mistake. What restores the notebook to ten minutes before the migration, and what about the files?",
  },
  {
    id: "nobody-noticed",
    mode: "build",
    track: "ops",
    requires: ["slow-partner", "poison-pill"],
    title: "Nobody Noticed",
    tagline:
      "Every health check is green. No invoices have gone out since midnight.",
    scenario: {
      product: "the billing system",
      reads: "customers viewing their account and invoices",
      writes: "usage records and invoice requests",
      hot: "this month's invoices",
      records: "customers, usage and invoices",
      files: "invoice PDFs",
      job: "rendering each invoice as a PDF",
    },
    brief:
      "A billing system takes 400 requests a second, and one in twenty creates an invoice that {worker} instances render as a PDF. The chaos round is the quiet kind of failure: the workers hang on a stuck connection. They don't crash, so health checks stay green and nothing restarts them. Invoices must keep going out.",
    load: {
      peakRps: 400,
      readFraction: 0.95,
      cacheableFraction: 0,
      heavyWriteFraction: 1,
      // Filling in one invoice template as a PDF: about 300ms of CPU.
      job: { seconds: 0.3, cpuBound: true },
    },
    targets: {
      p99Ms: 350,
      maxErrorRate: 0.001,
      availability: 0.999,
      budgetUsd: 1_600,
      writesReach: ["sql-primary", "object-store"],
      noBacklog: true,
      stakes: { signedIn: true, personalData: true, money: true, abuse: false },
    },
    chaos: {
      faults: [{ kind: "silent-stall", target: "worker" }],
      label: "Workers hang without crashing",
    },
    palette: [
      "dns",
      "load-balancer",
      "app-server",
      "sql-primary",
      "object-store",
      "queue",
      "worker",
    ],
    reference: graph(
      [
        ["lb", "load-balancer", 2, 4],
        ["app", "app-server", 4, 4, 2, 2],
        ["db", "sql-primary", 6, 6, 2, 2],
        ["jobs", "queue", 6, 2],
        ["render", "worker", 8, 2, 3, 2],
        ["pdfs", "object-store", 10, 3],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>jobs", "jobs>render", "render>pdfs"],
    ),
    concepts: ["alerting", "n-plus-one-redundancy", "backpressure"],
    hint: "A hung worker looks healthy from outside. What would tell someone the invoices have stopped, and how many workers do you need while one is being replaced?",
  },
]

/**
 * References and repair starters get every production practice their stakes
 * call for. A reference shows the full answer; a starter's lesson is its root
 * cause, not a missing setting.
 */
const hardened = (l: Level): Level => {
  const stakes = l.targets.stakes
  if (!stakes) return l
  return {
    ...l,
    reference: withPractices(l.reference, stakes),
    starter: l.starter && withPractices(l.starter, stakes),
  }
}

export const LEVELS: Level[] = [
  ...BUILD,
  ...LATER_BUILD,
  ...CLASSICS,
  ...CAP,
  ...OPS,
  ...REPAIR,
].map(hardened)

export const levelById = (id: string) => LEVELS.find((l) => l.id === id)

/** Free play: every component, no targets that matter. */
export const SANDBOX_LOAD: LoadProfile = {
  peakRps: 5_000,
  readFraction: 0.8,
  cacheableFraction: 0.6,
  heavyWriteFraction: 0,
}
