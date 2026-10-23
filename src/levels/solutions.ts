/**
 * The written walkthrough for each level's reference solution. The diagram
 * itself is `level.reference`, which CI pins at three stars, so the numbers
 * here are checked against it: if you retune the catalogue, rerun the tests
 * and update the arithmetic.
 *
 * Component names are `{kind}` tokens, as everywhere else.
 */
export type Solution = {
  overview: string
  /** How a request travels through the design. */
  walkthrough: string[]
  /** Why each tier is the size it is. */
  numbers: string[]
  tradeoffs: string[]
  /** Designs that look reasonable and why this one beats them here. */
  alternatives: string[]
}

export const SOLUTIONS: Record<string, Solution> = {
  "shoebox-receipts": {
    overview:
      "Two paths for two kinds of receipt. Typed-in receipts are saved straight to the {sql-primary}. Photos are stored in the {object-store} and a job goes on a {queue}; {worker} instances call the {doc-ai} at a pace its quota allows and write the extracted fields back.",
    walkthrough: [
      "A typed-in receipt: {load-balancer} → {app-server} → {sql-primary}. Done in one request.",
      "A photo: the {app-server} stores the image in the {object-store}, writes a 'processing' row to the {sql-primary}, and queues a job. The user sees the receipt straight away, marked as processing.",
      "A {worker} takes the job, sends the photo to the {doc-ai}, and waits a few seconds for merchant, date, amount and tax.",
      "The {worker} writes those fields to the {sql-primary}. Fields with low confidence are flagged for the user to check.",
    ],
    numbers: [
      "800 requests a second, a quarter of them new receipts: 200 a second. 60% are photos, so 120 OCR jobs a second, and the other 80 are typed in.",
      "OCR providers cap calls per second, and default quotas are small: Amazon's receipt API defaults to 5 a second in its largest regions. Each {doc-ai} block here is 40 a second of raised quota; five blocks run at 60%.",
      "Deadline day is the chaos round at 1.5×: 180 jobs a second. Five blocks run at 90% and keep up. Three blocks would fall 60 jobs a second behind, and the queue would never drain.",
      "Four {worker} instances at 50 jobs a second each: 60% normally, 90% on deadline day.",
      "The {sql-primary} takes two writes per photo (the pending row, then the results): 320 writes a second, 64% of its limit. On deadline day it reaches 96%, which makes it the next thing to fix.",
      "Cost: $20 + 4 × $30 + 2 × $120 + $15 + $10 + 4 × $40 + 5 × $120 = $1,165 of $1,300. Real OCR is billed per page; the flat monthly price per block is a game simplification.",
    ],
    tradeoffs: [
      "The user doesn't get the extracted fields immediately. Show the photo at once with a 'reading your receipt' state, and let them type the fields if they're in a hurry.",
      "OCR quota is a capacity plan you file with the provider, not a slider you move on the day. Raise it weeks before the deadline.",
      "Low-confidence results need review: send them to the user to confirm, rather than silently storing a wrong amount on a tax return.",
      "Photos cost money per page, so detect duplicates (the same receipt uploaded twice) before calling OCR, not after.",
    ],
    alternatives: [
      "Calling the {doc-ai} straight from the {app-server}: every upload waits seconds, and a burst hits the rate limit and fails. With this load, 75% of requests fail.",
      "On-device OCR in the mobile app: free per scan and instant, but less accurate on crumpled receipts, and you still need a server path for web uploads.",
      "Batching overnight: cheaper, but users filing on deadline day can't wait until tomorrow.",
    ],
  },
  "plug-finder": {
    overview:
      "Most traffic is the same question about the same place: what's free near here? A {cdn} caches each map answer for a few seconds, so most views never reach your servers. Live status lives in a {nosql} store behind a {cache}, and status changes flow through an {event-stream} into the geo {search-index}.",
    walkthrough: [
      "{dns} sends drivers to the {cdn}. A map view for a busy area is answered from the edge if it's under about 30 seconds old.",
      "Misses go through the {load-balancer} to the {app-server}. Each map view does a geo query on the {search-index} ('chargers within 5km') plus a detail fetch for their live status.",
      "Live status comes from the {cache}, backed by the {nosql} store, keyed by station.",
      "When a driver marks a charger in use or leaves a note, the {app-server} writes it to the {nosql} store and publishes a status-changed event to the {event-stream}, which keeps the {search-index}'s 'available now' filter current.",
    ],
    numbers: [
      "3,000 requests a second: 2,850 map views and 150 check-ins and notes.",
      "60% of map views are for busy, shared areas, and the {cdn} serves about 95% of those: roughly 1,600 a second never reach the origin. About 1,230 reads and the 150 writes get through.",
      "Eight {app-server} instances run at 43%. On a holiday road trip (2×), they reach 86% without dropping requests.",
      "One {search-index} node handles the geo queries at 41%, and 82% on the road trip.",
      "Without the {cdn}, the app tier and the search index both sit above 90% on a normal day (p99 about 2.5 seconds), and nearly half of requests fail on the road trip. Buying fifteen app servers instead costs $741, over budget, and the search index still overloads.",
      "Cost: $1 + $25 + $20 + 8 × $30 + 2 × $25 + $70 + $90 + $60 = $556 of $600.",
    ],
    tradeoffs: [
      "Edge caching makes the map up to 30 seconds stale. Show 'updated 20s ago' so drivers trust what they see, and skip the cache for the station they've just tapped into.",
      "Crowd-reported 'in use' flags go stale when someone forgets to check out. Expire them automatically after a typical charging session, and prefer an operator's live feed where one exists.",
      "Publishing to the {event-stream} puts it on the write path: if it's down, check-ins fail. That's why availability is 99.92% rather than higher.",
      "Notes are user-generated content: they need moderation, rate limits and a way to report abuse.",
    ],
    alternatives: [
      "Querying the {nosql} store for 'near me' directly: workable with geohash keys, but range queries across cells get fiddly. A search index with geo support does it natively.",
      "Pushing live status to every open app over websockets: fresher, but millions of idle connections cost far more than a 30-second cache for a map that changes every few minutes.",
      "Polling charger operators' APIs: operators can push changes to apps instead (the OCPI protocol supports pushing updates), which is fresher and cheaper than polling.",
    ],
  },
  "first-customers": {
    overview:
      "The classic three-tier starter: a {load-balancer} in front of a stateless {app-server} pool, with one {sql-primary} as the source of truth. The interesting decisions are how many app servers, and whether the database gets a standby.",
    walkthrough: [
      "Users hit the {load-balancer}, which spreads requests across the healthy {app-server} instances.",
      "Each {app-server} runs the helpdesk code and queries the {sql-primary}: reads for opening tickets, writes for replies.",
      "The {sql-primary} has a standby in a second zone. It serves nothing until the primary fails, then takes over.",
    ],
    numbers: [
      "Peak is 500 requests a second and each {app-server} handles about 400. Two would cope at 63% busy, but the chaos round kills one, and one server can't carry 500. Three instances sit at 42%, and survive losing one at 63%.",
      "The {sql-primary} sees 400 reads and 100 writes a second: about 20% of what it can do. It doesn't need help with load.",
      "A single database instance is 99.5% available, which caps the whole system below the 99.9% target. The standby puts it in two failure domains: 1 - 0.005² = 99.9975%.",
      "Cost: $20 + 3 × $30 + 2 × $120 = $350 of the $400 budget.",
    ],
    tradeoffs: [
      "The standby doubles the database bill and adds no capacity at all. You're paying for availability, not speed.",
      "Spreading the app tier over two zones costs nothing extra, which is why it's always worth doing.",
      "The app servers must be stateless (sessions in a signed token) or losing one logs its users out.",
    ],
    alternatives: [
      "A {cache} would work, but the database is at 20%: it solves a problem this system doesn't have yet.",
      "Read replicas cost $120 each and also solve a load problem that isn't there. A standby is the cheaper fix for availability.",
    ],
  },
  "front-page": {
    overview:
      "A read-heavy workload where most reads ask for the same few articles. A {cache} between the app tier and the database turns 2,850 database reads a second into about 400.",
    walkthrough: [
      "The {load-balancer} spreads requests across the {app-server} pool, which builds each reader's personalised feed.",
      "To fetch articles, the app asks the {cache} first. Hits come back from memory in about a millisecond.",
      "Misses, and every write (comments, likes, new articles), go through to the {sql-primary}.",
      "When an editor updates an article, the app deletes the cached copy so the next read fetches the new one.",
    ],
    numbers: [
      "2,850 reads a second would overload the {sql-primary}, which tops out around 2,000.",
      "90% of reads are for cacheable articles, and a warm cache serves 95% of those: about 2,440 reads a second never reach the database. It gets roughly 410 reads and 150 writes, comfortably within its limits.",
      "The p99 target drives the app tier. At 3,000 requests a second, 14 instances run at 54% busy, which keeps their tail latency low enough for the 250ms target.",
      "Two {cache} nodes in two zones: the chaos round restarts one cold, and the other keeps serving. With a single node, all 2,850 reads hit the database at once and about 28% of them fail.",
      "Cost: $20 + 14 × $30 + 2 × $25 + 2 × $120 = $730 of the $750 budget.",
    ],
    tradeoffs: [
      "Readers can see an article a few seconds stale if invalidation is missed. For news, that's acceptable; for a bank balance, it wouldn't be.",
      "The second cache node exists purely to survive the cold-start stampede. It's $25 well spent, but only because the database can't absorb a full miss storm.",
      "Most of the bill is the app tier. A looser latency target would let you run fewer, busier servers.",
    ],
    alternatives: [
      "Read replicas: each takes up to 2,000 reads, but to keep replicas fast you need three at $120 each. That breaks the budget for something a $25 cache does better.",
      "A {cdn} doesn't help here, because each feed is personalised and can't be cached at the edge.",
    ],
  },
  "going-viral": {
    overview:
      "Static files, enormous read volume, no logic. Nothing in this design runs your code: a {cdn} answers almost everything from the edge, and an {object-store} holds the originals.",
    walkthrough: [
      "{dns} sends users to the nearest {cdn} edge location.",
      "The {cdn} serves the image from its cache. Only misses travel to the origin.",
      "The {object-store} is the origin: it holds every uploaded image and serves the misses.",
    ],
    numbers: [
      "20,000 requests a second. Through {app-server} instances at 400 each, that's 50 servers and $1,500 a month, against a $100 budget.",
      "95% of reads are for the viral images, and the {cdn} serves 95% of those. That leaves about 1,940 reads a second for the {object-store}, well inside its 5,000.",
      "During the 2× spike, the origin sees about 3,900 a second: still under its limit, so nothing fails.",
      "Cost: $1 + $25 + $15 = $41 a month.",
    ],
    tradeoffs: [
      "Purging is slow: if an image is taken down, edge copies can survive until their TTL runs out unless you purge explicitly.",
      "The {cdn} is the only thing standing between 20,000 requests and an origin built for 5,000. If it misbehaves, the origin is overwhelmed.",
      "In a real system, uploads would go straight to the {object-store} with a pre-signed URL rather than through the CDN.",
    ],
    alternatives: [
      "An {object-store} alone: 19,900 reads a second against a 5,000 limit. Three quarters of requests fail.",
      "{app-server} instances in front of the store: it works, but costs fifteen times the budget to serve files that need no logic.",
    ],
  },
  "upload-rush": {
    overview:
      "Split the fast part from the slow part. The {app-server} accepts the upload and records it, then drops a job on a {queue}. A pool of {worker} instances does the two-second resize in the background.",
    walkthrough: [
      "The upload hits the {load-balancer} and lands on an {app-server}.",
      "The app writes the photo's metadata to the {sql-primary}, puts a resize job on the {queue}, and responds straight away.",
      "{worker} instances pull jobs off the {queue}, resize each photo into four sizes, and save them to the {object-store}.",
      "The app shows a 'processing' state until the resized copies exist.",
    ],
    numbers: [
      "Done inline, each upload costs the {app-server} about 20 requests' worth of capacity and adds 1.8 seconds to the user's wait. That fails the 300ms target however many servers you add.",
      "With the slow work queued, three {app-server} instances handle 600 requests a second at 50% busy.",
      "300 uploads a second at 50 jobs per {worker} needs six at 100%. Eight run at 75%, and when one dies in the chaos round, seven still keep up at 86%.",
      "The {sql-primary} takes 300 metadata writes a second: 60% of its write capacity, and the next ceiling this design will hit.",
      "Cost: $20 + $90 + $120 + $10 + 8 × $40 + $15 = $575 of $650.",
    ],
    tradeoffs: [
      "The user gets an instant response but not an instant result. You need a 'still processing' state and a way to tell them it's done.",
      "Queues deliver at least once, so the same resize job can run twice. Writing the output to a fixed key makes that harmless.",
      "Workers should scale on queue depth, not CPU. Size them for the peak arrival rate, or the backlog never drains.",
    ],
    alternatives: [
      "{serverless} functions triggered by each upload: no pool to size, but cold starts and per-invocation pricing at 300 a second.",
      "More app servers with inline resizing: the capacity can be bought, but the 1.8-second wait can't be bought off.",
    ],
  },
  "zone-outage": {
    overview:
      "Every tier you run yourself must survive losing a zone: enough {app-server} instances that half of them can carry peak, and a {sql-primary} with a standby elsewhere. The {cache} can stay in one zone, because the database can absorb its loss.",
    walkthrough: [
      "The managed {load-balancer} already spans zones and routes around the dead one.",
      "Eight {app-server} instances across two zones: four in each.",
      "Reads go through the {cache}; misses and writes reach the {sql-primary}.",
      "When zone A goes dark, the standby in zone B is promoted to primary.",
    ],
    numbers: [
      "Losing zone A takes four of the eight {app-server} instances. The remaining four have 1,600 requests a second of capacity for 1,500 of traffic: busy, but nothing is dropped.",
      "The {cache} goes down with zone A, so every read falls through: the {sql-primary} sees all 1,350 reads a second, about 68% of its limit, so the system slows rather than fails.",
      "Availability: {load-balancer} 99.99% × two app domains (99.99%) × two database domains (99.9975%) ≈ 99.977%, above the 99.95% target. The cache isn't counted, because losing it degrades the system rather than breaking it.",
      "Cost: $20 + 8 × $30 + $25 + 2 × $120 = $525 of $650.",
    ],
    tradeoffs: [
      "Two zones means each must carry 100% of peak, so you buy double. Three zones means each needs 50%, which is cheaper headroom once a tier is large.",
      "Failover isn't instant: expect seconds to a minute of errors while the standby is promoted.",
      "Leaving the {cache} single-zone is a deliberate bet that the database can survive a cold start. If it couldn't, you'd need a second node.",
    ],
    alternatives: [
      "Six {app-server} instances across three zones survive the outage too (four remain), and cost less. The reference uses two zones to make the 'each zone carries everything' point.",
      "A {nosql} store is managed across zones for you, but you'd lose transactions and joins that a payments dashboard relies on.",
    ],
  },
  "feed-the-analysts": {
    overview:
      "One write, three destinations. The {app-server} commits the order to the {sql-primary} and publishes an event to an {event-stream}. The {search-index} and {data-warehouse} each read every event on their own schedule.",
    walkthrough: [
      "Checkout runs on the {app-server}, which writes the order to the {sql-primary}.",
      "It also publishes an order-placed event to the {event-stream} and returns to the customer.",
      "The {search-index} consumes every event and updates its index within a second or two.",
      "The {data-warehouse} consumes the same events independently and loads them in bulk for finance.",
    ],
    numbers: [
      "800 requests a second, 320 of them orders. Four {app-server} instances run at 50%.",
      "Each consumer of the {event-stream} receives all 320 events a second. With a {queue}, they would split them and each see only 160.",
      "On the request path, the {data-warehouse} would add about four seconds to every request and could only answer 50 queries a second. Behind the stream, it just ingests 320 events a second, which is trivial for it.",
      "Cost: $20 + 4 × $30 + 2 × $120 + $60 + $90 + $200 = $730 of $800.",
    ],
    tradeoffs: [
      "Writing to the database and publishing an event are two separate actions: if one fails, they disagree. The outbox pattern or change data capture closes that gap.",
      "Search and analytics are eventually consistent: a brand-new order may take a moment to appear.",
      "Events for one order should share a partition key so they stay in order.",
    ],
    alternatives: [
      "A {queue} with both consumers: each gets half the orders. That's the bug in the repair level 'Half the Orders'.",
      "Calling the {search-index} and {data-warehouse} directly from checkout: every order then waits on both, and fails if either is down.",
    ],
  },
  "lost-writes": {
    overview:
      "The app was talking only to the {sql-replica}, which can't accept writes. Connecting the {app-server} to the {sql-primary} as well gives a read/write split: replicas take the reads, the primary takes the writes.",
    walkthrough: [
      "Reads (opening tickets) go from the {app-server} to the {sql-replica}.",
      "Writes (saving edits) go to the {sql-primary}.",
      "The primary streams every change to the replica, a few milliseconds behind.",
    ],
    numbers: [
      "600 requests a second: 480 reads to the {sql-replica} (24% of its capacity) and 120 writes to the {sql-primary} (24%).",
      "Before the fix, 0 of those 120 writes a second were stored anywhere. Nothing errored, because nothing ever tried to write.",
      "Cost: $20 + 3 × $30 + $120 + 2 × $120 = $470 of $600.",
    ],
    tradeoffs: [
      "Replication lag: an agent who saves a ticket and reloads at once may read the old version from the replica. Reading from the primary for a few seconds after a write fixes it.",
      "At this load, the replica isn't needed for capacity. It buys read headroom and a warm copy of the data.",
    ],
    alternatives: [
      "Point the app only at the {sql-primary} and remove the replica: also correct, and $120 cheaper, since the primary can easily take all 600 requests a second.",
    ],
  },
  "black-friday": {
    overview:
      "The app tier was never the problem. The {sql-primary} was being asked for more reads than it can serve. A {cache} in front of it absorbs the catalogue reads, which are identical for every shopper.",
    walkthrough: [
      "Shoppers' requests go through the {load-balancer} to the {app-server} pool, unchanged.",
      "Catalogue reads now go to the {cache} first. Hits never touch the database.",
      "Misses, orders and basket updates go through to the {sql-primary}.",
    ],
    numbers: [
      "2,250 reads a second against a {sql-primary} that tops out around 2,000: about 10% of requests failed, and adding app servers couldn't change that.",
      "85% of reads are for the catalogue and the cache serves 95% of those, so about 1,820 reads a second never reach the database. It now sees about 430 reads and 250 writes.",
      "The ten {app-server} instances were fine all along, at 63% busy.",
      "Cost: $20 + 10 × $30 + $25 + 2 × $120 = $585 of $700.",
    ],
    tradeoffs: [
      "Prices and stock in the cache can be briefly stale. Show cached stock as a hint, and check the database at checkout.",
      "If the cache restarts cold during the sale, the database is back above its limit. A second node would cover that.",
    ],
    alternatives: [
      "Read replicas: two would split the reads under the limit, at $240 rather than $25.",
      "More app servers: the fix that had already been tried. It made the bill bigger and the database just as overloaded.",
    ],
  },
  "slow-checkout": {
    overview:
      "Move the PDF off the request path. The {app-server} records the order and queues an invoice job; {worker} instances render the PDFs in the background and store them in the {object-store}.",
    walkthrough: [
      "The customer clicks Pay. The {app-server} writes the order to the {sql-primary} and puts an invoice job on the {queue}.",
      "The response goes back immediately: the order is confirmed.",
      "A {worker} picks up the job, renders the PDF and saves it to the {object-store}.",
      "The invoice link appears in the order page, or arrives by email, a few seconds later.",
    ],
    numbers: [
      "Rendering inline cost about 1.8 seconds per order and 20 requests' worth of capacity. Six {app-server} instances were mostly rendering PDFs.",
      "Without that work, three {app-server} instances handle 400 requests a second at 33% busy.",
      "120 orders a second at 50 PDFs per {worker} needs 2.4 workers. Four run at 60%, and three still keep up if one dies.",
      "Cost: $20 + $90 + $240 + $10 + 4 × $40 + $15 = $535, less than the broken version's app tier and database alone.",
    ],
    tradeoffs: [
      "The invoice isn't ready at the moment of purchase. Usually that's fine; if a customer must download it at once, show a 'preparing' state.",
      "A failing PDF job would retry forever without a dead-letter queue to catch it.",
    ],
    alternatives: [
      "Generate the PDF only when someone first asks for it, then cache it. Even less work, but the first download is slow.",
    ],
  },
  "three-am-page": {
    overview:
      "The app tier was already spread across three zones. The single {sql-primary} instance in one zone was the remaining single point of failure. Adding a standby in a second zone fixes it.",
    walkthrough: [
      "Requests flow {load-balancer} → {app-server} → {sql-primary}, as before.",
      "The {sql-primary} now has a standby in another zone, kept in sync and ready to take over.",
      "When zone A dies, the app servers in the other zones carry on, and the standby is promoted.",
    ],
    numbers: [
      "Availability multiplies along the path. One database instance at 99.5% capped the whole chain around 99.5%, whatever the app tier did. With a standby: 1 - 0.005² = 99.9975%.",
      "Zone A takes two of the six {app-server} instances. Four remain, with 1,600 requests a second of capacity for 1,200 of traffic.",
      "Cost: $20 + 6 × $30 + 2 × $120 = $440 of $600.",
    ],
    tradeoffs: [
      "The standby costs as much as the primary and serves no traffic. It's insurance.",
      "Expect a short burst of errors during failover. Retries with backoff in the app hide most of it from users.",
    ],
    alternatives: [
      "A read replica in another zone can also be promoted, but manual promotion during an outage is slower and riskier than a standby built for it.",
    ],
  },
  "analytics-ate-prod": {
    overview:
      "Take the {data-warehouse} off the request path. The {app-server} publishes an event to an {event-stream}, and the warehouse loads events at its own pace. Dashboards are a minute or two behind; customers no longer wait.",
    walkthrough: [
      "The {app-server} handles the request and writes to the {sql-primary} as before.",
      "It publishes an event for each sign-up, upgrade or cancellation to the {event-stream} and returns.",
      "The {data-warehouse} consumes the stream and loads events in batches for the finance dashboards.",
    ],
    numbers: [
      "Wired in directly, the warehouse received 490 small reads a second against a limit of about 50, and its four-second p99 landed on every request.",
      "Behind the stream, it ingests 210 events a second: about 4% of its load capacity.",
      "Four {app-server} instances run at 44% busy.",
      "Cost: $20 + 4 × $30 + 2 × $120 + $60 + $200 = $640 of $800.",
    ],
    tradeoffs: [
      "Dashboards are no longer real time; they're minutes behind. Almost no finance question needs better.",
      "Publishing events from the app means two writes that can disagree. Change data capture from the database avoids that.",
    ],
    alternatives: [
      "Change data capture from the {sql-primary} into the warehouse: no app changes at all, and the event stream comes from the database's own log.",
      "Nightly batch exports: simpler, but the numbers are a day old.",
    ],
  },
  "half-the-orders": {
    overview:
      "Replace the {queue} with an {event-stream}. A queue hands each message to one consumer, so the search index and the warehouse were splitting the orders between them. A stream gives every consumer group every event.",
    walkthrough: [
      "The {app-server} writes each order to the {sql-primary} and publishes an order-placed event to the {event-stream}.",
      "The {search-index} reads every event, at its own pace.",
      "The {data-warehouse} reads every event too, independently, and can replay history if it falls behind.",
    ],
    numbers: [
      "320 orders a second. With the {queue}, each consumer got about 160, so each team saw half the orders and blamed the other.",
      "With the {event-stream}, both receive all 320 a second.",
      "Cost: $20 + 4 × $30 + 2 × $120 + $60 + $90 + $200 = $730 of $800.",
    ],
    tradeoffs: [
      "A stream costs more than a queue, and consumers must track their own position in it.",
      "Ordering only holds within a partition. Key events by order ID so each order's events stay in sequence.",
    ],
    alternatives: [
      "Two queues, with the app publishing to both: it works, but the app now knows every consumer, and adding a third means changing it again.",
    ],
  },
}
