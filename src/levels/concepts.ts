import type { ComponentKind } from "~/sim/types"

/**
 * The codex. Component names appear only as `{kind}` tokens so the provider
 * toggle renames them; see `~/text.ts`.
 */
export type Card = {
  title: string
  body: string
  /** What an interviewer is listening for. */
  interview: string
}

export type ConceptId =
  | "horizontal-scaling"
  | "n-plus-one-redundancy"
  | "standby"
  | "cache-aside"
  | "read-replicas"
  | "replication-lag"
  | "latency-under-load"
  | "cdn"
  | "static-vs-dynamic"
  | "object-storage"
  | "async-processing"
  | "competing-consumers"
  | "backpressure"
  | "availability-zones"
  | "availability-math"
  | "single-point-of-failure"
  | "queue-vs-log"
  | "fan-out"
  | "oltp-vs-olap"
  | "finding-the-bottleneck"
  | "critical-path"

export const CONCEPTS: Record<ConceptId, Card> = {
  "horizontal-scaling": {
    title: "Horizontal scaling",
    body: "Add more identical instances behind a {load-balancer} instead of buying a bigger machine. It only works when instances are stateless: sessions live in a token or a shared store, never in one server's memory.",
    interview:
      "Say why the tier is stateless before you scale it. 'Where do sessions live?' is the usual follow-up.",
  },
  "n-plus-one-redundancy": {
    title: "N+1 capacity",
    body: "If N instances are exactly enough for peak, you have no headroom for a crash, a deploy or a bad host. Provision so that peak still fits with one instance gone. At small N that's a big percentage, which is why two servers is rarely enough.",
    interview:
      "Do the arithmetic out loud: 'peak is 500, each does 400, so two is the minimum and three survives a failure.'",
  },
  standby: {
    title: "Standby replicas and failover",
    body: "A {sql-primary} can't spread writes across instances, so extra instances are hot standbys in other zones. They add no capacity, only another failure domain. Failover promotes one when the primary dies, usually in under a minute.",
    interview:
      "Separate the two jobs: standbys are for availability, backups are for durability. Neither replaces the other.",
  },
  "cache-aside": {
    title: "Cache-aside",
    body: "The app checks the {cache} first and goes to the database only on a miss, writing the result back. Hits are served in about a millisecond and never touch the database. The hit ratio depends on how much of your data is shared and hot, not on how big the cache is.",
    interview:
      "Mention invalidation (TTL or delete-on-write) and the cold-start stampede: what happens to the database when the cache restarts empty?",
  },
  "read-replicas": {
    title: "Read replicas",
    body: "A {sql-replica} copies the primary and serves reads. Adding replicas scales reads roughly linearly, but writes still all go to one primary. Each replica costs as much as the primary, so for hot, shared data a {cache} is usually cheaper.",
    interview:
      "Say what replicas don't fix: write throughput. For that you shard, or move the data to a {nosql} store.",
  },
  "replication-lag": {
    title: "Replication lag",
    body: "Replicas apply the primary's changes asynchronously, typically milliseconds behind, sometimes seconds. A user who writes and then reads from a replica may not see their own change.",
    interview:
      "Name read-your-writes consistency and a fix: route a user's reads to the primary for a few seconds after they write.",
  },
  "latency-under-load": {
    title: "Latency climbs before capacity runs out",
    body: "Queueing theory: as utilisation approaches 100%, wait time grows like 1 / (1 - utilisation). At 50% busy a request takes about twice its base time; at 90%, ten times. That's why you aim for 60 to 70% at peak, not 99%.",
    interview:
      "When asked 'how many servers?', target a utilisation, not the bare minimum, and explain the tail-latency reason.",
  },
  cdn: {
    title: "Content delivery networks",
    body: "A {cdn} caches responses at points of presence near users. Cache hits never reach your origin, so a CDN absorbs traffic spikes for static or shared content almost for free.",
    interview:
      "Talk about cache keys, TTLs and purge on deploy. Mention it also shields you from some DDoS traffic.",
  },
  "static-vs-dynamic": {
    title: "Static vs dynamic content",
    body: "Images, scripts and video are the same for every user and never need an application server. Serve them from an {object-store} through a {cdn}, and keep compute for requests that need logic.",
    interview:
      "Split the read path early in a design: 'static assets go through the CDN, the API is a separate path.'",
  },
  "object-storage": {
    title: "Object storage",
    body: "An {object-store} keeps blobs by key with very high durability and practically unlimited capacity. It's slower than a disk per request but it scales without you running anything.",
    interview:
      "Store the file in object storage and its metadata in a database. Use pre-signed URLs so uploads skip your servers.",
  },
  "async-processing": {
    title: "Asynchronous processing",
    body: "Anything slow that the user doesn't need to wait for goes on a {queue}: thumbnails, emails, PDFs. The request returns as soon as the message is enqueued, and {worker} instances do the work in the background at their own pace.",
    interview:
      "Say how the user learns the job finished (polling, webhook, websocket) and what happens if a job fails (retries, a dead-letter queue).",
  },
  "competing-consumers": {
    title: "Competing consumers",
    body: "Several {worker} instances read from one {queue}. Each message goes to exactly one of them, so adding workers adds throughput. Size the pool for the arrival rate, not the average.",
    interview:
      "Work it out: 300 jobs a second at 50 per worker is 6 workers at 100%, so run 8 for headroom.",
  },
  backpressure: {
    title: "Backlog and backpressure",
    body: "If messages arrive faster than consumers drain them, the backlog grows without limit, and so does the delay for every job in it. Nothing errors, it just gets later and later. Watch queue depth and age, and autoscale on it.",
    interview:
      "Mention consumer lag as an alert signal, and what you shed or slow down when you can't keep up.",
  },
  "availability-zones": {
    title: "Availability zones",
    body: "A zone is one or more data centres with independent power and networking. Zones in a region fail independently, so spreading instances across two or three of them survives the loss of one. Instances in the same zone fail together.",
    interview:
      "Say that after losing a zone, the remaining instances must still carry peak. Two zones means each must handle 100%.",
  },
  "availability-math": {
    title: "Availability arithmetic",
    body: "Serial components multiply: three 99.9% components in a chain give 99.7%. Redundant copies in independent domains combine as 1 - (1 - a)^n: two 99% instances give 99.99%. One weak link in the chain caps the whole system.",
    interview:
      "Convert to downtime: 99.9% is about 43 minutes a month, 99.99% about 4. Interviewers like the number.",
  },
  "single-point-of-failure": {
    title: "Single points of failure",
    body: "Any component on the request path with only one failure domain. Managed services usually hide this from you; anything you run yourself doesn't. The database is the usual suspect.",
    interview:
      "Walk the request path box by box and ask 'what if this dies?' for each.",
  },
  "queue-vs-log": {
    title: "Queue vs log",
    body: "A {queue} hands each message to one consumer and deletes it once processed: work distribution. An {event-stream} keeps an ordered log that every consumer group reads independently and can replay: fan-out and history.",
    interview:
      "Pick by consumer count: one kind of worker, use a queue; several independent systems, use a log.",
  },
  "fan-out": {
    title: "Fan-out with events",
    body: "Publish one event, and let the search index, the warehouse and the email service each consume it. The producer doesn't know or wait for any of them, and adding a new consumer doesn't touch the producer.",
    interview:
      "Mention the outbox pattern, so the event and the database write can't disagree.",
  },
  "oltp-vs-olap": {
    title: "OLTP vs OLAP",
    body: "Transactional databases answer many small queries fast. A {data-warehouse} answers a few huge queries over columnar storage and takes seconds to do it. Feed the warehouse asynchronously. Never put it on the request path.",
    interview:
      "Say 'separate the read model': operational data stays in the OLTP store and analytics get a copy via events or change data capture.",
  },
  "finding-the-bottleneck": {
    title: "Finding the bottleneck",
    body: "Scaling anything except the bottleneck only adds cost. Measure utilisation per component and find the one that is saturated. Under load it's often the shared stateful piece (the database) rather than the stateless tier everyone scales by reflex.",
    interview:
      "Ask for metrics before proposing fixes: 'what's the database CPU at? what's the cache hit rate?'",
  },
  "critical-path": {
    title: "The critical path",
    body: "A user waits for the slowest chain of synchronous calls their request touches. Make that chain short, and push anything the user doesn't need to see the result of off it, behind a {queue} or {event-stream}.",
    interview:
      "Draw the synchronous path in one colour and the asynchronous path in another. It makes the latency argument obvious.",
  },
}

/** Component cards: what each block is and when to reach for it. */
export const COMPONENT_CARDS: Record<ComponentKind, Card> = {
  dns: {
    title: "{dns}",
    body: "Turns your domain name into addresses. Resolvers cache the answer, so it costs almost nothing per request, and it can route users to the nearest or healthiest region.",
    interview:
      "Mention TTLs: a low TTL makes failover fast and costs more lookups.",
  },
  cdn: {
    title: "{cdn}",
    body: "A cache at the network edge, close to users. Serves cacheable responses without touching your origin and absorbs spikes.",
    interview: "Static assets and shared, public responses; not per-user data.",
  },
  "load-balancer": {
    title: "{load-balancer}",
    body: "Spreads requests across the instances behind it and stops sending to ones that fail health checks. Layer 7 balancers can route by path or header and terminate TLS.",
    interview:
      "Health checks are the point: they turn a crashed instance into reduced capacity instead of failed requests.",
  },
  "api-gateway": {
    title: "{api-gateway}",
    body: "A front door for APIs: authentication, rate limiting, request shaping and routing to services. A load balancer that understands your API.",
    interview:
      "Put cross-cutting concerns here so each service doesn't reimplement them.",
  },
  "app-server": {
    title: "{app-server}",
    body: "Runs your application code in containers. Keep it stateless and it scales by adding instances. Capacity here: about 400 requests a second per instance.",
    interview:
      "State where sessions live and how you'd autoscale (CPU, request count).",
  },
  serverless: {
    title: "{serverless}",
    body: "Your code runs per request and scales to zero. You pay per invocation and lose control of warm instances, so cold starts show up in the p99.",
    interview:
      "Great for spiky or low traffic; at steady high volume, containers are usually cheaper.",
  },
  cache: {
    title: "{cache}",
    body: "An in-memory key-value store. Sub-millisecond reads, tens of thousands a second per node. Losing it degrades rather than breaks the system, as long as the database behind it can take the misses.",
    interview:
      "Cache-aside, TTLs, invalidation on write, and stampede protection.",
  },
  "sql-primary": {
    title: "{sql-primary}",
    body: "The source of truth: transactions, constraints, joins. Takes all the writes. Scales reads with replicas and caches, writes only by sharding or a bigger box. Extra instances here are standbys.",
    interview:
      "Default choice for transactional data. Say why before reaching for NoSQL.",
  },
  "sql-replica": {
    title: "{sql-replica}",
    body: "A read-only copy of the primary, a little behind it. Absorbs reads; cannot take writes at all.",
    interview: "Mention replication lag and read-your-writes.",
  },
  nosql: {
    title: "{nosql}",
    body: "Partitioned key-value or document storage that scales writes horizontally. You design tables around access patterns because joins are limited or absent.",
    interview:
      "Choose it for huge write volume or simple key lookups at scale; say what you lose (ad-hoc queries, multi-row transactions).",
  },
  queue: {
    title: "{queue}",
    body: "Holds messages until a consumer takes one. Each message goes to one consumer. Decouples producers from slow work and smooths bursts.",
    interview: "At-least-once delivery means consumers must be idempotent.",
  },
  "event-stream": {
    title: "{event-stream}",
    body: "An append-only, partitioned log. Every consumer group reads every event and tracks its own position, so you can add consumers or replay history.",
    interview:
      "Ordering is per partition; pick the partition key deliberately.",
  },
  worker: {
    title: "{worker}",
    body: "Processes jobs from a queue in the background. Slow per job but off the user's path. Here, about 50 jobs a second per instance.",
    interview: "Size it from arrival rate and job time; scale on queue depth.",
  },
  "object-store": {
    title: "{object-store}",
    body: "Durable blob storage addressed by key. Effectively unlimited, very durable, a few tens of milliseconds per request.",
    interview: "Files here, metadata in a database, delivery through a CDN.",
  },
  "search-index": {
    title: "{search-index}",
    body: "An inverted index for full-text search and filtering. Kept in sync from the source of truth, usually via events, and treated as rebuildable.",
    interview:
      "It's a derived view: say how it's fed and how you'd rebuild it.",
  },
  "data-warehouse": {
    title: "{data-warehouse}",
    body: "Columnar storage for analytics over huge datasets. Brilliant at big scans, slow for small lookups, and loaded in bulk or from a stream.",
    interview: "Keep it off the request path; feed it with events or CDC.",
  },
}
