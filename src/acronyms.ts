/**
 * Every acronym the game's text uses, spelled out. Rich text marks them with
 * a small asterisk that opens the expansion, so players learn them as they
 * read. A test fails if game text uses a capitalised term that's neither
 * here nor on the allow-list below, so new acronyms can't slip in unexplained.
 */
export type Acronym = { expansion: string; note?: string }

export const ACRONYMS: Record<string, Acronym> = {
  UTC: {
    expansion: "Coordinated Universal Time",
    note: "One clock for the whole world, with no time zones or daylight saving.",
  },
  CQRS: {
    expansion: "Command Query Responsibility Segregation",
    note: "Separate models for writing data and for reading it.",
  },
  JWT: {
    expansion: "JSON Web Token",
    note: "A signed token format. Hard to revoke before it expires, unless every check consults a denylist.",
  },
  REST: {
    expansion: "Representational State Transfer",
    note: "The common style of web API: resources, standard methods, status codes.",
  },
  USE: {
    expansion: "Utilisation, Saturation, Errors",
    note: "What to measure for every resource: CPU, memory, disks, pools.",
  },
  RED: {
    expansion: "Rate, Errors, Duration",
    note: "What to measure for every service.",
  },
  MVCC: {
    expansion: "Multi-Version Concurrency Control",
    note: "Keeping several versions of a row so readers and writers don't block each other.",
  },
  LSM: {
    expansion: "Log-Structured Merge tree",
    note: "A storage engine that buffers writes in memory and writes sorted files in order.",
  },
  SSD: {
    expansion: "Solid-State Drive",
    note: "Flash storage: far faster than a spinning disk, far slower than memory.",
  },
  ACID: {
    expansion: "Atomicity, Consistency, Isolation, Durability",
    note: "What a database transaction promises. Its C means rules are kept, not the C in CAP.",
  },
  AP: {
    expansion: "Availability + Partition tolerance",
    note: "A store that keeps answering during a network split, and lets its copies disagree for a while.",
  },
  API: {
    expansion: "Application Programming Interface",
    note: "How one program asks another to do something.",
  },
  AVIF: {
    expansion: "AV1 Image File Format",
    note: "A modern image format, much smaller than JPEG.",
  },
  CAP: {
    expansion: "Consistency, Availability, Partition tolerance",
    note: "During a network split, a store must choose: refuse some requests (consistency) or let its copies disagree (availability).",
  },
  CD: {
    expansion: "Continuous Delivery",
    note: "Every change that passes the checks can ship.",
  },
  CDC: {
    expansion: "Change Data Capture",
    note: "Streaming every committed change out of a database's own log.",
  },
  CDN: {
    expansion: "Content Delivery Network",
    note: "Caches close to users, around the world.",
  },
  CI: {
    expansion: "Continuous Integration",
    note: "Every change is built and tested automatically.",
  },
  CRDT: {
    expansion: "Conflict-free Replicated Data Type",
    note: "Data designed to merge cleanly, whatever order the copies' changes arrive in.",
  },
  CP: {
    expansion: "Consistency + Partition tolerance",
    note: "A store that refuses requests during a network split rather than give an answer that might be wrong.",
  },
  CPU: {
    expansion: "Central Processing Unit",
    note: "The processor: what most server work spends.",
  },
  DDoS: {
    expansion: "Distributed Denial of Service",
    note: "A flood of traffic from many machines, meant to knock a site over.",
  },
  DNS: {
    expansion: "Domain Name System",
    note: "Turns a name like example.com into an address.",
  },
  EV: { expansion: "Electric Vehicle" },
  GPS: { expansion: "Global Positioning System" },
  GPU: {
    expansion: "Graphics Processing Unit",
    note: "Hardware for massively parallel work: graphics, ML.",
  },
  HTML: { expansion: "HyperText Markup Language" },
  ID: { expansion: "Identifier" },
  IP: {
    expansion: "Internet Protocol",
    note: "An IP address identifies a machine on the network.",
  },
  NoSQL: {
    expansion: "Not only SQL",
    note: "Databases that aren't relational: key-value, document, wide-column.",
  },
  OCPI: {
    expansion: "Open Charge Point Interface",
    note: "The protocol EV charging networks use to share station data.",
  },
  OCR: {
    expansion: "Optical Character Recognition",
    note: "Reading text out of an image.",
  },
  OLAP: {
    expansion: "Online Analytical Processing",
    note: "Big queries over lots of history: analytics.",
  },
  OLTP: {
    expansion: "Online Transaction Processing",
    note: "Many small, fast reads and writes: the live app.",
  },
  PACELC: {
    expansion:
      "Partition: Availability or Consistency; Else: Latency or Consistency",
    note: "CAP, plus the trade-off that applies when nothing is broken.",
  },
  PDF: { expansion: "Portable Document Format" },
  PII: {
    expansion: "Personally Identifiable Information",
    note: "Data that identifies a person: names, emails, addresses.",
  },
  RPO: {
    expansion: "Recovery Point Objective",
    note: "How much recent data you can afford to lose.",
  },
  RTO: {
    expansion: "Recovery Time Objective",
    note: "How long you can afford to be down.",
  },
  SLA: {
    expansion: "Service Level Agreement",
    note: "A promise to customers, often with penalties.",
  },
  SLO: {
    expansion: "Service Level Objective",
    note: "An internal reliability target.",
  },
  SQL: {
    expansion: "Structured Query Language",
    note: "The language of relational databases.",
  },
  SSO: {
    expansion: "Single Sign-On",
    note: "One login (e.g. your company's) for many apps.",
  },
  TCP: {
    expansion: "Transmission Control Protocol",
    note: "The protocol that gives two machines a reliable, ordered stream of bytes. Most HTTP traffic runs on it.",
  },
  TLS: {
    expansion: "Transport Layer Security",
    note: "The encryption behind https.",
  },
  TTL: {
    expansion: "Time To Live",
    note: "How long a cached copy is kept before it expires.",
  },
  UI: { expansion: "User Interface" },
  URL: { expansion: "Uniform Resource Locator", note: "A web address." },
  XSS: {
    expansion: "Cross-Site Scripting",
    note: "Injecting script into a page that other users see.",
  },
  CAPTCHA: {
    expansion:
      "Completely Automated Public Turing test to tell Computers and Humans Apart",
    note: "A challenge that's easy for people and hard for bots.",
  },
  DRM: {
    expansion: "Digital Rights Management",
    note: "Encryption and licensing that limit how paid content can be copied.",
  },
  ETA: { expansion: "Estimated Time of Arrival" },
  GB: {
    expansion: "Gigabyte",
    note: "A billion bytes.",
  },
  HTTP: {
    expansion: "HyperText Transfer Protocol",
    note: "The protocol of the web; https is HTTP over TLS.",
  },
  TB: {
    expansion: "Terabyte",
    note: "A thousand gigabytes.",
  },
  TV: { expansion: "Television" },
  p50: {
    expansion: "50th-percentile latency",
    note: "The median: half of requests are faster.",
  },
  p99: {
    expansion: "99th-percentile latency",
    note: "99% of requests are faster than this; the slow tail users notice.",
  },
}

/** Capitalised words in game text that aren't acronyms to explain. */
export const NOT_ACRONYMS = new Set([
  "UK",
  "US",
  "ONE",
  "RAW",
  "WebP",
  "JavaScript",
  "WhatsApp",
  "YouTube",
  "GitHub",
  "WebSockets",
  "GraphQL",
  "OAuth",
  "OpenID",
])

const terms = Object.keys(ACRONYMS).sort((a, b) => b.length - a.length)
/** A term, optionally plural ("URLs"), as a whole word. */
export const ACRONYM_PATTERN = new RegExp(`\\b(${terms.join("|")})(s?)\\b`, "g")

/** Find acronyms in plain text: [start, end, term] for each. */
export function findAcronyms(
  text: string,
): { start: number; end: number; term: string }[] {
  const out: { start: number; end: number; term: string }[] = []
  for (const m of text.matchAll(ACRONYM_PATTERN)) {
    const term = m[1]
    if (!term || m.index === undefined) continue
    out.push({ start: m.index, end: m.index + m[0].length, term })
  }
  return out
}
