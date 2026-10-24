import { deck } from "./build"
import type { DeckCard } from "./types"

/**
 * Fundamentals: discussion decks that aren't tied to a scenario. They cover
 * what interviews ask about beyond any one design: storage engines,
 * transactions, consensus, estimation, the interview itself, and so on.
 * Brought across from the earlier architecture-simulator drill, rewritten
 * into this game's card format and voice.
 */
export type Topic = {
  id: string
  title: string
  blurb: string
  cards: DeckCard[]
}

const topic = (
  id: string,
  title: string,
  blurb: string,
  rows: Parameters<typeof deck>[1],
): Topic => ({ id, title, blurb, cards: deck(id, rows) })

export const TOPICS: Topic[] = [
  topic(
    "topic-interview",
    "The interview itself",
    "How to spend the hour: requirements first, then the design, then the trade-offs.",
    [
      [
        "decision",
        "You're asked to 'design Twitter'. What do you do in the first five minutes?",
        [
          "Ask, don't draw: who uses it, which features are in scope, and what the scale is.",
          "Pin the numbers: daily users, reads per write, the peak, how fresh a timeline must be.",
          "Agree on two or three features to design properly, and say which you're leaving out.",
        ],
        "Why does this decide the rest of the hour?",
      ],
      [
        "decision",
        "How would you split a 45-minute system design interview?",
        [
          "About 5 minutes on requirements and numbers, 10 on a high-level design that works end to end.",
          "About 20 on the two or three parts that are hard for this problem.",
          "The last few on failures, trade-offs and what you'd do next.",
        ],
      ],
      [
        "tradeoff",
        "What does 'name the trade-off' mean, and why do interviewers weigh it so heavily?",
        [
          "Every choice gives something up. Say what you chose, what it costs, and why that's right here.",
          "'A cache, so reads are fast, at the cost of a few seconds of staleness, which this feed can take.'",
          "It shows judgement, which is what a senior engineer is being hired for.",
        ],
      ],
      [
        "edge-case",
        "The interviewer drills into a component you don't know well. What do you do?",
        [
          "Say what you do know, then reason out loud from first principles.",
          "State your assumptions and how you'd check them.",
          "Don't bluff: a confident wrong answer costs more than an honest 'I'd look that up, but I'd expect...'.",
        ],
      ],
    ],
  ),
  topic(
    "topic-estimation",
    "Estimation and latency",
    "Back-of-envelope numbers, tail latency, and what to do when there's too much load.",
    [
      [
        "scale",
        "Roughly how long do these take: a memory read, an SSD read, a round trip in a data centre, a round trip across an ocean?",
        [
          "Memory: about 100 nanoseconds. An SSD read: about 100 microseconds.",
          "A round trip inside a data centre: about half a millisecond.",
          "Across an ocean: 70 to 150 milliseconds. You can't make light go faster, only move closer.",
        ],
        "Which of these explains why a cache in front of a database helps so much?",
      ],
      [
        "decision",
        "How do you structure a back-of-envelope estimate?",
        [
          "Start from users and actions per day, convert to per second, then multiply for the peak (often 2 to 5 times the average).",
          "Split reads and writes, and work out storage per year from record size times records.",
          "Round hard and say so: the point is the order of magnitude and which resource runs out first.",
        ],
      ],
      [
        "tradeoff",
        "A request fans out to 100 services, each with a p99 of 10ms. What's the request's p99?",
        [
          "Much worse than 10ms: with 100 calls, most requests hit at least one slow one.",
          "The chance all 100 are fast is 0.99 to the power 100, about 37%. So the slow tail becomes the typical case.",
          "Fixes: fewer calls, hedged requests (send a second copy after a short wait), and timeouts with partial results.",
        ],
      ],
      [
        "decision",
        "Your service is overloaded. Why shed load rather than queue it?",
        [
          "Queued requests wait until the caller has given up, so you do work nobody will use.",
          "Shedding answers some quickly with a clear 'try later', so the rest are served in time.",
          "Drop the least valuable first: background work before checkout, anonymous before signed in.",
        ],
      ],
    ],
  ),
  topic(
    "topic-storage",
    "Storage engines and indexes",
    "What's under the database: B-trees and LSM trees, logs, filters, search and columns.",
    [
      [
        "tradeoff",
        "B-tree or LSM tree: what's each good at?",
        [
          "A B-tree updates pages in place: fast, predictable reads and range scans, but each write is random disk I/O.",
          "An LSM tree buffers writes in memory and writes sorted files in order: very fast writes.",
          "LSM pays later: a read may check several files, and background merging (compaction) competes with live traffic.",
        ],
        "What happens to an LSM store if compaction falls behind?",
      ],
      [
        "decision",
        "What's a write-ahead log for, and what's built on it?",
        [
          "Every change is appended to the log and flushed before it's acknowledged, so a crash can be replayed.",
          "Replicas follow the same log; point-in-time recovery replays it to any minute.",
          "Change data capture reads it, which is how writes reach a search index without the app writing twice.",
        ],
      ],
      [
        "decision",
        "What does a Bloom filter tell you, and where is it used?",
        [
          "Whether an item is definitely not in a set, or might be. False positives happen; false negatives don't.",
          "A few megabytes cover millions of keys, because it stores bits, not items.",
          "Storage engines check one per file to skip files that can't hold a key.",
        ],
        "When is a false positive unacceptable?",
      ],
      [
        "decision",
        "How does a search index find documents quickly?",
        [
          "An inverted index maps each word to the list of documents containing it.",
          "A query intersects those lists, then ranks the results.",
          "It's a derived copy: it lags the source a little and can always be rebuilt from it.",
        ],
      ],
      [
        "tradeoff",
        "Why is a columnar store fast for analytics and poor at serving requests?",
        [
          "It stores each column together, so a query over two columns of a billion rows reads only those two.",
          "Columns compress very well, because neighbouring values are similar.",
          "Fetching one whole row means reading from every column: slow for a single lookup.",
        ],
      ],
      [
        "edge-case",
        "Why does an auto-incrementing ID break once you shard, and what replaces it?",
        [
          "Each shard would count on its own, so IDs collide, and a central counter is a bottleneck.",
          "Replace it with IDs made of a timestamp, a machine number and a sequence, which sort by time.",
          "Or random IDs, which never collide but don't sort and spread inserts around an index.",
        ],
      ],
    ],
  ),
  topic(
    "topic-transactions",
    "Transactions and isolation",
    "What a transaction promises, what each isolation level allows, and how to handle concurrent writes.",
    [
      [
        "decision",
        "What does a transaction guarantee about atomicity, and what doesn't it?",
        [
          "All its writes to this database happen, or none do, even across a crash.",
          "It says nothing about other systems: an email sent or a payment made inside it isn't undone.",
          "That's why side effects go after the commit, or through an outbox.",
        ],
      ],
      [
        "tradeoff",
        "What does Read Committed guarantee, and what can still go wrong?",
        [
          "You never see another transaction's uncommitted writes.",
          "Reading the same row twice can give two answers, if someone commits in between.",
          "Two transactions can read, change and write the same row, and one update is lost.",
        ],
        "It's the default in most databases. Is that enough for a balance?",
      ],
      [
        "tradeoff",
        "What do Repeatable Read and Serializable add?",
        [
          "Repeatable Read: the rows you've read don't change under you for the rest of the transaction.",
          "Serializable: the result is as if transactions ran one at a time. No anomalies at all.",
          "Serializable costs throughput: conflicting transactions wait or are aborted and must be retried.",
        ],
      ],
      [
        "edge-case",
        "Two requests both read a counter of 10, add one, and write 11. What happened, and how do you fix it?",
        [
          "A lost update: one increment vanished.",
          "Fix it with an atomic update in the database ('set count = count + 1'), not read-then-write.",
          "Or lock the row while reading, or check a version number on write and retry on a mismatch.",
        ],
      ],
      [
        "decision",
        "Why do databases keep several versions of a row (MVCC)?",
        [
          "Readers see a consistent snapshot without blocking writers, and writers don't block readers.",
          "A long report sees the data as it was when it started, while writes carry on.",
          "The cost: old versions pile up and must be cleaned away in the background.",
        ],
      ],
      [
        "decision",
        "How does optimistic locking with a version column work?",
        [
          "Read the row and its version. Write back only 'where version = what I read', and increment it.",
          "If no row matched, someone else changed it first: reload and try again.",
          "No locks are held while the user thinks, so it suits low-conflict edits.",
        ],
      ],
      [
        "tradeoff",
        "Optimistic or pessimistic locking?",
        [
          "Optimistic when conflicts are rare: no waiting, and an occasional retry.",
          "Pessimistic (lock the row first) when conflicts are common, or retries are expensive.",
          "The last seat on a flight is high-conflict; editing your own profile is not.",
        ],
      ],
      [
        "edge-case",
        "How does a deadlock happen, and how do you avoid one?",
        [
          "Transaction A locks row 1 and waits for row 2; B locks row 2 and waits for row 1.",
          "The database detects it and aborts one, which must retry.",
          "Avoid it by always locking rows in the same order, and keeping transactions short.",
        ],
      ],
      [
        "decision",
        "Why is an upsert better than 'select, then insert or update'?",
        [
          "Two requests can both select, both see nothing, and both insert: a duplicate or an error.",
          "An upsert is one atomic statement: insert, or update if the key exists.",
          "With a unique constraint, it's also a cheap way to make a write idempotent.",
        ],
      ],
    ],
  ),
  topic(
    "topic-consensus",
    "Real-time and consensus",
    "Pushing updates to clients, agreeing on a leader, and data types that always merge.",
    [
      [
        "tradeoff",
        "Long polling, server-sent events or WebSockets?",
        [
          "Long polling: works everywhere, but a request per update and some delay.",
          "Server-sent events: a one-way stream from server to browser over plain HTTP. Good for feeds and notifications.",
          "WebSockets: two-way and low latency, for chat and games, but each connection is long-lived state to manage.",
        ],
      ],
      [
        "scale",
        "A million users each hold an open connection. What breaks first?",
        [
          "Memory and file handles per connection on each server, long before CPU.",
          "Balancing: connections are long-lived, so new servers stay empty unless clients reconnect.",
          "Fan-out: a message for one user must find the server holding their connection, through a shared routing layer.",
        ],
      ],
      [
        "decision",
        "What problem does a consensus algorithm like Raft solve?",
        [
          "Several machines agree on one ordered log of decisions, even if some fail.",
          "It elects a leader; a write is committed once a majority have it.",
          "It needs a majority to make progress: three nodes survive one failure, five survive two.",
        ],
        "Why not run consensus for every write in the system?",
      ],
      [
        "edge-case",
        "A node holding a lock pauses for a long garbage collection, its lease expires, someone else takes the lock, then it wakes and writes. How do you stop that?",
        [
          "Fencing tokens: each grant of the lock comes with a number that only goes up.",
          "The storage rejects any write carrying an older number than one it has seen.",
          "The paused node's write is refused, even though it still thinks it holds the lock.",
        ],
      ],
      [
        "alternative",
        "What's a coordination service good for, and what isn't it for?",
        [
          "Small, critical, strongly consistent facts: who the leader is, configuration, locks, membership.",
          "Not for application data or high write volumes: every write goes through consensus.",
          "Run it on three or five nodes, and keep what's stored in it small.",
        ],
      ],
      [
        "tradeoff",
        "What's a CRDT, and when is it better than last-writer-wins?",
        [
          "A data type that always merges to the same result, whatever order changes arrive in: counters, sets, text.",
          "Last-writer-wins silently drops one of two concurrent changes.",
          "Use a CRDT where both changes matter, such as two people editing one document, at the cost of more metadata.",
        ],
      ],
    ],
  ),
  topic(
    "topic-event-logs",
    "Event logs and distributed transactions",
    "Partitioned logs, consumer groups and offsets, then sagas and the outbox.",
    [
      [
        "tradeoff",
        "How is an event log different from a queue?",
        [
          "A queue hands each message to one consumer and deletes it once done.",
          "A log keeps every event for a set time; each consumer group reads at its own position.",
          "So a log can feed many systems, and replay history to a new one.",
        ],
      ],
      [
        "tradeoff",
        "What are a log's partitions for, and how many should it have?",
        [
          "Partitions are how a log scales: each is read by one consumer in a group at a time.",
          "More partitions allow more parallel consumers, but cost more and make reordering harder.",
          "The partition key decides which events stay in order together, such as all events for one order.",
        ],
      ],
      [
        "edge-case",
        "What ordering does a partitioned log guarantee?",
        [
          "Order within a partition only, not across the whole log.",
          "So events that must stay in order need the same key, and land in the same partition.",
          "A retry from the producer can reorder events unless it's configured to prevent that.",
        ],
      ],
      [
        "edge-case",
        "A consumer reads a batch, processes half, and is killed. What happens?",
        [
          "Its position (offset) was last saved before the batch, so another consumer reads the whole batch again.",
          "The first half is processed twice: that's at-least-once delivery.",
          "So consumers must be idempotent: a repeat of the same event must change nothing.",
        ],
      ],
      [
        "decision",
        "How do you make a consumer safe against duplicates?",
        [
          "Record each event's ID as processed, in the same transaction as its effect.",
          "Or make the effect naturally repeatable: 'set status to shipped', not 'add one'.",
          "Then a redelivered event is skipped or harmless.",
        ],
      ],
      [
        "decision",
        "Why can't you just write to the database and then publish an event?",
        [
          "If the process dies between the two, the database has the change and nobody hears about it, or the reverse.",
          "The outbox pattern: write the event to a table in the same transaction as the change.",
          "A separate process publishes from that table, retrying until it succeeds.",
        ],
      ],
      [
        "alternative",
        "Why do services usually use sagas rather than two-phase commit?",
        [
          "Two-phase commit locks every participant until all agree, and blocks if the coordinator fails.",
          "A saga is a chain of local transactions, each with a compensating step if a later one fails.",
          "Sagas stay available, but the system is briefly in between states that others can see.",
        ],
      ],
      [
        "edge-case",
        "In a saga, why isn't a compensating action the same as a rollback?",
        [
          "The earlier step really happened and others may have seen it.",
          "Compensation is a new action that undoes the effect: a refund, not an erased charge.",
          "Some things can't be undone (an email sent), so order steps with those last.",
        ],
      ],
    ],
  ),
  topic(
    "topic-observability",
    "Observability",
    "Alerting on symptoms, the RED and USE methods, and what metrics, logs and traces are each for.",
    [
      [
        "decision",
        "Why alert on symptoms rather than causes?",
        [
          "Symptoms are what users feel: errors, latency, work not getting done.",
          "Causes (high CPU, a full disk) often don't hurt anyone, and the list of possible causes is endless.",
          "Page on symptoms; use cause metrics on dashboards to explain them.",
        ],
      ],
      [
        "edge-case",
        "A system degrades badly but returns no errors. Why is that worse than an outage?",
        [
          "Nothing alerts, so it can go on for hours: slow pages, stale data, jobs not running.",
          "Catch it with latency and freshness alerts, and the age of the oldest message in each queue.",
          "Synthetic checks that do a real action, such as placing a test order, catch the rest.",
        ],
      ],
      [
        "decision",
        "What are the RED and USE methods?",
        [
          "RED, for services: request rate, errors and duration.",
          "USE, for resources: utilisation, saturation and errors, for CPU, memory, disks and pools.",
          "Start with RED to see that users are hurting, then USE to find which resource is to blame.",
        ],
      ],
      [
        "tradeoff",
        "Metrics, logs and traces: what's each for?",
        [
          "Metrics: cheap numbers over time, for alerts and trends, but they can't tell you about one request.",
          "Logs: the detail of what happened, expensive at volume, so sample and structure them.",
          "Traces: one request's path across services, for finding which hop is slow.",
        ],
      ],
      [
        "edge-case",
        "What's cardinality in a metrics system, and why does it cause trouble?",
        [
          "The number of distinct label combinations a metric has.",
          "Labelling by user ID or request ID creates millions of series, which can crash or bankrupt the metrics system.",
          "Keep labels to small, fixed sets; put per-request detail in logs and traces.",
        ],
      ],
    ],
  ),
  topic(
    "topic-shipping",
    "Shipping safely",
    "Tests, deploys, canaries, rollbacks, feature flags, SLOs and rate-limiting algorithms.",
    [
      [
        "tradeoff",
        "Unit, integration and end-to-end tests: what does each prove?",
        [
          "Unit: one piece of logic is right, fast and precisely.",
          "Integration: the pieces work together, with a real database or queue.",
          "End-to-end: a user's journey works, slowly and with more flakiness. Have fewer of these.",
        ],
      ],
      [
        "decision",
        "How does a blue/green deployment work, and what doesn't it protect you from?",
        [
          "Run the new version alongside the old, then switch traffic over all at once.",
          "Rolling back is switching back, in seconds.",
          "It doesn't help with database changes both versions share, or a bug that only shows under real load.",
        ],
      ],
      [
        "decision",
        "How does a canary release work, and what must exist first?",
        [
          "Send a small share of traffic to the new version, compare its errors and latency, then widen.",
          "It needs good per-version metrics and an automatic rollback when they get worse.",
          "Without those, a canary is just a slower full release.",
        ],
      ],
      [
        "edge-case",
        "What makes a rollback impossible?",
        [
          "A database migration the old code can't work with, such as a dropped column.",
          "Data written in a new format the old version can't read.",
          "Fix it by making changes in steps: add, migrate, switch, and remove the old only later.",
        ],
      ],
      [
        "tradeoff",
        "What do feature flags buy, and what do they cost?",
        [
          "Deploy code switched off, then turn it on for some users, and off again instantly if it misbehaves.",
          "Every flag is a branch to test, and old flags pile up as hidden complexity.",
          "Give each flag an owner and a removal date.",
        ],
      ],
      [
        "decision",
        "How do you define an SLO that's useful?",
        [
          "Pick a measure users feel (the share of requests under 300ms), a target (99.9%), and a window (30 days).",
          "The gap to 100% is an error budget: spend it on releases, and slow down when it runs out.",
          "An SLO nobody acts on when it's breached is just a number.",
        ],
      ],
      [
        "decision",
        "How does rate limiting work underneath?",
        [
          "A token bucket: each caller's bucket refills at a steady rate; a request takes a token or is refused. It allows short bursts.",
          "A sliding window counts requests over the last minute, smoother and a little costlier.",
          "Across many servers, counters live in a shared fast store, or each server takes its share of the limit.",
        ],
      ],
    ],
  ),
  topic(
    "topic-apis",
    "Frontend and APIs",
    "API design, rendering strategies, gateways, and why the browser can't be trusted.",
    [
      [
        "decision",
        "What makes an API well designed?",
        [
          "Resources named as nouns, standard methods and status codes, and errors that say what to do next.",
          "Pagination on every list, and idempotency keys on writes that move money.",
          "Versioned, so changes don't break the apps people already have installed.",
        ],
      ],
      [
        "tradeoff",
        "Static, server-rendered or client-rendered pages?",
        [
          "Static: built once and served from a {cdn}, fastest and cheapest, but the same for everyone.",
          "Server-rendered: personal and fast to first view, but every page costs your servers work.",
          "Client-rendered: cheap for servers, but a slower first view and harder for search engines.",
        ],
      ],
      [
        "edge-case",
        "A team wants to move validation into the browser to reduce load on the API. What's wrong?",
        [
          "Anyone can send requests without the browser, so the server must validate everything anyway.",
          "Browser validation is for the user: quick feedback before they submit.",
          "It saves a few bad requests, not the checks.",
        ],
      ],
      [
        "edge-case",
        "Why is 'retry immediately on failure' more dangerous in a web app than in a server job?",
        [
          "There are millions of browsers. When the API struggles, they all retry at once and multiply the load.",
          "Back off with jitter in the client, and respect 'retry after' answers.",
          "Show the user what's happening instead of retrying silently forever.",
        ],
      ],
      [
        "tradeoff",
        "A {load-balancer} or an {api-gateway}, and when do you need both?",
        [
          "A load balancer spreads traffic across instances and checks their health.",
          "A gateway handles API concerns: sign-in, rate limits, routing to different services, request shaping.",
          "Many systems use a gateway at the edge and balancers in front of each service.",
        ],
      ],
      [
        "alternative",
        "What problem does a backend-for-frontend solve?",
        [
          "Each app (web, phone) gets its own thin API shaped for its screens.",
          "The phone gets one call per screen instead of ten, and teams change it without breaking others.",
          "The cost is more services to run, and logic that can drift between them.",
        ],
      ],
      [
        "decision",
        "Why ship frontend files with hashed names and long cache lifetimes?",
        [
          "A file's name changes whenever its content does, so it can be cached for a year safely.",
          "The small HTML page that points at them is cached briefly, so a release reaches everyone quickly.",
          "That makes the {cdn} serve almost every byte.",
        ],
      ],
      [
        "tradeoff",
        "REST, gRPC or GraphQL?",
        [
          "REST: simple, cacheable and universal. The default for public APIs.",
          "gRPC: compact and fast with strict schemas, good between your own services.",
          "GraphQL: clients ask for exactly the fields they need, at the cost of harder caching and protecting against expensive queries.",
        ],
      ],
      [
        "security",
        "OAuth, OpenID Connect and JWTs: what does each do?",
        [
          "OAuth lets an app act on a user's behalf with a limited token, without their password.",
          "OpenID Connect adds sign-in on top: a token that says who the user is.",
          "A JWT is just a signed token format. It can't be revoked before it expires, so keep its lifetime short.",
        ],
      ],
      [
        "security",
        "What does TLS protect, and what is mutual TLS for?",
        [
          "TLS encrypts traffic and proves the server is who it says it is.",
          "Mutual TLS also proves the client's identity with its own certificate.",
          "It's common between services, so only your own services can call each other.",
        ],
      ],
    ],
  ),
  topic(
    "topic-styles",
    "Architecture styles",
    "Monoliths and services, event sourcing, cells, serverless, and why more machines can make things slower.",
    [
      [
        "tradeoff",
        "When is a monolith the right answer?",
        [
          "For a small team or a new product: one thing to deploy, test and debug.",
          "Services pay off when teams get in each other's way, or parts need to scale very differently.",
          "A modular monolith, with clear boundaries inside, keeps the option to split later.",
        ],
        "What's the first sign a monolith should be split?",
      ],
      [
        "tradeoff",
        "What are CQRS and event sourcing, and what do they cost?",
        [
          "CQRS: separate models for writing and for reading, each shaped for its job.",
          "Event sourcing: store every change as an event, and build the current state by replaying them.",
          "They give a full history and flexible read models, at the cost of complexity and eventual consistency between them.",
        ],
      ],
      [
        "alternative",
        "What is a cell-based architecture?",
        [
          "Many complete copies of the system (cells), each serving a slice of customers.",
          "A failure or bad deploy hits one cell's customers, not everyone.",
          "It costs routing, and work to move customers between cells.",
        ],
      ],
      [
        "tradeoff",
        "When does serverless win, and when does it stop making sense?",
        [
          "Spiky or low traffic, and glue between services: you pay only when it runs.",
          "Cold starts add latency to the first request on each new copy.",
          "At steady high volume, always-on servers are usually cheaper.",
        ],
      ],
      [
        "decision",
        "What does Conway's Law mean for the architecture you propose?",
        [
          "Systems end up shaped like the teams that build them.",
          "Draw service boundaries where team boundaries are, or plan to change the teams.",
          "A design with five services for a team of three will be maintained as one.",
        ],
      ],
      [
        "tradeoff",
        "When should you denormalise data?",
        [
          "When a read joins many tables on every request and it's too slow.",
          "Store the joined result, at the cost of keeping copies in step when the source changes.",
          "Usually done through events, which makes the copy eventually consistent.",
        ],
      ],
      [
        "tradeoff",
        "Write-through, write-behind or write-around caching?",
        [
          "Write-through: write the cache and the database together. Reads are fresh; writes are slower.",
          "Write-behind: write the cache, save to the database later. Fast writes, but a crash loses them.",
          "Write-around: write only the database and let reads fill the cache. Simple, but the first read after a write misses.",
        ],
      ],
      [
        "alternative",
        "How does leaderless replication work?",
        [
          "Any copy accepts writes. A client writes to several and reads from several.",
          "If the copies written to and read from overlap, a read sees the latest write.",
          "Copies that missed a write are fixed when a read notices (read repair) or by a background sync.",
        ],
      ],
      [
        "scale",
        "Why can adding machines make a system slower?",
        [
          "Machines have to coordinate: locks, consensus and cache coherence grow with how many there are.",
          "Past a point, the coordination costs more than the extra machine adds.",
          "The fix is less sharing: partition the work so machines rarely need to talk.",
        ],
      ],
    ],
  ),
]
