/**
 * The check that unlocks each level's suggested solution. Ten questions per
 * scenario, each tied to the deck card that teaches it, so a wrong answer can
 * point at the card to study.
 *
 * Wrong options are written as the mistakes people actually make, at the same
 * level of detail as the right one: a test fails if "pick the longest" becomes
 * a reliable strategy. The UI shuffles option order on every attempt.
 *
 * Component names are `{kind}` tokens, as everywhere else.
 */
export type Question = {
  prompt: string
  correct: string
  wrong: [string, string, string]
  why: string
  /** Index of the supporting card in this level's deck. */
  card: number
}

type Row = [
  prompt: string,
  correct: string,
  wrong: [string, string, string],
  why: string,
  card: number,
]

const q = (rows: Row[]): Question[] =>
  rows.map(([prompt, correct, wrong, why, card]) => ({
    prompt,
    correct,
    wrong,
    why,
    card,
  }))

export const QUIZZES: Record<string, Question[]> = {
  "shoebox-receipts": q([
    [
      "Why do typed-in receipts and photographed receipts take different paths?",
      "Typed-in ones are a quick write; photos need slow, rate-limited OCR",
      [
        "Photos are larger, so they have to go through a different load balancer",
        "Typed-in receipts need human approval before they can be stored",
        "Photos must be processed first so they can be shown in the list",
      ],
      "Queue only the slow work. The fast path stays fast and the queue stays small.",
      5,
    ],
    [
      "Why do workers call the {doc-ai}, rather than the app servers?",
      "Workers can pace calls to stay inside the provider's quota",
      [
        "App servers aren't allowed to call external APIs directly",
        "The OCR service only accepts calls from inside a private network",
        "Workers run on GPUs, which OCR needs to read receipts",
      ],
      "A burst of users can't be paced; a queue and a worker pool can. A slow or throttled call never holds up a request.",
      6,
    ],
    [
      "Peak is 120 photo jobs a second and 180 on deadline day. Each OCR block handles 40 a second. How many blocks?",
      "Five, so deadline day runs at 90%",
      [
        "Three, which covers the normal peak exactly",
        "Four, which handles deadline day at 100%",
        "Ten, to be safe on any day of the year",
      ],
      "Three would fall 60 jobs a second behind on deadline day and never drain. Five keep up at 90%.",
      7,
    ],
    [
      "Amazon's receipt OCR API defaults to 5 calls a second in its largest regions. What does that mean for planning?",
      "Request a quota increase well before the deadline",
      [
        "Call it from more app servers to multiply the limit",
        "Switch region on deadline day to get a fresh quota",
        "Use a bigger instance type so each call is faster",
      ],
      "Quotas are per account and region, and increases need approving. Plan them like capacity, ahead of the peak.",
      13,
    ],
    [
      "OCR returns a low-confidence total for a receipt. What's the best behaviour?",
      "Highlight the field and ask the user to confirm it",
      [
        "Store it anyway, because users rarely check their receipts",
        "Discard the receipt and ask for a completely new photo",
        "Retry the OCR call until the confidence score goes up",
      ],
      "These figures go on a tax return. Accept confident fields, flag the rest, and require confirmation above a certain amount.",
      8,
    ],
    [
      "Where can OCR costs run away, given it's billed per page?",
      "Duplicate uploads, retried calls and long PDFs",
      [
        "Users viewing the same receipt many times",
        "Storing the extracted fields in the database",
        "Keeping the queue open when no jobs are waiting",
      ],
      "Hash images to skip exact duplicates before calling OCR, make retries idempotent, and cap pages per upload.",
      9,
    ],
    [
      "The OCR provider has an outage on deadline day. With this design, what happens?",
      "Uploads succeed; jobs wait in the queue until it recovers",
      [
        "Every upload fails until the provider is back online",
        "Photos are deleted so that users can upload them again",
        "The app falls back to storing receipts without photos",
      ],
      "The queue decouples upload from processing. Users who can't wait can type the fields in.",
      16,
    ],
    [
      "On deadline day the {sql-primary} reaches 96% on writes. Why so high?",
      "Each photo writes twice: a pending row, then the results",
      [
        "Readers run so many reports that writes slow down",
        "The queue writes every message to the database too",
        "Photos are stored inside the database as large blobs",
      ],
      "Write amplification: 200 receipts a second become 320 writes. Batch the result writes or partition by user.",
      14,
    ],
    [
      "The same receipt is uploaded twice. What should happen?",
      "Spot the duplicate and warn the user, without auto-merging",
      [
        "Merge them silently, since duplicates are always mistakes",
        "Reject the second upload with an error message",
        "Store both and let the tax authority sort it out",
      ],
      "Two identical coffees on one day are possible, so warn rather than merge. Skip the second OCR call on an exact image match.",
      15,
    ],
    [
      "What's the best single signal that the photo pipeline is falling behind?",
      "The age of the oldest job in the queue",
      [
        "CPU utilisation across the worker pool",
        "The number of receipts stored so far today",
        "The total size of the object store",
      ],
      "Age shows directly how long users wait. Watch OCR throttling responses and database write load next to it.",
      20,
    ],
  ]),

  "plug-finder": q([
    [
      "Why put a {cdn} in front of data that changes every few minutes?",
      "Many drivers ask about the same area within seconds",
      [
        "CDNs keep data fresher than an origin server does",
        "Map data has to be served from the edge by law",
        "The CDN stores check-ins until the app is ready for them",
      ],
      "A 30-second edge cache answers most map views, about 1,600 of 2,850 a second here, at the cost of brief staleness.",
      5,
    ],
    [
      "Without the {cdn}, what goes wrong first?",
      "The app tier and search index both pass 90% busy",
      [
        "DNS can't resolve the domain fast enough",
        "The key-value store runs out of storage space",
        "The event stream drops status-changed events",
      ],
      "p99 rises to about 2.5 seconds, and the road-trip spike fails nearly half of requests. Fifteen app servers break the budget and the index still overloads.",
      13,
    ],
    [
      "How should map views be keyed in a cache?",
      "By map tile or geohash cell plus filters",
      [
        "By the driver's exact latitude and longitude",
        "By the driver's user ID and session",
        "By the time of day, rounded to the minute",
      ],
      "Exact coordinates make every request unique, so nothing hits. Cells let nearby drivers share an answer.",
      14,
    ],
    [
      "Why does the {search-index} get status changes from an {event-stream}?",
      "So check-ins don't wait on updating the index",
      [
        "Search indexes can only be written by event streams",
        "The stream makes searches return results faster",
        "It lets the index skip storing charger locations",
      ],
      "The app publishes once; the index, notifications and analytics each consume it. A few seconds of index lag is fine because the detail fetch shows live status.",
      7,
    ],
    [
      "Why keep live charger status in a {nosql} store?",
      "It's a frequent lookup and update by station ID",
      [
        "Relational databases can't store a status field",
        "Key-value stores are the only ones a CDN can read",
        "It removes the need for the search index entirely",
      ],
      "Simple key lookups that scale horizontally. Users, accounts and moderation fit a relational store better.",
      6,
    ],
    [
      "How long should a crowd-reported 'in use' flag last?",
      "About one charging session, unless it's renewed",
      [
        "Forever, until the same driver clears it",
        "Exactly one minute, to keep the map fresh",
        "Until the next day's operator data arrives",
      ],
      "Forgotten check-outs otherwise make chargers look busy all day. Clear it early when an operator feed reports the charger free.",
      8,
    ],
    [
      "Operator feeds and driver reports disagree. What's the sensible approach?",
      "Combine both, weighted by freshness, and show the source",
      [
        "Always trust drivers, since they're standing at the charger",
        "Always trust operators and ignore driver reports",
        "Show whichever report arrived first",
      ],
      "Feeds are accurate where they exist; drivers catch what feeds miss, like a blocked bay. Show where each status came from.",
      9,
    ],
    [
      "Why not push every status change to every open app over websockets?",
      "Millions of idle connections cost far more than a short cache",
      [
        "Websockets can't carry location data",
        "Mobile phones block websocket connections",
        "Push updates are always slower than polling",
      ],
      "For a map that changes every few minutes, a 30-second cache is far cheaper. Push only for the station a driver is heading to.",
      10,
    ],
    [
      "How should the app learn about status from charging networks?",
      "Have operators push changes, as the OCPI protocol allows",
      [
        "Poll every charger every few seconds",
        "Scrape each network's website for updates",
        "Wait for drivers to report everything",
      ],
      "Polling hundreds of thousands of chargers is wasteful and slow. Push is fresher and cheaper, often via roaming hubs.",
      12,
    ],
    [
      "Which metric best measures whether the product is working?",
      "How often drivers find a charger shown as free already taken",
      [
        "Total number of map views per day",
        "Average CPU across the app tier",
        "Number of notes written per week",
      ],
      "That's the user's real experience. Track it by area and by data source.",
      21,
    ],
  ]),

  "first-customers": q([
    [
      "Peak is 500 requests a second and each {app-server} handles about 400. Why does the design use three instances rather than two?",
      "Two cope at peak, but once one fails the survivor faces 500 with 400 of capacity",
      [
        "Two instances can't serve 500 requests a second between them, even when both are healthy",
        "Three instances are needed so that there's one in each of three availability zones",
        "The database connection pool needs at least three clients to stay warm",
      ],
      "N+1: two instances are 63% busy at peak, but lose one and 400 of capacity faces 500 of traffic. Three survive losing one.",
      6,
    ],
    [
      "The {sql-primary} is only 20% busy. Why add a second instance?",
      "A single instance in one zone caps the whole system's availability below 99.9%",
      [
        "To double read capacity before peak traffic arrives, since reads are 80% of the load",
        "Because a single instance can't take backups while it's also serving traffic",
        "So that writes can be split evenly across both instances to halve their latency",
      ],
      "The problem is availability, not load. A standby in another zone puts the database in two failure domains.",
      8,
    ],
    [
      "Why is a standby the better fix here than a read replica?",
      "The risk is downtime, not load, and a standby exists for automatic failover",
      [
        "Read replicas can't be placed in a different availability zone from the primary",
        "A standby costs about half as much as a read replica of the same size",
        "A replica would add write capacity, which this system doesn't need yet",
      ],
      "Both cost the same. Only one addresses the actual risk: the database being a single point of failure.",
      7,
    ],
    [
      "What has to be true for the {app-server} tier to scale by adding instances?",
      "No request can depend on sessions or files held on one particular server",
      [
        "Every instance needs its own copy of the database so that they don't contend",
        "The load balancer must send each user back to the same instance every time",
        "Each instance must be placed in a different zone from all the others",
      ],
      "Stateless servers are interchangeable. Sessions live in a signed token or a shared store, and files in object storage.",
      5,
    ],
    [
      "What's the main downside of signed session tokens compared with a shared session store?",
      "You can't easily revoke a signed token before its expiry time runs out",
      [
        "Every request has to look the token up in the database, which adds latency",
        "They put another component on the critical path that must stay available",
        "They only work when there's a single app server, because the key lives in memory",
      ],
      "Tokens need nothing extra to run, but instant logout is hard. Short-lived tokens plus revocable refresh tokens are the usual compromise.",
      9,
    ],
    [
      "Should this design have a {cache}?",
      "Not yet: the database is at 20% busy and latency is already within target",
      [
        "Yes, because every production system should have a cache in front of its database",
        "Yes, because a cache would make the database standby unnecessary",
        "No, because caches can't sit in front of relational databases safely",
      ],
      "A cache adds staleness and something else to run. Name the signal that would change your mind: database saturation or latency over target.",
      11,
    ],
    [
      "Traffic grows 10×. Which part is hardest to scale?",
      "Database writes, because one primary takes every write however many replicas exist",
      [
        "The app tier, because each new instance needs its own licence and configuration",
        "The load balancer, because it's a single component that can't be scaled out",
        "Database reads, because read replicas can only be added during maintenance windows",
      ],
      "App servers scale by adding instances; reads by caches or replicas. Writes need sharding, which is the hard one.",
      14,
    ],
    [
      "If one database stops being enough, what's a natural shard key for a multi-tenant helpdesk?",
      "The tenant, meaning the customer company that owns the tickets",
      [
        "The ticket's creation date, so recent tickets sit together on the newest shard",
        "The agent's name, so each agent's queue stays on one shard",
        "A random number per ticket, so load spreads perfectly evenly",
      ],
      "Tickets rarely cross tenants, so most queries stay on one shard. Watch for one huge tenant outgrowing its shard.",
      15,
    ],
    [
      "The database fails over mid-save and the client retries. How do you stop the reply posting twice?",
      "Send an idempotency key with each save so the server spots a repeat",
      [
        "Turn off client retries entirely, so a failed save is never repeated",
        "Lock the ticket for a minute after every save to block duplicates",
        "Send retries only to the standby, which knows which writes it has seen",
      ],
      "Retries with backoff hide failover from users, but only if the operation is safe to repeat.",
      17,
    ],
    [
      "Which of these should page someone at 3am?",
      "Error rate stuck above target for several minutes running",
      [
        "One app instance crashed and was automatically replaced by a new one",
        "Database CPU rose from 20% to 30% during the evening batch",
        "A deploy finished and every health check passed afterwards",
      ],
      "Page on symptoms users feel. The design absorbs one instance dying, so that's a ticket, not a page.",
      22,
    ],
  ]),

  "front-page": q([
    [
      "Before adding a cache, what's the most important thing to find out about the read traffic?",
      "Whether most reads ask for the same small set of articles",
      [
        "Which programming language the app is written in, since some can't use caches",
        "How many app servers there are, since each needs its own cache node",
        "Whether the database is relational, since caches only work with key-value stores",
      ],
      "A cache only helps shared, hot data. If every reader reads different things, the hit rate is poor.",
      0,
    ],
    [
      "The feed is personalised. Why does the cache sit between the app and the database?",
      "Each page is personal, but the articles inside it are shared",
      [
        "Caches can't be placed in front of app servers, only in front of databases",
        "It's what makes the database faster at taking comments and likes",
        "Personalised pages cache better than individual articles do",
      ],
      "Cache the shared data (articles), not the per-user page. Each feed is assembled from cached parts: cache-aside.",
      5,
    ],
    [
      "One {cache} node handles 50,000 reads a second, far more than needed. Why run two?",
      "So one node restarting cold doesn't send every read to the database",
      [
        "Two nodes double the hit rate, because each holds a different half of the articles",
        "Cache nodes must always run in pairs for their data to be consistent",
        "So writes can go to one node and reads to the other without contention",
      ],
      "A cold cache passes all 2,850 reads a second to a database that tops out near 2,000. The second node stays warm.",
      6,
    ],
    [
      "An editor fixes a typo. What's the safest way to update the cache?",
      "Delete its cache key on publish, with a TTL as a safety backstop",
      [
        "Leave it alone and let the TTL expire, which is what TTLs are for",
        "Have the app overwrite the cached value in place as soon as it saves",
        "Restart the cache cluster so that every key is rebuilt from scratch",
      ],
      "Delete-on-write avoids serving stale content; the TTL catches any missed invalidation. Versioned keys avoid races.",
      7,
    ],
    [
      "Why does a cache beat read replicas for this workload?",
      "For hot, shared data it absorbs far more reads per dollar spent",
      [
        "Read replicas can't serve personalised feeds, because they don't store users",
        "Read replicas are never consistent with the primary, even after a few seconds",
        "A cache can also absorb the writes, which replicas can't",
      ],
      "A replica takes about 2,000 reads a second for $120; a cache node 50,000 for $25. Replicas win for arbitrary queries, not hot shared data.",
      8,
    ],
    [
      "What is a cache stampede?",
      "A popular key expires and thousands of requests all miss at the same moment",
      [
        "The cache filling up and evicting old keys faster than they can be reused",
        "Too many writes arriving at the cache, so it falls behind the database",
        "Readers refreshing the page repeatedly when a story first breaks",
      ],
      "Fix it with request coalescing (one refill, others wait), early refresh, or jittered TTLs.",
      14,
    ],
    [
      "A reader posts a comment and doesn't see it on refresh. What's the likely cause?",
      "Their refresh read a cached copy taken before their comment was saved",
      [
        "The comment failed to save, and the error was hidden from the reader",
        "A database replica is down, so the comment went nowhere",
        "The browser blocked the request because the page was cached locally",
      ],
      "Read-your-writes: return the comment in the write response, or invalidate that article's comment list on write.",
      15,
    ],
    [
      "What's the biggest security risk of caching on a personalised site?",
      "One user's personal response cached under a key other users can hit",
      [
        "Caches can't be encrypted, so anyone on the network can read their contents",
        "Cache keys are visible in the URL, which leaks article IDs to attackers",
        "Caches slow down authentication because every login has to bypass them",
      ],
      "Cache keys must include everything a response depends on. Never cache responses with session cookies at a shared layer.",
      18,
    ],
    [
      "The cache's hit rate drops sharply. What does that most likely mean?",
      "Keys are expiring or being evicted too soon, or reading patterns changed",
      [
        "The database has become faster, so the cache is being bypassed",
        "The app tier has crashed, so fewer requests reach the cache",
        "Writes have stopped, so nothing is refreshing the cache",
      ],
      "Watch hit rate alongside evictions and database read rate: the database's load is the real measure.",
      20,
    ],
    [
      "During a huge spike, which is the best thing to degrade?",
      "Personalisation, falling back to one shared top-stories list",
      [
        "The article body, replaced by a summary until the spike passes",
        "User logins, so that only anonymous traffic needs to be served",
        "Saving comments, so that the database only has to serve reads",
      ],
      "A shared list caches perfectly and keeps the core product working. Protect the article itself.",
      4,
    ],
  ]),

  "going-viral": q([
    [
      "Why does no component in this design run your own code?",
      "Serving static files needs no logic, so storage plus an edge cache is enough",
      [
        "Serverless functions aren't allowed to read from object storage directly",
        "The CDN runs your application code at each edge location instead",
        "App servers can't read files from object storage without a database in between",
      ],
      "50 app servers just to pass files through would cost $1,500 a month, against a $100 budget.",
      4,
    ],
    [
      "How long should the {cdn} cache these images?",
      "For a very long time, treating every image URL as immutable content",
      [
        "A few seconds, so that edited images appear everywhere almost immediately",
        "Not at all, because images on a meme site change too often to cache",
        "Exactly one hour, because that's the safe default most CDNs recommend",
      ],
      "If a URL's content never changes, cache it for a year. To change an image, upload it under a new URL.",
      5,
    ],
    [
      "How should users' uploads reach the {object-store}?",
      "Straight from the browser, using a short-lived pre-signed upload URL",
      [
        "Through the CDN to a pool of app servers that write them to storage",
        "Through a load balancer onto a queue, which workers then copy to storage",
        "Through the API, which streams each file to storage as it arrives",
      ],
      "Your servers never handle the bytes. The signed policy can limit size and type.",
      6,
    ],
    [
      "Traffic grows from 20,000 to 200,000 requests a second. What breaks first?",
      "The origin, because cache misses grow in step with total traffic",
      [
        "The CDN, because edge locations can only serve a fixed number of requests",
        "DNS, because every request needs a fresh lookup at that volume",
        "Nothing, because a CDN absorbs any amount of traffic for any origin",
      ],
      "10% misses of 200,000 is 20,000 a second against a 5,000 origin. An origin shield collapses repeated misses.",
      11,
    ],
    [
      "What usually dominates the bill for a viral image site?",
      "Bandwidth, which is requests per second times average image size",
      [
        "DNS lookups, because every viewer resolves the domain on every request",
        "Object storage capacity, because every upload is kept forever",
        "CDN compute time, because edges charge per request processed",
      ],
      "20,000 requests a second at 200KB is about 4GB a second. Smaller formats and sizes are the biggest lever.",
      12,
    ],
    [
      "An image must be taken down for legal reasons. What's true?",
      "Delete it and purge the CDN, knowing copies elsewhere are out of reach",
      [
        "Deleting it from object storage removes it from every edge location instantly",
        "It can't be removed until its CDN TTL expires, however long that is",
        "Only the CDN provider can remove it, after a formal legal request",
      ],
      "Purges reach every edge in seconds to minutes. Be honest about what you can't recall.",
      13,
    ],
    [
      "Someone requests millions of images that don't exist. Why is that a problem?",
      "Each one misses the CDN and lands on the origin store",
      [
        "The CDN provider will suspend the account for abuse",
        "Missing images fill the cache and push out the real ones",
        "It isn't: 404 responses are tiny and cost nothing to serve",
      ],
      "A cheap way to attack an origin. Cache 404s briefly, rate-limit at the edge, use unguessable URLs.",
      15,
    ],
    [
      "How is a CDN also a security component?",
      "It soaks up traffic floods and keeps your origin hidden",
      [
        "It encrypts every image at rest at each edge location",
        "It authenticates each user before serving them any image",
        "It scans uploads for malware before they reach storage",
      ],
      "Lock the bucket so only the CDN can read it, and run a web application firewall at the edge.",
      18,
    ],
    [
      "Which metric best predicts this design falling over?",
      "The CDN hit ratio, since origin load is what gives way",
      [
        "Uploads per day, because storage fills up and slows down",
        "DNS query latency, because slow lookups delay every image",
        "Total storage used, because the origin slows as it fills",
      ],
      "A falling hit ratio means more requests reach an origin built for a fraction of the traffic.",
      19,
    ],
    [
      "When would you resize images on request at the edge instead of on upload?",
      "When you need many sizes on demand and can live with a slow first view",
      [
        "Never: resizing on request is always slower for every viewer",
        "When you need costs to be completely predictable month to month",
        "When images are private, because edge resizing adds access control",
      ],
      "On upload is predictable; on request offers any size, cached after the first view. Many sites mix both.",
      10,
    ],
  ]),

  "upload-rush": q([
    [
      "Why must the resize leave the request path?",
      "It takes seconds of CPU per photo, and the user doesn't need to wait for it",
      [
        "Because a queue makes each resize run faster than it would on an app server",
        "Because app servers can't load image-processing libraries safely",
        "Because the database can't store resized images alongside the metadata",
      ],
      "Inline, no number of servers meets a 300ms target. Queued, the request returns immediately.",
      4,
    ],
    [
      "300 uploads a second, 50 jobs a second per worker. How many workers would you run?",
      "Eight, which leaves headroom to lose one",
      [
        "Six, which is exactly enough to match the arrival rate",
        "Three, because only half the traffic is uploads",
        "Fifty, so each worker handles about six jobs a second",
      ],
      "Six would be 100% busy with no headroom. Eight run at 75% and survive losing one (seven at 86%).",
      5,
    ],
    [
      "Why is CPU a poor autoscaling signal for queue workers?",
      "Queue backlog shows whether work keeps up, which CPU usage can't tell you",
      [
        "Workers spend most of their time waiting, so CPU is always near zero",
        "Cloud providers don't report CPU metrics for queue consumers",
        "Scaling on CPU is far more expensive than scaling on anything else",
      ],
      "Workers can be busy and still falling behind. Scale on queue depth or the age of the oldest message.",
      19,
    ],
    [
      "A resize job runs twice. Is that a problem?",
      "Not if each run writes the same output to the same fixed storage key",
      [
        "Yes: queues guarantee exactly-once delivery, so a repeat means a bug",
        "Yes: running a resize twice always corrupts the stored image",
        "No: modern queues never deliver the same message twice",
      ],
      "At-least-once delivery means consumers must be idempotent. Side effects like payments need more care.",
      8,
    ],
    [
      "A corrupt image crashes the worker every time. What should happen?",
      "A few retries, then move it to a dead-letter queue",
      [
        "Keep retrying it until a worker manages to process it",
        "Purge the whole queue so the bad message disappears",
        "Restart every worker so the message is picked up fresh",
      ],
      "A poison message must not block the pipeline. Mark the photo as failed and tell the user.",
      14,
    ],
    [
      "The upload succeeds but enqueueing the job fails. How do you make that impossible?",
      "Record the job in the same database transaction and relay it later",
      [
        "Enqueue the job first, and only then save the upload's metadata",
        "Retry enqueueing three times before reporting success to the user",
        "Switch to a larger queue tier with a higher availability guarantee",
      ],
      "The outbox pattern, or triggering processing from the object store's own 'object created' event.",
      15,
    ],
    [
      "Where should each kind of data live?",
      "Photo bytes in object storage and their metadata in the database",
      [
        "Everything in the database, so that one backup covers it all",
        "Photo bytes in the queue, and metadata in object storage",
        "Photo bytes in the database, and jobs in object storage",
      ],
      "Each store fits its data: cheap durable blobs, queryable metadata, and transient jobs in the queue.",
      6,
    ],
    [
      "What do you give up by making processing asynchronous?",
      "An immediate final result, and simple reporting of processing errors",
      [
        "Durability: an uploaded photo can now be lost if a worker crashes",
        "The ability to scale processing independently of the app tier",
        "Privacy: photos become readable by every worker in the pool",
      ],
      "You need a 'processing' state, and a way to report failures after the request has succeeded.",
      7,
    ],
    [
      "What's a key security risk of processing user-uploaded images?",
      "A deliberately crafted file exploiting a flaw in the image decoder",
      [
        "Images are too large to scan, so they can't be checked at all",
        "Resized copies leak the original's full resolution to viewers",
        "The queue exposes every image publicly while it waits",
      ],
      "Run workers with minimal permissions, isolated. Strip location metadata before publishing.",
      17,
    ],
    [
      "A burst of 3,000 uploads a second for ten minutes hits eight workers. What happens?",
      "The queue grows to over a million jobs and takes about an hour to drain",
      [
        "Uploads start failing as soon as the workers are saturated",
        "The workers process the burst at their usual speed with no delay",
        "The queue rejects new messages once it reaches a million",
      ],
      "About 1.6 million jobs queue up. Delay is the cost; autoscale on depth, and tell users it may be slow.",
      13,
    ],
  ]),

  "zone-outage": q([
    [
      "With two zones, why must each zone carry the whole peak?",
      "Lose one zone and the survivors in the other must carry all of it",
      [
        "Because instances are shared between zones and move when one fails",
        "Because the load balancer only ever routes to one zone at a time",
        "Because each zone serves users in a different geographic region",
      ],
      "Eight instances, four per zone: after an outage, four carry 1,500 a second at about 94%.",
      5,
    ],
    [
      "Why is it acceptable to leave the {cache} in one zone?",
      "Losing it only degrades things: the database can absorb the reads",
      [
        "Caches never fail in practice, so redundancy isn't needed",
        "Caches replicate themselves across zones automatically",
        "The cache isn't on the request path, so it doesn't count",
      ],
      "The database takes all 1,350 reads at about 68%. This holds only while the database can absorb a cold cache.",
      6,
    ],
    [
      "For payments data, which replication to the standby fits best?",
      "Synchronous replication to a standby in the same region",
      [
        "Asynchronous to another region, for the lowest write latency",
        "None: nightly backups protect payments data well enough",
        "Synchronous to another region, for zero loss in a region outage",
      ],
      "Synchronous adds a millisecond or two in-region and protects confirmed writes on failover.",
      7,
    ],
    [
      "Three zones instead of two: what's the main benefit?",
      "Each zone only needs to carry half the peak after a loss",
      [
        "Three zones are always cheaper to run than two, whatever the size",
        "With three zones, the database no longer needs a standby",
        "Three zones let the system survive a whole-region outage",
      ],
      "Two zones need 2× capacity; three need 1.5×. The saving matters once a tier is large.",
      8,
    ],
    [
      "What is split brain?",
      "Two primaries both accepting writes, so their data drifts apart",
      [
        "A database whose data is split evenly across two zones",
        "Two app servers holding copies of the same user's session",
        "A cache holding two different values for the same key",
      ],
      "Prevented by fencing the old primary before promotion. Managed failover handles this for you.",
      15,
    ],
    [
      "Why can a slow zone be worse than a dead one?",
      "Health checks may still pass, so traffic keeps flowing to it",
      [
        "Slow zones lose data, while dead zones keep it safe",
        "Providers never report slowness, only full outages",
        "A slow zone always triggers split brain in the database",
      ],
      "Gray failures need latency-aware health checks, timeouts and outlier ejection.",
      16,
    ],
    [
      "A refund request times out during failover and the client retries. What prevents a double refund?",
      "An idempotency key the server checks before repeating it",
      [
        "Disabling client retries for any request that moves money",
        "Switching to asynchronous replication during failovers",
        "Routing refunds only to the zone that's still healthy",
      ],
      "The server refuses to repeat a completed operation. Any operation that moves money must be safe to retry.",
      17,
    ],
    [
      "The availability target is 99.95% a month. Roughly how much downtime is that?",
      "About 22 minutes",
      ["About 4 hours", "About 4 minutes", "About 43 minutes"],
      "99.9% is about 43 minutes a month; 99.95% about 22; 99.99% about 4.",
      0,
    ],
    [
      "Why would you not go multi-region for this level's requirement?",
      "The requirement is only to survive losing a single zone",
      [
        "Because relational databases can't replicate between regions",
        "Because multi-region always adds seconds to every request",
        "Because payments regulations forbid storing data in two regions",
      ],
      "Multi-region adds cross-region replication, conflict handling and double infrastructure. Agree the failure scope first.",
      11,
    ],
    [
      "How do you prove the design really survives a zone loss?",
      "Fail a zone on purpose in a test and measure the result",
      [
        "Check that the provider's SLA covers zone outages",
        "Review the architecture diagram with the whole team",
        "Wait for the next real outage and see what happens",
      ],
      "Chaos tests and game days measure real failover time and data loss against the targets.",
      21,
    ],
  ]),

  "feed-the-analysts": q([
    [
      "Search and the warehouse both need every order. Why use an {event-stream} rather than a {queue}?",
      "A queue hands each message to only one of its consumers",
      [
        "Queues are too slow to keep up with 320 orders a second",
        "Event streams are cheaper to run than queues at this volume",
        "Queues can only hold one message at a time per consumer",
      ],
      "With a queue the two systems would split the orders. A stream gives each consumer group every event, and keeps history.",
      4,
    ],
    [
      "Why must the {data-warehouse} stay off the checkout path?",
      "It takes seconds to answer even a small query",
      [
        "It has no way to store order data in its tables",
        "It's eventually consistent, so it may lose orders",
        "It charges per query, so checkout would get expensive",
      ],
      "Synchronously, checkout would wait on it and fail when it's busy. Asynchronously it ingests 320 events a second easily.",
      5,
    ],
    [
      "Which partition key keeps an order's events in sequence?",
      "The order ID, so each order's events share a partition",
      [
        "A random key, so events spread evenly across partitions",
        "The event's timestamp, so events sort by time",
        "The consumer's name, so each consumer owns a partition",
      ],
      "Ordering holds only within a partition. Avoid keys with a few huge values that create hot partitions.",
      6,
    ],
    [
      "The app writes the order to the database and publishes an event. What's the risk?",
      "One of the two writes succeeds and the other fails",
      [
        "The event can arrive at consumers before the order exists",
        "Publishing events makes the database noticeably slower",
        "The stream can overwrite the order in the database",
      ],
      "The dual-write problem. Fix with an outbox table in the same transaction, or change data capture.",
      7,
    ],
    [
      "What's a key advantage of change data capture over publishing events from app code?",
      "It can't miss a write the database has committed",
      [
        "Its events carry more business meaning than app events",
        "It removes the need for an event stream altogether",
        "It makes search strongly consistent with the database",
      ],
      "CDC reads the database's own log and needs no app changes. App events express intent better; many teams use CDC from an outbox.",
      10,
    ],
    [
      "A customer can't find an order they placed a second ago in 'my orders'. Best fix?",
      "Serve the 'my orders' page from the database itself",
      [
        "Make the search index update synchronously at checkout",
        "Add more search nodes so indexing keeps up faster",
        "Delay the confirmation page until search has the order",
      ],
      "Choose the authoritative source per feature. Search can lag; a user's own orders shouldn't.",
      3,
    ],
    [
      "One consumer falls hours behind. What's the impact on checkout?",
      "None: checkout never waits on any consumer",
      [
        "Checkout slows down until the consumer catches up",
        "New orders are rejected until the consumer catches up",
        "The other consumers fall behind at the same rate",
      ],
      "Consumers are isolated from the producer: that's the point of the stream. The lagging one must catch up within retention.",
      13,
    ],
    [
      "You indexed orders wrongly for a day. How do you repair search?",
      "Fix the consumer, then replay the stream from before the bug",
      [
        "Delete the stream and recreate it from scratch",
        "Wait for new orders to overwrite the bad ones",
        "Copy the warehouse's tables into the search index",
      ],
      "Replay works because the stream keeps history. If retention is too short, rebuild from the database.",
      15,
    ],
    [
      "Is exactly-once processing needed for the search index?",
      "No, because indexing the same order twice gives the same result",
      [
        "Yes: any duplicate event corrupts the search index",
        "Yes: event streams refuse consumers that aren't exactly-once",
        "No: but only because search engines drop all duplicates",
      ],
      "Idempotent consumers make at-least-once safe. Warehouse loads still need deduplication on order ID.",
      9,
    ],
    [
      "Finance says warehouse revenue doesn't match the database. Best first step?",
      "Reconcile hourly counts and sums in both systems",
      [
        "Rebuild the warehouse from the database overnight",
        "Switch the pipeline back to a queue",
        "Increase the stream's retention period",
      ],
      "Compare counts and sums per hour, look for dropped or duplicated events in that window, and schedule the check.",
      20,
    ],
  ]),

  "lost-writes": q([
    [
      "Customers' edits vanish but nothing errors. What was the app's only database connection pointing at?",
      "A read replica of the database",
      [
        "The primary, which had run out of disk space",
        "A cache with a very short TTL",
        "A standby in another availability zone",
      ],
      "A replica can't accept writes, so they had nowhere to go. Silent failures are the most dangerous kind.",
      4,
    ],
    [
      "Before any theory, what should you ask first in an incident like this?",
      "What changed just before the problem started?",
      [
        "Which database vendor and version are we running?",
        "How many app servers are running right now?",
        "Is the CDN warm, and what's its hit rate?",
      ],
      "Most incidents follow a change: a deploy, config change or migration. It narrows the search fastest.",
      0,
    ],
    [
      "At 600 requests a second, what's the simplest correct fix?",
      "Point every read and write at the primary",
      [
        "Add two more read replicas to spread the load",
        "Put a cache in front of the read replica",
        "Promote the read replica to be the new primary",
      ],
      "The primary easily takes all of it, with no replication lag. A read/write split is fine but not needed.",
      5,
    ],
    [
      "After splitting reads and writes, what new problem appears?",
      "Reads can return a copy slightly behind the latest write",
      [
        "Every write now takes twice as long to complete",
        "The primary can no longer serve any reads at all",
        "Every row is stored twice, permanently, at double the cost",
      ],
      "Replication lag. Fix with read-your-writes: read from the primary briefly after a user writes.",
      7,
    ],
    [
      "Which change makes writing to a replica impossible rather than unlikely?",
      "Give the replica connection read-only credentials",
      [
        "A code comment warning developers not to do it",
        "A longer TTL on the replica's connection settings",
        "Adding more replicas so that writes spread out",
      ],
      "Least privilege turns silent loss into a loud error, and limits what a compromised component can do.",
      15,
    ],
    [
      "Which metric would have caught this on day one?",
      "Writes per second on the primary dropping to zero",
      [
        "CPU utilisation on the read replica",
        "The number of app servers running",
        "Cache hit rate across the cluster",
      ],
      "Also a synthetic check that writes and reads back. A metric going to zero is easy to miss without an alert.",
      16,
    ],
    [
      "The primary fails and an async replica is promoted. What happens to the last writes?",
      "Any writes that hadn't replicated yet are lost",
      [
        "They're always preserved by the replication protocol",
        "They're replayed automatically from the application cache",
        "They're moved to the new primary during promotion",
      ],
      "Writes that hadn't replicated yet are gone. That gap is the RPO; synchronous replication brings it to zero.",
      14,
    ],
    [
      "What should a blameless postmortem focus on?",
      "Why the system allowed it, and why monitoring missed it",
      [
        "Who deployed the change and why they skipped review",
        "Whether the database vendor is reliable enough",
        "How much the outage cost the responsible team",
      ],
      "Timeline, why monitoring missed it, and action items with owners. Blame hides the systemic fix.",
      17,
    ],
    [
      "How can product design reduce the damage of a failed save?",
      "Keep drafts on the device and make failed saves visible",
      [
        "Always show 'saved' immediately so the app feels fast",
        "Hide save errors so users aren't alarmed by them",
        "Disable editing entirely during busy periods",
      ],
      "Optimistic UI is fine only if failure is visible and nothing typed is lost.",
      19,
    ],
    [
      "Is this a durability, consistency or display problem?",
      "Durability: the writes were never stored anywhere",
      [
        "Consistency: the edits are stored, but readers see old copies",
        "Display: the edits are stored, but rendered wrongly",
        "Availability: the system was down while users saved",
      ],
      "The writes were never stored. Classifying first points you at the right evidence: is the edit in the primary at all?",
      2,
    ],
  ]),

  "black-friday": q([
    [
      "Ten app servers and checkout still times out. What's the first thing to check?",
      "Which component is actually saturated, tier by tier",
      [
        "Whether ten more app servers make the timeouts go away",
        "The CDN's cache hit rate for product images",
        "How many shoppers are logged in right now",
      ],
      "Scaling anything but the bottleneck adds cost. Here the database was over 100%; the app tier was at 63%.",
      4,
    ],
    [
      "Why is a {cache} the right fix rather than a bigger database?",
      "Every shopper sees the same catalogue, so it caches almost perfectly",
      [
        "A bigger database can't serve more reads, only more writes",
        "A cache also makes order writes faster during the sale",
        "Databases can't be resized once they're in production",
      ],
      "It caches almost perfectly: a $25 cache absorbs about 1,800 reads a second, with no risky migration mid-sale.",
      5,
    ],
    [
      "Cached stock levels can be stale. How do you avoid overselling?",
      "Check and decrement stock in the database at checkout",
      [
        "Set the cache TTL to zero for every product",
        "Remove stock levels from product pages entirely",
        "Only cache stock levels for the most popular items",
      ],
      "Show cached stock as a guide; decrement it transactionally in the database at the moment of purchase.",
      7,
    ],
    [
      "During the sale, which features should you switch off first?",
      "Recommendations, reviews and similar extras",
      [
        "Checkout, until the database recovers",
        "Product search, since it's the heaviest query",
        "Basket updates, since they're all writes",
      ],
      "Protect the path to paying. Feature flags make this a switch, not a deploy.",
      3,
    ],
    [
      "Timeouts cause retries, which add load, which cause more timeouts. What breaks the spiral?",
      "Backoff with jitter, retry budgets and circuit breakers",
      [
        "Retrying immediately, so requests finish sooner",
        "Doubling every timeout across the whole system",
        "Removing the load balancer to cut out a hop",
      ],
      "Retries must back off with jitter and be capped, and circuit breakers should fail fast instead of piling on.",
      16,
    ],
    [
      "With the cache in place, what's the next bottleneck?",
      "Database writes, since every order still goes to one primary",
      [
        "Cache reads, as hot keys concentrate on one node",
        "The load balancer, as connections pile up",
        "DNS lookups, as shoppers arrive from new networks",
      ],
      "Orders and baskets all go to one primary, now at 50%. Long term: partition or use a store that scales writes.",
      13,
    ],
    [
      "The single cache node restarts mid-sale. What happens?",
      "Every read falls through and swamps the database again",
      [
        "Nothing much: the database was never the problem",
        "App servers keep serving stale data from memory",
        "Every shopper is logged out and must sign in again",
      ],
      "Run two nodes, coalesce misses and warm the cache before the sale.",
      14,
    ],
    [
      "How could you have known in advance the database would fall over?",
      "Load test at the forecast peak before the sale",
      [
        "Ask the database vendor what limits to expect",
        "Wait for the first slow request and react",
        "Count the app servers and multiply by ten",
      ],
      "Capacity planning: forecast traffic × reads per request, and find the component with the least headroom.",
      12,
    ],
    [
      "When is a waiting room for shoppers the right call?",
      "When demand outstrips capacity even after fixes",
      [
        "Never, because every shopper turned away is a lost sale",
        "Whenever traffic doubles compared with a normal day",
        "Only for shoppers who aren't logged in",
      ],
      "A fair queue beats random failures for everyone. Common for limited drops and ticket sales.",
      11,
    ],
    [
      "Bots hammer the site during the sale. Why does blocking them matter beyond fairness?",
      "Bot traffic is load, so blocking it frees real capacity",
      [
        "Bots can't complete purchases, so they're harmless otherwise",
        "Bots only ever read from the CDN, never the origin",
        "Bot requests make the cache contents stale",
      ],
      "Blocking them frees capacity. Rate limits, bot detection and purchase limits protect stock and capacity at once.",
      17,
    ],
  ]),

  "slow-checkout": q([
    [
      "Checkout takes two seconds. What's the fastest way to find where the time goes?",
      "A trace showing how long each step of checkout takes",
      [
        "Reading the checkout code and guessing which part is slow",
        "Adding more app servers to see whether it improves",
        "Checking the database's disk usage and free space",
      ],
      "A trace shows time per step and the long span directly. Here it was PDF rendering inside every checkout.",
      0,
    ],
    [
      "Which checkout steps must finish before 'order confirmed'?",
      "Taking payment and recording the order itself",
      [
        "Generating the PDF invoice for the customer",
        "Sending the order confirmation email",
        "Updating the analytics warehouse with the sale",
      ],
      "Separate 'must happen now' from 'must happen eventually'. The rest can follow asynchronously.",
      2,
    ],
    [
      "Why does moving PDFs to a queue let the app tier shrink from six instances to three?",
      "Rendering PDFs inline was using most of its CPU",
      [
        "Queues make each app server process requests faster",
        "The database takes over the rendering work instead",
        "Fewer customers check out once invoices are delayed",
      ],
      "Each inline render cost about 20 requests' worth of CPU. The work moves to workers sized for it.",
      5,
    ],
    [
      "120 orders a second, 50 renders a second per worker. How many workers?",
      "Four, so three can still keep up if one dies",
      [
        "Two, since 120 divided by 50 rounds down to two",
        "Twelve, one for every ten orders a second",
        "One, since invoices are asynchronous anyway",
      ],
      "2.4 at 100% is the minimum. Four run at 60%; three still keep up at 80% if one dies.",
      6,
    ],
    [
      "A job runs twice and the customer gets two invoices. What prevents that?",
      "One invoice number per order, checked before rendering",
      [
        "A larger queue with a longer visibility timeout",
        "Turning off retries for invoice jobs",
        "Making the PDF render fast enough to never time out",
      ],
      "Idempotent jobs: check whether the order's invoice exists, and store it under a fixed key.",
      15,
    ],
    [
      "The order is refunded before its invoice is rendered. What should the worker do?",
      "Check the order's current state before rendering anything",
      [
        "Render the invoice anyway, since the job was queued",
        "Delete the order so the job has nothing to render",
        "Retry the job until the refund is reversed",
      ],
      "Async systems must expect the world to change between enqueue and processing.",
      14,
    ],
    [
      "Does adding a queue make checkout less available?",
      "Slightly, unless the job is saved via an outbox",
      [
        "No, because managed queues never fail",
        "Yes, it roughly halves checkout's availability",
        "Yes, so you should run two queues in parallel",
      ],
      "Managed queues are very available. Writing the job in the order transaction removes the dependency entirely.",
      9,
    ],
    [
      "An invoice job keeps failing. What should happen to it?",
      "Retries, then a dead-letter queue and an alert",
      [
        "Keep retrying it forever until it eventually works",
        "Drop it silently so it doesn't block other jobs",
        "Block new orders until that invoice succeeds",
      ],
      "Mark the invoice as failed on the order, and have a tool to retry it once fixed.",
      13,
    ],
    [
      "How should invoice PDFs be served?",
      "Signed, short-lived links issued after an ownership check",
      [
        "Public URLs containing the order number",
        "Embedded in the order page on every load",
        "Read directly from the queue on request",
      ],
      "Invoices hold names, addresses and amounts. Never grant access via guessable URLs.",
      16,
    ],
    [
      "Once invoices are async, which check catches silent failures?",
      "Find orders with no invoice after an hour",
      [
        "CPU utilisation across the app tier",
        "The number of messages sent to the queue",
        "Checkout's p99 latency",
      ],
      "Reconciliation finds what retries and alerts miss. Track order-to-invoice time as a percentile too.",
      18,
    ],
  ]),

  "three-am-page": q([
    [
      "The app tier spans three zones. Why did a zone outage still take everything down?",
      "The only database instance sat in that zone",
      [
        "The load balancer was deployed in a single zone",
        "Three zones isn't enough to survive an outage",
        "The app servers all shared one session store",
      ],
      "Availability multiplies along the path. One weak link caps the whole system.",
      4,
    ],
    [
      "How do you find a remaining single point of failure?",
      "Ask 'what if this dies?' for each component",
      [
        "Look for whichever component costs the most",
        "Check which component has the most instances",
        "Read the cloud provider's status page history",
      ],
      "Walk the request path box by box. Then look beyond it: DNS, identity, deploy tooling.",
      4,
    ],
    [
      "Why a standby rather than a replica you'd promote by hand?",
      "It fails over automatically and safely, with no human needed",
      [
        "Read replicas can't be promoted to primary at all",
        "A standby also adds read capacity during normal running",
        "Read replicas cost more than standbys of the same size",
      ],
      "No human needed at 3am. Manual promotion is slow and error-prone under pressure.",
      5,
    ],
    [
      "A database corrupts its own data. Does the standby help?",
      "No: replication copies the damage, so you need backups",
      [
        "Yes: promote the standby and the corruption is gone",
        "Yes: standbys detect corruption and refuse to apply it",
        "No: you need a cache to hold a clean copy",
      ],
      "Replication faithfully copies the corruption. Availability and durability are different problems.",
      14,
    ],
    [
      "After failover the app keeps trying the old primary. Likely cause?",
      "Cached DNS or connections to the old address",
      [
        "The standby rejected the app's credentials",
        "The load balancer went down with the zone",
        "The app servers lost their user sessions",
      ],
      "Short DNS TTLs on the database endpoint, and pools that drop broken connections. Test this.",
      12,
    ],
    [
      "Zone A recovers. What must not happen?",
      "The old primary acting as a primary again",
      [
        "App servers rebalancing back into zone A",
        "The old primary rejoining as the new standby",
        "Traffic returning to zone A gradually",
      ],
      "Two primaries is split brain. The old one rejoins as the new standby.",
      13,
    ],
    [
      "When is a standby not worth its cost?",
      "When downtime is cheap or the risk is accepted",
      [
        "Never: every production database needs a standby",
        "Whenever the database is under 50% busy",
        "Whenever there are fewer than three app servers",
      ],
      "Internal tools and retrying batch systems can live without one. Write the decision down.",
      7,
    ],
    [
      "Which of these should wait for the morning rather than page?",
      "One app instance died and was replaced",
      [
        "Users can't make bookings at all",
        "The primary is down and there's no standby",
        "The error rate has been over target for ten minutes",
      ],
      "Every page should need human action now. The design absorbs one instance dying.",
      16,
    ],
    [
      "How would you justify the standby to a non-technical stakeholder?",
      "Compare what an outage costs with $120 a month",
      [
        "Walk them through how synchronous replication works",
        "Point out that all serious companies run standbys",
        "Show them the provider's best-practice guide",
      ],
      "Translate nines into minutes of downtime and money. Avoid jargon.",
      19,
    ],
    [
      "Which single point of failure is easy to overlook?",
      "The deploy pipeline you'd ship a fix with",
      [
        "The second app server in each zone",
        "The database standby itself",
        "The load balancer's second zone",
      ],
      "You need it to ship a fix. Also DNS, certificates, the identity provider and monitoring.",
      11,
    ],
  ]),

  "analytics-ate-prod": q([
    [
      "Finance asks for 'real-time' dashboards. What's the best first question?",
      "What decision depends on it, and how quickly?",
      [
        "Which dashboard tool would they like to use?",
        "How many analysts will be looking at it each day?",
        "Do they want the numbers as charts or as tables?",
      ],
      "Usually minutes is fine. Freshness requirements decide streaming, micro-batch or nightly batch.",
      0,
    ],
    [
      "Why is a {data-warehouse} a bad thing to call during a request?",
      "Even a small query there takes seconds to answer",
      [
        "It has no way to store individual customer records",
        "It's eventually consistent, so answers may be wrong",
        "It only accepts writes and can't answer reads",
      ],
      "It's built for big scans. Users wait on it, and it slows further when analysts run heavy queries.",
      4,
    ],
    [
      "What does an {event-stream} between the app and the warehouse achieve?",
      "The app no longer waits for the warehouse",
      [
        "The warehouse itself becomes real time",
        "The warehouse is no longer needed",
        "Analysts' queries run faster",
      ],
      "The app publishes and moves on; the warehouse loads at its own pace, and other consumers can use the events.",
      5,
    ],
    [
      "Why do warehouses usually prefer micro-batches to streaming one event at a time?",
      "Loading in bulk is far more efficient for them",
      [
        "Streams lose a small share of events in transit",
        "Micro-batches are always fresher than streams",
        "Warehouses can't read from event streams at all",
      ],
      "Many tiny loads are inefficient or costly. Pick the batch interval from the freshness requirement.",
      8,
    ],
    [
      "When does a nightly batch job beat streaming?",
      "When yesterday's numbers are good enough",
      [
        "Never, now that streaming is cheap",
        "When there are many different consumers",
        "When the data must be seconds fresh",
      ],
      "Simplest to build and run. Read from a replica to keep load off the primary.",
      10,
    ],
    [
      "The warehouse is down for six hours. What happens?",
      "Events wait in the stream until it catches up",
      [
        "Sign-ups and upgrades fail until it's back",
        "Six hours of events are lost for good",
        "The app writes everything to the database twice",
      ],
      "As long as retention outlasts the outage. The app is unaffected.",
      12,
    ],
    [
      "An event is loaded twice. How do metrics stay correct?",
      "Deduplicate on a unique ID per event",
      [
        "Never retry a load, even after a failure",
        "Count events only at the producer",
        "Move to a bigger warehouse tier",
      ],
      "At-least-once delivery is normal. Dedupe or upsert at the destination, and reconcile with the source.",
      13,
    ],
    [
      "Finance redefines 'active customer'. What lets you recompute last year?",
      "Keeping raw events, unchanged, forever",
      [
        "A bigger warehouse with more compute",
        "Real-time streaming instead of batches",
        "More dashboards showing each definition",
      ],
      "Derive metrics from raw events, not only pre-aggregated numbers, so definitions can change.",
      14,
    ],
    [
      "Most analysis doesn't need names or emails. What should you do?",
      "Pseudonymise them before they reach the warehouse",
      [
        "Copy every field across, for flexibility later",
        "Encrypt the warehouse and give everyone access",
        "Delete all customer data after a week",
      ],
      "With role- and column-level access for the rest. Fewer copies of PII means smaller compliance scope.",
      15,
    ],
    [
      "How do you show customers no longer wait on analytics?",
      "p99 on customer endpoints before and after",
      [
        "The number of queries the warehouse runs",
        "How fast the dashboards load for finance",
        "The event stream's throughput",
      ],
      "Measure the user-facing endpoints, and check traces no longer contain a warehouse span.",
      17,
    ],
  ]),

  "half-the-orders": q([
    [
      "Search and finance each see about half the orders, and the halves don't overlap. Strongest clue?",
      "Each message is only reaching one consumer",
      [
        "One consumer is processing twice as fast as the other",
        "Half the orders failed to save in the database",
        "The database is sharded into two halves",
      ],
      "Complementary halves point straight at a queue with competing consumers.",
      0,
    ],
    [
      "Why does a {queue} split orders between two different systems?",
      "Each message goes to one consumer, then it's deleted",
      [
        "Queues randomly drop about half of their messages",
        "Queues send writes to one consumer and reads to the other",
        "Queues have a hard limit of 50% of throughput per consumer",
      ],
      "Right for a pool of identical workers; wrong for systems that each need every message.",
      4,
    ],
    [
      "Why is an {event-stream} the fix?",
      "Every consumer group reads every event",
      [
        "It delivers events faster than a queue does",
        "It sends each event exactly twice",
        "It stores events in the database instead",
      ],
      "Each group tracks its own position. Adding a consumer is a new group, with no producer change.",
      5,
    ],
    [
      "What's the downside of two queues, one per consumer?",
      "The producer has to know about every consumer",
      [
        "A queue can't be duplicated once it's created",
        "Messages arrive at each consumer out of order",
        "It doubles the number of database writes",
      ],
      "Adding a third consumer means changing the producer. A stream decouples them.",
      7,
    ],
    [
      "How do you backfill the orders each system missed?",
      "Replay from the database with idempotent loads",
      [
        "Ask each team to re-enter the missing orders",
        "Wait for new orders to fill in the gaps",
        "Restart the queue so it redelivers everything",
      ],
      "Loading must not create duplicates, and reconciling counts afterwards confirms both are complete.",
      6,
    ],
    [
      "On a stream, how does one consumer system scale out across instances?",
      "Its instances share out the stream's partitions",
      [
        "Each instance reads every partition in full",
        "By creating a separate stream per instance",
        "Instances take turns reading the whole stream",
      ],
      "Competing consumers within a group; different systems use different groups. Parallelism is capped by partitions.",
      11,
    ],
    [
      "A consumer crashes after processing an event but before saving its position. What happens?",
      "It processes that event again after restarting",
      [
        "The event is lost for that consumer",
        "The stream blocks every consumer until it recovers",
        "The producer resends every event from the start",
      ],
      "At-least-once delivery. Upsert by order ID so a repeat is harmless.",
      12,
    ],
    [
      "How do you change the event format without breaking consumers?",
      "Make compatible changes and version the schemas",
      [
        "Rename fields in place in a single deploy",
        "Pause the stream while every consumer updates",
        "Ask consumers to ignore fields they don't recognise",
      ],
      "Add fields rather than renaming, use a schema registry, and dual-publish for breaking changes.",
      13,
    ],
    [
      "Which check would have caught this on day one?",
      "Reconciling order counts across systems",
      [
        "CPU utilisation on each consumer",
        "The queue's depth over time",
        "Database replication lag",
      ],
      "A 50% mismatch between the database, search and the warehouse is obvious once anyone compares.",
      16,
    ],
    [
      "When is a queue still the right tool in this system?",
      "For work items like confirmation emails",
      [
        "For broadcasting order events to every team",
        "For feeding the search index",
        "Never, once there's an event stream",
      ],
      "A worker pool sends each email once. Common pattern: a stream consumer puts email jobs on a queue.",
      10,
    ],
  ]),
}

/** Correct answers needed out of ten to unlock the suggested solution. */
export const PASS_MARK = 8
