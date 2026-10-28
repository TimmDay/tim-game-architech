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
  | "signed-urls"
  | "async-processing"
  | "competing-consumers"
  | "backpressure"
  | "availability-zones"
  | "multi-region"
  | "availability-math"
  | "single-point-of-failure"
  | "queue-vs-log"
  | "fan-out"
  | "oltp-vs-olap"
  | "finding-the-bottleneck"
  | "critical-path"
  | "provider-quotas"
  | "micro-caching"
  | "geospatial-indexing"
  | "cache-stampede"
  | "id-generation"
  | "partitioning"
  | "copies-vs-shards"
  | "data-isolation"
  | "delivery-guarantees"
  | "fan-out-on-write"
  | "hot-keys"
  | "waiting-room"
  | "inventory-contention"
  | "adaptive-bitrate"
  | "ephemeral-state"
  | "precomputation"
  | "latency-budget"
  | "network-split"
  | "cap-theorem"
  | "quorum"
  | "pacelc"
  | "conflict-resolution"
  | "scatter-gather"
  | "key-value-modelling"
  | "backups-and-rpo"
  | "encryption-at-rest"
  | "authn-authz"
  | "rate-limiting"
  | "timeouts-and-retries"
  | "dead-letter-queue"
  | "idempotency"
  | "alerting"
  | "simplest-design"
  | "stateless-tokens"

export const CONCEPTS: Record<ConceptId, Card> = {
  "simplest-design": {
    title: "The simplest design that meets the targets",
    body: "Every component you add is something to deploy, patch, monitor, pay for and be paged about. A {cache} in front of a database that isn't busy, a replica nobody reads from, or a second region for users who all live in one country makes the design harder to run without making it better. Here, a part the targets don't need costs the third star.",
    interview:
      "Start from the targets and add a component only when a number calls for it: 'the primary can take 3,000 writes, we need 400, so no sharding yet.' Then say what would change your mind, and what you'd add first when it does.",
  },
  "key-value-modelling": {
    title: "When a key-value store fits",
    body: "A {nosql} store looks items up by a key and spreads keys across partitions, so writes scale by adding capacity instead of hitting one primary's ceiling. In return you design around your queries up front: the key (here, user and day) must be in every lookup, and joins, ad-hoc filters and transactions across many items are hard or missing.",
    interview:
      "Say the access patterns first ('read one user's day, read one user's week'), then the key that serves them. If you can't list the queries, or the data is full of relationships, a relational database is the safer start.",
  },
  "backups-and-rpo": {
    title: "Backups, RPO and RTO",
    body: "Standbys and replicas copy every change instantly, including a bad migration or a dropped table, so they don't protect data from mistakes. Only backups do. The RPO (recovery point objective) is how much recent data you can lose: a nightly backup means up to a day. Point-in-time recovery replays the database's log to any minute. The RTO is how long the restore takes.",
    interview:
      "Say the RPO the business can live with, then pick the backup that meets it: daily for data you could rebuild, point-in-time for money and bookings. Mention testing restores, because an untested backup is a hope.",
  },
  "encryption-at-rest": {
    title: "Encryption at rest",
    body: "Data on disk, in snapshots and in backups is encrypted with keys held by a key service, so a lost disk or a leaked snapshot is unreadable. On managed stores it's close to free. It doesn't protect against someone who can query the database normally: that's what access control is for.",
    interview:
      "Say what it protects against (stolen disks, copied snapshots) and what it doesn't (a compromised app). Then mention who can use the keys, and that backups are encrypted too.",
  },
  "authn-authz": {
    title: "Authentication and authorization",
    body: "Authentication proves who is calling; authorization decides what they may touch. Check both on the server for every request, at the first tier that runs your code or at an {api-gateway} in front of it. A check in the browser is a convenience, never a control.",
    interview:
      "Name where identity is checked (the gateway or the app), and say that each request is also checked against the specific record: 'is this ticket in this user's company?' That second check is where most real breaches happen.",
  },
  "stateless-tokens": {
    title: "Signed tokens, checked locally",
    body: "At sign-in, the {auth-service} gives the user a short-lived access token, signed with its private key, and a longer-lived refresh token. Each server checks the signature with the matching public key, which it fetches once and caches, so ordinary requests never call the {auth-service}. The price is revocation: a stolen access token works until it expires. So access tokens live minutes to an hour, and the refresh is where a signed-out or banned user is caught.",
    interview:
      "Say what the token holds (who, their roles, when it expires), who checks it (every service, on its own), and how long it lives. Then say how you'd cut someone off right now: short expiry, and a small deny list in a {cache} for emergencies.",
  },
  "rate-limiting": {
    title: "Rate limiting",
    body: "A limit on how fast one caller (an account, an IP address, an API key) can send requests, enforced where traffic first lands. It stops credential stuffing, scraping and runaway clients from taking capacity meant for everyone else, and caps the bill when each request costs money. A limit you run yourself, across several instances, needs its counters in a shared {cache}: if each instance counts alone, a caller spread across all of them gets the limit once per instance.",
    interview:
      "Say what you limit per (account and IP for logins, API key for partners), where it's enforced (the edge), and what the caller sees: a 429 with a retry time, not a timeout.",
  },
  "timeouts-and-retries": {
    title: "Timeouts, retries and backoff",
    body: "Every call to another component needs a timeout, or one slow dependency holds every thread until the caller stops serving anyone. Retrying a failed call helps with brief glitches, but immediate retries hit a struggling dependency hardest exactly when it's weakest. Retry with exponential backoff and random jitter, and cap how many retries there can be.",
    interview:
      "For each synchronous call, say its timeout and retry policy. 'Backoff with jitter and a retry budget' is the phrase; 'circuit breaker' is the follow-up, for a dependency that's clearly down.",
  },
  "dead-letter-queue": {
    title: "Dead-letter queues",
    body: "A message that fails every time (a corrupt file, a bug that one input triggers) will otherwise be retried forever, using up a consumer each time and holding up the work behind it. After a few attempts, move it to a dead-letter queue, alert someone, and replay it once the cause is fixed.",
    interview:
      "Say how many attempts before a message is parked, who gets told, and how it's replayed. A dead-letter queue nobody watches is just a slower way to lose data.",
  },
  idempotency: {
    title: "Idempotency keys",
    body: "Retries mean a request can arrive twice: the client timed out, but the first attempt had worked. For anything that moves money or books something, the client sends a unique key with the request, and the server records it with the result. A repeat with the same key returns the first result instead of acting again.",
    interview:
      "Whenever you add retries to a write, add an idempotency key in the same breath, and say where the keys are stored and for how long.",
  },
  alerting: {
    title: "Metrics and alerts",
    body: "Alert on what users feel, not on every graph: error rate and p99 at the request tier, the age of the oldest message in each queue, and replication lag and storage on the system of record. An alert should mean someone needs to act now; everything else is a dashboard.",
    interview:
      "Name two or three alerts and their thresholds, tied to the targets: 'p99 over 300ms for five minutes pages someone'. Then say how you'd find which component is to blame: traces across the request path.",
  },
  "network-split": {
    title: "Network splits",
    body: "A network split (or network partition) is when every machine stays up but some can't reach the others: a switch fails, a link between zones is cut, a network change goes out with a mistake. Each side sees the other as down. From inside, a dead machine and an unreachable one look the same, so both sides can carry on as if they were the only survivor, and accept writes the other never sees.",
    interview:
      "Describe the event before the choice it forces: how the split happens, what each side can see, and how you'd notice. Then say, per store, whether the cut-off side refuses writes or keeps answering and merges afterwards.",
  },
  "cap-theorem": {
    title: "CAP theorem",
    body: "When a network split leaves copies of your data unable to reach each other, each side must choose: refuse requests until the split heals (consistency), or keep answering and let the copies disagree for a while (availability). You can't have both during the split. The P is a network partition, not the data partitioning (sharding) you choose for scale.",
    interview:
      "Don't call a whole system CP or AP. Say, per piece of data, what a wrong answer costs compared with no answer: a double-spent balance is worse than a refused transfer; a refused add-to-basket is worse than a basket that briefly shows an old item.",
  },
  quorum: {
    title: "Quorums and majorities",
    body: "A strongly consistent store commits a write once a majority of its copies have it. During a split only one side can hold a majority, so only one side can keep accepting writes, and the two sides can never both commit conflicting ones. Two copies can't form a majority on either side of a split, which is why consistent stores run three, or five.",
    interview:
      "Say the copy count and the majority: three copies across three zones survive losing one zone. Then say why not two (no majority after a split) and why not four (still only survives one loss, for more money).",
  },
  pacelc: {
    title: "PACELC: the trade-off without a split",
    body: "CAP only describes a network split. Else, in normal running, the choice is latency against consistency: a strongly consistent write waits for a copy in another zone to confirm it, every time: a few milliseconds between zones, tens to hundreds between regions. An eventually consistent write returns as soon as one copy has it, and the others catch up a little later.",
    interview:
      "Splits are rare; the latency cost of strong consistency is paid on every write. Mention both halves: what happens during a split, and what each write costs the rest of the time.",
  },
  "conflict-resolution": {
    title: "Resolving conflicting writes",
    body: "If both sides of a split accept writes, the copies disagree when it heals. Last-writer-wins is simple and silently drops one write. Keeping both and merging (a basket that's the union of both sides) loses nothing but needs data that merges cleanly. Some data types (counters, sets) are designed to always merge, whatever order the writes arrive in.",
    interview:
      'If you choose availability, say how the copies reconcile. "Last write wins" is an answer, but name what it loses. Removals are the hard case: a deleted basket item can come back unless deletes are recorded too.',
  },
  "scatter-gather": {
    title: "Scatter-gather reads",
    body: "Once data is sharded, a query that names the partition key goes to one shard. A query that doesn't has to ask every shard and merge the answers, and it waits for the slowest. With many shards, those reads get slower and depend on every shard being up.",
    interview:
      "List your top queries and check each names the key. If an important one doesn't, keep a second copy of the data partitioned the other way (an index table), and say what it costs to keep both in step.",
  },
  "cache-stampede": {
    title: "Cache stampede",
    body: "Once a {cache} answers most reads, the database behind it is sized for the misses, not the full load. Lose the cache (or let a hot key expire) and every request hits the database at once. Replicate the cache, warm it before it takes traffic, and let only one request rebuild a missing key.",
    interview:
      "Say what the database would see with the cache gone. If it can't survive that, the cache is no longer optional: it needs redundancy like any other critical tier.",
  },
  "id-generation": {
    title: "Generating unique IDs",
    body: "A short code must be unique and hard to guess. Options: hash the long URL and take a few characters (collisions need handling), encode a counter in base 62 (unique, but sequential and guessable), or hand out ranges of a counter to each server so they never coordinate per request.",
    interview:
      "Do the arithmetic: 7 base-62 characters give about 3.5 trillion codes. Then pick a scheme and say how it avoids collisions without a database round-trip per link.",
  },
  partitioning: {
    title: "Partitioning (sharding)",
    body: "Split data across many machines by a key, so each machine takes a share of the writes. One {sql-primary} has a ceiling on writes that more standbys don't raise; a partitioned store like {nosql} raises it by adding partitions. The partition key decides whether load spreads evenly.",
    interview:
      "Name the partition key and why: for chat, the conversation ID keeps a chat's messages together and in order. Then say what happens to a very busy key.",
  },
  "copies-vs-shards": {
    title: "Copies and shards",
    body: "A copy (a replica or a standby) holds the same data as the original: it buys survival and, for read replicas, more reads, but every write still lands on every copy. A shard holds different data: the rows are split by a key, so each shard takes only its share of the writes. Real stores do both. Each shard has its own primary and standbys, so a sharded {sql-primary} with three copies over three zones is a grid: shards down, zones across. Your app still sees one database, and the driver or the store routes each query to its shard.",
    interview:
      "Keep the words apart: say replicas when you mean copies and shards or partitions when you mean splitting. Then size each on its own: shards from the write rate one primary can take, copies from the failures you must survive.",
  },
  "data-isolation": {
    title: "Keeping data apart",
    body: "Sometimes the rule isn't how evenly data spreads but which records may sit together: each country's patients, each regulated customer, each tenant that pays for isolation. Sharding can enforce it if the key starts with the group, and shards are placed by a lookup table or by ranges so each holds one group. A hash mixes groups on every shard. A bug, a breach or a bad migration on one shard then touches one group, and deleting or exporting a group's data is a job for its own shards.",
    interview:
      "Say the rule first ('a shard never holds two countries' records'), then the key that enforces it and how shards are placed. Separate it from physical location: where each shard's machines run is a deployment choice on top.",
  },
  "delivery-guarantees": {
    title: "Delivery guarantees",
    body: "At-most-once can lose messages; at-least-once can deliver duplicates; exactly-once is at-least-once plus deduplication. Real systems retry until the receiver acknowledges, and give every message an ID so a retry doesn't show it twice.",
    interview:
      "Say which guarantee you're giving and where the dedup happens. For chat: store first, acknowledge to the sender, then deliver with retries and a client-side message ID.",
  },
  "fan-out-on-write": {
    title: "Fan-out on write vs read",
    body: "Fan-out on write copies each post into every follower's precomputed timeline when it's posted: reads are cheap, writes are expensive. Fan-out on read builds the timeline when it's opened: writes are cheap, every read is expensive. Most read-heavy feeds precompute, and handle accounts with millions of followers differently.",
    interview:
      "Compare reads per second with posts per second times average followers. Then raise the celebrity problem yourself and propose the hybrid: push for most accounts, pull for the biggest.",
  },
  "hot-keys": {
    title: "Hot keys",
    body: "Partitioning spreads load only if the keys are spread. One celebrity's post, one viral link or one stadium's seat map can put most of the traffic on one partition. Fixes: cache hot keys close to readers, split a hot key into several, or treat the biggest keys as a special case.",
    interview:
      "After choosing a partition key, ask what the busiest single key looks like. Interviewers often hold this back to see whether you'll find it yourself.",
  },
  "waiting-room": {
    title: "Virtual waiting rooms",
    body: "When demand is far above what the system of record can take, don't let everyone through and fail them. Put arrivals in a line and admit them at the rate the system can serve. The line is a {queue} with a known drain rate, so you can tell each person their place and roughly how long they'll wait.",
    interview:
      "Say the admission rate out loud and where it comes from (the database's write limit, or the seats left). A fair, honest wait beats a fast error.",
  },
  "inventory-contention": {
    title: "Contended inventory",
    body: "When thousands of people want the same seat, the database must serialise them: one wins, the rest are told it's gone. Hold a seat for a few minutes during checkout so payment can't race another buyer, release it if they don't pay, and never take the hold in a cache or replica.",
    interview:
      "Explain how you prevent double-selling: a conditional update or a row lock in the primary, plus a hold with an expiry. Mention what happens when the payment fails after the hold.",
  },
  "adaptive-bitrate": {
    title: "Adaptive bitrate streaming",
    body: "Video is transcoded into several resolutions and cut into segments of a few seconds. The player picks the next segment's quality from the bandwidth it's seeing, so playback adapts instead of stalling. Because segments are plain files, a {cdn} caches them like any other static content.",
    interview:
      "Separate the upload pipeline (slow, asynchronous transcoding) from the playback path (cached segments at the edge), and say which formats and resolutions you'd produce.",
  },
  "ephemeral-state": {
    title: "Ephemeral state",
    body: "Some data is useful for seconds and replaced constantly, like a driver's current location. Writing every update to a durable database pays for safety that doesn't matter: if it's lost, the next update replaces it in seconds. Keep it in memory, and send the history down a stream if anyone needs it later.",
    interview:
      "Ask how long each piece of data matters and what losing it costs. A lost location ping costs four seconds; a lost trip record costs money.",
  },
  precomputation: {
    title: "Precomputation",
    body: "When an answer is needed faster than it can be worked out, work it out ahead of time. Autocomplete suggestions, home timelines and leaderboards are built in the background and looked up at request time. The cost is freshness: precomputed answers are only as new as the last rebuild.",
    interview:
      "Say what's precomputed, how often it's rebuilt, and how you handle things that can't wait for the rebuild (a trending topic in the last ten minutes).",
  },
  "latency-budget": {
    title: "Latency budgets",
    body: "Start from the target and give each hop a share: the network, the edge, the app, the data lookup. If the hops add up to more than the target, no amount of scaling will fix it; you need fewer or faster hops.",
    interview:
      "Write the budget down: 200ms total might be 50ms of network, 40ms at the edge and 100ms for the app and its lookups. Then show that each tier fits.",
  },
  "provider-quotas": {
    title: "Provider quotas and rate limits",
    body: "Managed APIs cap how many calls each account can make per second, and default quotas are often small (single digits per second for some OCR APIs). Exceed them and calls are throttled. A queue in front of the calls turns a burst into a steady stream at the rate you're allowed.",
    interview:
      "Ask what the quota is and how long an increase takes. Request it weeks before a known peak, and design so a throttle slows things down rather than failing uploads.",
  },
  "micro-caching": {
    title: "Micro-caching fast-changing data",
    body: "Data that changes every few minutes can still be cached for a few seconds. With thousands of readers asking for the same thing, even a 30-second cache at the edge absorbs most requests, at the cost of being up to 30 seconds out of date.",
    interview:
      "Say the staleness out loud and check it against the product: is a charger status 30 seconds old acceptable? Usually yes, if users can see when it was last updated.",
  },
  "geospatial-indexing": {
    title: "Geospatial indexing",
    body: "'Chargers near me' is a range query in two dimensions, which ordinary indexes handle badly. Geohashes, quadtrees and S2 cells turn locations into keys where nearby places share a prefix, so a search index or key-value store can answer it quickly, and caches can key on the map tile.",
    interview:
      "Explain how you'd bucket locations, how big a bucket is, and what happens at bucket edges (query the neighbouring cells too).",
  },
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
    body: "A {sql-primary} can't spread writes across instances, so extra instances are hot standbys in other zones. They add no capacity, only another failure domain. Failover promotes one when the primary dies, typically in one to two minutes on a managed database.",
    interview:
      "Separate the two jobs: standbys are for availability, backups are for durability. Neither replaces the other.",
  },
  "cache-aside": {
    title: "Cache-aside",
    body: "The app checks the {cache} first and goes to the database only on a miss, writing the result back. Hits are served in about a millisecond and never touch the database. The hit ratio depends mostly on how much of your data is shared and hot, and on the cache being big enough to hold that hot set.",
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
    body: "A {cdn} caches responses at points of presence near users. Cache hits never reach your origin, so a CDN absorbs traffic spikes for static or shared content and cuts latency for distant users. It's billed per request (and, in real life, per gigabyte), so it pays off for heavy or popular content more than for tiny answers you could serve from memory.",
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
  "signed-urls": {
    title: "Signed URLs",
    body: "A short-lived link your server signs, which lets a client upload or download one object straight from the {object-store}. The bytes never pass through your servers: they only check who's asking, sign the link, and record what happened. The link names one key and one action, and expires in minutes.",
    interview:
      "Say who signs it, what it grants (one key, one action, a few minutes) and what happens after an upload: the client tells the app, which checks the object arrived before committing the metadata.",
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
  "multi-region": {
    title: "Running in several regions",
    body: "A region is a cluster of zones in one part of the world. A second region does two things: it serves distant users without an ocean crossing on every request, and it survives a whole region going dark. It costs a full copy of every store, and a strongly consistent write then waits for the other region, tens to hundreds of milliseconds instead of a few.",
    interview:
      "Say which you need it for, latency or surviving a region, and what you give up: a single SQL leader means distant writes still cross the ocean; writing locally means copies can disagree, and an outage can lose the last few seconds of writes.",
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
    body: "Runs your application code in containers. Keep it stateless and it scales by adding instances. Capacity here: about 1,000 simple requests a second per instance, at about 2ms of CPU each.",
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
    body: "An in-memory key-value store. Sub-millisecond reads, around a hundred thousand a second per node. Losing it degrades rather than breaks the system, as long as the database behind it can take the misses.",
    interview:
      "Cache-aside, TTLs, invalidation on write, and stampede protection.",
  },
  "sql-primary": {
    title: "{sql-primary}",
    body: "The source of truth: transactions, constraints, joins. Takes all the writes, about 3,000 a second here, alongside about 10,000 reads. Scales reads with replicas and caches, writes only by sharding or a bigger box. Extra instances here are standbys. Run it in several regions and one leader still takes every write, so writes from far away cross an ocean.",
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
    body: "Partitioned key-value or document storage that scales writes horizontally. Here a block of capacity serves about 5,000 reads and 1,000 writes a second, but any single key tops out around 3,000 reads and 1,000 writes however many blocks you buy, so the partition key decides whether load spreads. Reads can be strong or eventual: eventual is faster and keeps answering when copies can't reach each other, at the price of sometimes being a moment out of date. You design tables around access patterns because joins are limited or absent.",
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
    body: "Processes jobs from a queue in the background. Slow per job but off the user's path. Here an instance has four cores, so it runs four CPU-heavy jobs at once, or about a hundred that mostly wait on another service: its rate depends on how long each job takes.",
    interview: "Size it from arrival rate and job time; scale on queue depth.",
  },
  "object-store": {
    title: "{object-store}",
    body: "Durable blob storage addressed by key. Effectively unlimited, very durable, a few tens of milliseconds per request. Requests to keys that share a prefix top out around 5,500 reads a second, which is why popular files go behind a {cdn}.",
    interview: "Files here, metadata in a database, delivery through a CDN.",
  },
  "search-index": {
    title: "{search-index}",
    body: "An inverted index for full-text search and filtering. Kept in sync from the source of truth, usually via events, and treated as rebuildable.",
    interview:
      "It's a derived view: say how it's fed and how you'd rebuild it.",
  },
  "doc-ai": {
    title: "{doc-ai}",
    body: "A managed API that reads a photo or PDF and returns structured fields: merchant, date, total, tax. Each call takes seconds, and providers cap how many calls per second each account may make until you ask for more.",
    interview:
      "Treat it as a slow, rate-limited dependency: call it from workers behind a queue, never from the request path, and plan for low-confidence results.",
  },
  "third-party-api": {
    title: "{third-party-api}",
    body: "Someone else's service: a payment provider, a carrier's shipping rates, an email sender. You can't scale it, fix it or see inside it. It has a quota on calls per second, and some days it's slow.",
    interview:
      "Keep it off the request path where you can, put a timeout on every call, retry with backoff, and send an idempotency key with anything that charges or books.",
  },
  "data-warehouse": {
    title: "{data-warehouse}",
    body: "Columnar storage for analytics over huge datasets. Brilliant at big scans, slow for small lookups, and loaded in bulk or from a stream.",
    interview: "Keep it off the request path; feed it with events or CDC.",
  },
  "realtime-gateway": {
    title: "{realtime-gateway}",
    body: "Keeps a connection open to every online user so the server can send to them without being asked: chat messages, live scores, a driver's position. The hard part isn't the messages, it's the millions of idle connections and knowing which server holds which user.",
    interview:
      "Say how a message finds the right connection: a lookup of user to gateway server, or a {pubsub} every gateway server listens to.",
  },
  pubsub: {
    title: "{pubsub}",
    body: "Publish once and every subscriber gets a copy, pushed to it. Unlike an {event-stream} there's usually no replay: a subscriber that's down misses the message unless it has a {queue} of its own.",
    interview:
      "Fan-out on write: one event, many independent reactions (email, search, analytics) that don't know about each other.",
  },
  "push-service": {
    title: "{push-service}",
    body: "Sends notifications to phones through the phone platforms' push networks. You hand it a message and a device token; delivery is best effort, can take seconds, and isn't guaranteed.",
    interview:
      "Put a {queue} in front of it, deduplicate, and respect quiet hours. Never promise a notification arrived.",
  },
  "stream-processor": {
    title: "{stream-processor}",
    body: "Runs a continuous job over an {event-stream}: counts per minute, top-k, joins between streams, fraud rules. It keeps state between events and checkpoints it, so a restart picks up where it left off.",
    interview:
      "Name the window (tumbling, sliding) and what happens to late events. That's where the design questions are.",
  },
  scheduler: {
    title: "{scheduler}",
    body: "Starts jobs on a timetable or at a given moment: nightly reports, reminders, retries later. It only says when; the work itself runs on {worker}s or {serverless} functions.",
    interview:
      "At scale, store due jobs in a database indexed by run time and have workers claim them, so a missed tick doesn't lose a job.",
  },
  "time-series-db": {
    title: "{time-series-db}",
    body: "Stores timestamped measurements: metrics, sensor readings, prices. Writes are appends, reads are ranges and rollups, and old data gets downsampled or dropped on a schedule.",
    interview:
      "Mention retention and downsampling: per-second data for a day, per-minute for a month, per-hour forever.",
  },
  coordination: {
    title: "{coordination}",
    body: "A small, strongly consistent store for the few facts every server must agree on: who the leader is, who holds a lock, the current config. Writes need a majority, so it runs on 3 or 5 nodes and stays small.",
    interview:
      "Use it for control, never for data. A lock needs a lease and a fencing token, or a paused process can still act after losing it.",
  },
  "graph-db": {
    title: "{graph-db}",
    body: "Stores things and the relationships between them, and follows those relationships fast: friends of friends, who bought what, shortest paths. A few hops are cheap; whole-graph analytics belong in a batch job.",
    interview:
      "Many social designs keep the graph as adjacency lists in a {nosql} store instead. Say why you'd pay for a graph database.",
  },
  "vector-db": {
    title: "{vector-db}",
    body: "Finds the stored items closest in meaning to a query, using embeddings from a model: similar products, related documents, the passages to give a language model. Search is approximate, trading a little recall for speed.",
    interview:
      "Keep the source of truth elsewhere and treat the vectors as an index you can rebuild when the embedding model changes.",
  },
  "rate-limiter": {
    title: "{rate-limiter}",
    body: "Counts requests per caller (key, user, address) and turns away the excess with a 429 before it reaches anything expensive. Often a feature of the {api-gateway} rather than a box of its own.",
    interview:
      "Token bucket or sliding window, counters in a shared {cache}, and what the client sees: a Retry-After header.",
  },
  "auth-service": {
    title: "{auth-service}",
    body: "Signs users in and issues tokens that every other service can check without calling it back. It's on the path for sign-in, not for every request, as long as tokens are verified locally.",
    interview:
      "Short-lived access tokens plus refresh tokens; say how you'd revoke one before it expires.",
  },
}
