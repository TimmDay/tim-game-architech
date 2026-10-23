import type { CardCategory, DeckCard } from "./types"

type Row = [CardCategory, string, string[], string?]

/**
 * Cards are numbered by position, and progress is stored against that number.
 * Append new cards at the end; inserting or reordering resets saved progress.
 */
export const deck = (levelId: string, rows: Row[]): DeckCard[] =>
  rows.map(([category, prompt, points, followUp], i) => ({
    id: `${levelId}:${i}`,
    category,
    prompt,
    points,
    followUp,
  }))

export const FIRST_CUSTOMERS = deck("first-customers", [
  [
    "clarify",
    "Before drawing anything: what would you ask about the 500 requests a second?",
    [
      "Is 500 the peak or the average? What does the daily curve look like, and is there a Monday-morning spike when every agent logs in?",
      "What's the read/write split? Agents mostly read tickets, but replies and status changes are writes.",
      "How fast is it growing? Designing for 500 is different from designing for 500 that doubles every quarter.",
    ],
    "If they say 'it doubles every six months', which part of your design breaks first?",
  ],
  [
    "clarify",
    "What would you ask about who the users are?",
    [
      "Internal support agents, customers, or both? Agents are a small, known group; customers are many and anonymous.",
      "Are they in one region or around the world? That decides whether one region is enough.",
      "Is it one company's helpdesk or many companies' (multi-tenant)? Multi-tenancy changes isolation and data partitioning.",
    ],
  ],
  [
    "clarify",
    "Which availability and durability questions would you ask up front?",
    [
      "What does 99.9% mean to them: during business hours, or around the clock?",
      "How much data loss is acceptable if the database dies (RPO), and how long can recovery take (RTO)?",
      "Is there a contractual SLA with penalties, or an internal target?",
    ],
    "99.9% allows about 43 minutes of downtime a month. Does a single database make that realistic?",
  ],
  [
    "clarify",
    "What would you ask about the data before choosing a store?",
    [
      "How big is a ticket, how many are there, and how long are they kept?",
      "What queries do agents run: by ticket ID, by customer, full-text search across ticket bodies?",
      "Are there attachments? Those belong in object storage, not the database.",
    ],
  ],
  [
    "product",
    "What's the single most important user journey to keep fast, and why?",
    [
      "An agent opening a ticket while a customer waits on the phone. Latency here is felt directly.",
      "Saving a reply: it must never be lost, even if it's a little slower.",
      "Dashboards and reports can be slower and slightly stale.",
    ],
    "Would you make different durability choices for replies vs internal notes?",
  ],
  [
    "decision",
    "Why is the app tier stateless, and what has to be true for that to work?",
    [
      "Any instance can serve any request, so you can add, remove or lose instances freely.",
      "Sessions must live outside the server: a signed token, or a shared session store.",
      "Uploads and temporary files can't sit on local disk either.",
    ],
    "If you used a session store, is it now on the critical path? What's its availability?",
  ],
  [
    "decision",
    "How did you decide on three app servers rather than two?",
    [
      "Each handles about 400 requests a second. Two cope with 500, but losing one leaves 400 of capacity for 500 of traffic.",
      "N+1: provision so peak still fits with one instance gone (crash, deploy or bad host).",
      "Three instances run at about 42% busy, which also keeps tail latency down.",
    ],
    "During a rolling deploy you take one out on purpose. Does that change the number?",
  ],
  [
    "decision",
    "Why add a standby to the database instead of a read replica?",
    [
      "The problem is availability, not load: the database is only 20% busy.",
      "A standby sits in another zone and is promoted on failure. A replica serves reads but needs manual promotion.",
      "Both cost the same; only one addresses the actual risk.",
    ],
  ],
  [
    "tradeoff",
    "The standby doubles the database bill and adds no capacity. How do you justify it?",
    [
      "One database instance is about 99.5% available, which caps the whole system below 99.9%.",
      "Compare the cost to an outage: lost agent time, angry customers, SLA credits.",
      "The alternative is accepting a lower target, which is a product decision, not an engineering one.",
    ],
  ],
  [
    "tradeoff",
    "Signed session tokens vs a shared session store: what do you gain and lose with each?",
    [
      "Tokens: nothing extra to run, no lookup per request. But revoking a token before it expires is hard.",
      "Store: instant logout and revocation, but another component on the critical path to keep available.",
      "A common middle ground: short-lived tokens plus a refresh token you can revoke.",
    ],
  ],
  [
    "tradeoff",
    "Two availability zones or three for the app tier?",
    [
      "Two zones: each must carry 100% of peak after a zone loss, so you buy double.",
      "Three zones: each needs 50%, so less spare capacity overall once the tier is big.",
      "At three instances it barely matters. At thirty it's real money.",
    ],
  ],
  [
    "alternative",
    "Would you put a cache in this design? Defend the answer either way.",
    [
      "Not yet: the database is at 20% and p99 is within target. A cache adds staleness and another thing to run.",
      "Add one when the database is the bottleneck or latency matters more than consistency.",
      "Saying 'not yet, and here's the signal that would change my mind' is a strong answer.",
    ],
    "What metric would tell you it's time?",
  ],
  [
    "alternative",
    "Could this start as a single server, and when would you have said yes to that?",
    [
      "For an internal tool with no availability target, one server and backups is honest and cheap.",
      "The 99.9% target and real customers are what force the second instance and the standby.",
      "Starting simple and knowing what forces each step is a senior signal.",
    ],
  ],
  [
    "alternative",
    "Serverless functions instead of app servers: would they fit here?",
    [
      "Traffic is steady during business hours, which favours always-on containers on cost.",
      "Cold starts would hurt the p99 when agents first log in.",
      "Connection storms: many short-lived functions can exhaust database connections without a proxy.",
    ],
  ],
  [
    "scale",
    "Traffic grows 10×. Walk through what breaks, in order.",
    [
      "App tier first, but that's easy: add instances.",
      "Database reads next: add a cache for hot tickets, or read replicas.",
      "Database writes last, and hardest: partition by tenant (company) or move hot data elsewhere.",
      "Also watch database connections: 30 app servers × a pool each can exceed the database's limit.",
    ],
  ],
  [
    "scale",
    "How would you shard this if one database stopped being enough?",
    [
      "By tenant (customer company): tickets rarely cross tenants, so most queries stay on one shard.",
      "Watch for a single huge tenant that outgrows its shard.",
      "Cross-shard reporting moves to a warehouse fed by events.",
    ],
  ],
  [
    "edge-case",
    "Two agents edit the same ticket at the same time. What happens?",
    [
      "Last write wins silently, unless you design for it.",
      "Optimistic concurrency: a version number on the ticket, and reject a save based on a stale version.",
      "Product-wise: show 'Sam is also replying' so it rarely happens.",
    ],
  ],
  [
    "edge-case",
    "The database fails over mid-request. What does the user see, and how do you make it graceful?",
    [
      "A burst of errors or timeouts for seconds to a minute while the standby is promoted.",
      "Retries with exponential backoff and jitter in the app hide most of it.",
      "Writes must be idempotent (an idempotency key per reply) so a retried save doesn't post twice.",
    ],
  ],
  [
    "edge-case",
    "A deploy goes out with a bug that crashes every app server on startup. How do you limit the damage?",
    [
      "Rolling deploys with health checks: the load balancer won't send traffic to instances that fail.",
      "Stop the rollout automatically when new instances fail health checks.",
      "Keep the previous version ready for a fast rollback.",
    ],
  ],
  [
    "security",
    "Where does authentication happen, and how does a request prove who it is?",
    [
      "TLS terminates at the load balancer; the app verifies a session token on every request.",
      "Agents sign in through the company's identity provider (SSO), not a password stored by you.",
      "Authorisation is separate: can this agent see this company's tickets?",
    ],
    "In a multi-tenant helpdesk, how do you make sure one company can never read another's tickets?",
  ],
  [
    "security",
    "What sensitive data is in a helpdesk, and how do you protect it?",
    [
      "Customer names, emails, sometimes payment or health details pasted into tickets.",
      "Encrypt at rest and in transit, restrict access by role, and log who viewed what.",
      "Retention: delete old tickets on schedule, and support data-deletion requests.",
    ],
  ],
  [
    "observability",
    "What are the first three things you'd put on a dashboard for this system?",
    [
      "Request rate, error rate and p99 latency at the load balancer: what users feel.",
      "Per-tier saturation: app CPU, database CPU, connections in use.",
      "Replication lag to the standby, so you know failover won't lose data.",
    ],
  ],
  [
    "observability",
    "What would you alert on, and what would you deliberately not page anyone for?",
    [
      "Page on symptoms: error rate or latency over target for several minutes.",
      "Don't page on a single instance dying; the design absorbs that. Make it a ticket instead.",
      "Alert before disks fill and before the database runs out of connections.",
    ],
  ],
])

export const FRONT_PAGE = deck("front-page", [
  [
    "clarify",
    "What would you ask about the read traffic before reaching for a cache?",
    [
      "How concentrated is it? If most reads hit the same few articles, a cache is very effective. If every reader reads different things, it isn't.",
      "How much of the page is personalised, and how much is the same for everyone?",
      "Is traffic spiky (breaking news) or steady?",
    ],
    "How would you estimate the hit rate before building anything?",
  ],
  [
    "clarify",
    "How stale can an article be? Why does that question shape the whole design?",
    [
      "If a few seconds is fine, you can cache aggressively with short TTLs.",
      "If corrections must appear instantly (legal or safety corrections), you need invalidation on publish.",
      "Comments and like counts can be much staler than the article body.",
    ],
  ],
  [
    "clarify",
    "What would you ask about the writes?",
    [
      "Who writes: a few editors publishing, or millions of readers commenting and liking?",
      "Do likes need to be exact and immediate, or can they be approximate and batched?",
      "Is there a moderation step before a comment appears?",
    ],
  ],
  [
    "clarify",
    "What's the latency target, and where is it measured?",
    [
      "At the server, or including the network to the reader's phone?",
      "p99 or p50? A news feed is judged on its slowest loads.",
      "Is it for the first page of the feed, or every scroll?",
    ],
  ],
  [
    "product",
    "Which parts of the feed could you degrade during a traffic spike without readers really minding?",
    [
      "Personalisation: fall back to a shared 'top stories' list that caches perfectly.",
      "Comment counts and related-article widgets.",
      "Keep the article body itself always available.",
    ],
    "How would you switch that fallback on: automatically, or by hand?",
  ],
  [
    "decision",
    "Why put the cache between the app and the database, rather than in front of the app?",
    [
      "The feed is personalised, so whole pages can't be cached. The articles inside them can.",
      "Caching the data, not the page, lets each reader's feed be assembled from shared parts.",
      "That's cache-aside: check the cache, fall back to the database, fill the cache on a miss.",
    ],
  ],
  [
    "decision",
    "Why two cache nodes, when one handles the load easily?",
    [
      "Not for capacity: one node handles 50,000 reads a second.",
      "For the cold start. If the only node restarts, all 2,850 reads a second hit a database that tops out around 2,000.",
      "The second node keeps serving while the first warms up.",
    ],
  ],
  [
    "decision",
    "How do you invalidate a cached article when an editor fixes a typo?",
    [
      "On publish, delete the cache key so the next read refetches it. Don't try to update it in place.",
      "Keep a TTL as a safety net in case an invalidation is missed.",
      "Versioned keys (article:123:v7) avoid races between a delete and a slow refill.",
    ],
    "What's the race condition with delete-then-refill, and how do versioned keys avoid it?",
  ],
  [
    "tradeoff",
    "Cache vs read replicas for this workload: compare them properly.",
    [
      "A replica takes about 2,000 reads a second for $120. A cache node takes 50,000 for $25.",
      "Replicas are always consistent within a few milliseconds of the primary; a cache is as stale as its TTL.",
      "Replicas serve any query; a cache only helps data that's shared and hot.",
    ],
  ],
  [
    "tradeoff",
    "Short TTL vs long TTL on cached articles?",
    [
      "Short: fresher data, lower hit rate, more database load.",
      "Long: great hit rate, but stale content lingers unless you invalidate.",
      "With reliable invalidation on publish, a long TTL is safe and the TTL becomes a backstop.",
    ],
  ],
  [
    "tradeoff",
    "The app tier is the biggest cost in this design. What drives its size, and what could you trade?",
    [
      "The p99 target: a looser target lets each server run busier.",
      "Feed assembly work per request: caching assembled fragments cuts CPU.",
      "Autoscaling down outside peak hours saves most of the money.",
    ],
  ],
  [
    "alternative",
    "Could a CDN help even though the feed is personalised?",
    [
      "Yes, for parts of it: article pages, images and scripts are the same for everyone.",
      "Split the page: a cached shell and article content from the CDN, a small personalised call from the app.",
      "Edge personalisation is possible but adds complexity and cost.",
    ],
  ],
  [
    "alternative",
    "Precompute every reader's feed (fan-out on write) instead of building it on read?",
    [
      "Reads become trivial lookups, at the cost of heavy work on every publish.",
      "Fine for a modest number of readers; a celebrity publisher with millions of followers makes writes explode.",
      "Many real systems mix both: precompute for most, compute on read for huge accounts.",
    ],
    "Where's the crossover point, and how would you find it?",
  ],
  [
    "scale",
    "A story goes viral and reads jump 10× in two minutes. What happens, step by step?",
    [
      "The hot article is in cache, so the database is mostly shielded.",
      "The app tier saturates first; autoscaling takes minutes, so keep headroom or pre-scale for big events.",
      "The cache node holding the hot key can become a hotspot; replicate hot keys or add a local in-process cache.",
    ],
  ],
  [
    "scale",
    "What is a cache stampede, and how would you stop one here?",
    [
      "A popular key expires and thousands of requests miss at once, all hitting the database for the same thing.",
      "Request coalescing: only one request refills the key while the rest wait for it.",
      "Refresh early (before expiry) or add jitter to TTLs so keys don't expire together.",
    ],
  ],
  [
    "edge-case",
    "A reader publishes a comment and doesn't see it on refresh. Why, and how do you fix it?",
    [
      "They read a cached copy that predates their write.",
      "Read-your-writes: show the user their own comment from the write response, or bypass the cache for their own content briefly.",
      "Invalidate the comment list for that article on write.",
    ],
  ],
  [
    "edge-case",
    "The cache cluster goes completely down. What's your plan?",
    [
      "The database can't take 2,850 reads a second, so you must shed or degrade.",
      "Serve a static 'top stories' fallback, rate-limit expensive feed requests, protect the database with a circuit breaker.",
      "Warm the cache gradually when it returns, not all at once.",
    ],
  ],
  [
    "edge-case",
    "An editor publishes an article with a serious error. How fast can you make it disappear everywhere?",
    [
      "Delete it from the database and invalidate its cache key: seconds.",
      "Anything cached downstream (a CDN, or readers' browsers) lasts until its TTL or an explicit purge.",
      "Keep TTLs on anything editorial short enough to make takedowns tolerable.",
    ],
  ],
  [
    "security",
    "What could go wrong security-wise with caching a personalised site?",
    [
      "Caching a response that contains one user's data under a shared key, so another user sees it.",
      "Cache keys must include everything the response depends on, including the user if it's personal.",
      "Never cache responses with authentication cookies at a shared layer.",
    ],
  ],
  [
    "security",
    "Comments are user-generated content. What do you need to defend against?",
    [
      "Script injection (XSS): escape output, sanitise HTML, use a content security policy.",
      "Spam and abuse: rate limits per account and IP, moderation queues.",
      "Bots inflating likes: count unique users, not requests.",
    ],
  ],
  [
    "observability",
    "Which cache metrics matter most, and what would each tell you?",
    [
      "Hit rate: falling means keys are expiring too early or traffic patterns changed.",
      "Evictions: the cache is too small for the working set.",
      "Database read rate alongside it: the real measure of whether the cache is doing its job.",
    ],
  ],
  [
    "observability",
    "How would you know readers are seeing stale content?",
    [
      "Log the age of cached items when they're served, and track the distribution.",
      "Synthetic checks: publish a test article and measure how long until it appears.",
      "Compare a sample of cached reads with the database.",
    ],
  ],
])

export const GOING_VIRAL = deck("going-viral", [
  [
    "clarify",
    "What would you ask about the images themselves?",
    [
      "How big are they, and how many are there? Total storage and bandwidth drive cost more than requests.",
      "Are they ever edited or deleted? That decides how hard caching is.",
      "Are they public, or should some be private?",
    ],
  ],
  [
    "clarify",
    "What would you ask about where the traffic comes from?",
    [
      "Worldwide or one country? A CDN matters far more for global traffic.",
      "Mostly phones on mobile networks? Then image size and formats matter as much as servers.",
      "Is it real users, or could some of it be bots and scrapers?",
    ],
  ],
  [
    "clarify",
    "What does 'the site is up' mean for a meme site?",
    [
      "Images load: that's the product.",
      "Uploads working is secondary; a short upload outage might be acceptable.",
      "This shapes where you spend on redundancy.",
    ],
  ],
  [
    "product",
    "A viral image is causing huge bandwidth bills. What product levers do you have?",
    [
      "Serve smaller, modern formats (WebP or AVIF) and resize for the device.",
      "Lazy-load images below the fold.",
      "Show a thumbnail and load the full image on tap.",
    ],
  ],
  [
    "decision",
    "Why does nothing in this design run your own code?",
    [
      "Serving a static file needs no logic: storage plus a cache at the edge does it.",
      "50 app servers just to read files from storage would cost $1,500 a month.",
      "Every component you don't run is one that can't crash at 3am.",
    ],
  ],
  [
    "decision",
    "How long would you set the CDN cache lifetime for these images, and why?",
    [
      "Very long (a year) if image URLs never change content: treat each URL as immutable.",
      "To 'change' an image, upload it under a new URL. No purge needed.",
      "Only metadata like a gallery listing needs a short TTL.",
    ],
    "What goes wrong if you reuse a URL for a different image?",
  ],
  [
    "decision",
    "How should uploads reach storage?",
    [
      "Directly from the browser to the object store, with a short-lived pre-signed URL from your API.",
      "Your servers never touch the bytes, so they don't need bandwidth or memory for uploads.",
      "Validate size and type in the signed policy, and scan after upload.",
    ],
  ],
  [
    "tradeoff",
    "CDN hit rate vs freshness: where's the tension here, and how do you avoid it?",
    [
      "High hit rate wants long TTLs; deletions and edits want short ones.",
      "Immutable URLs remove the tension for images.",
      "For takedowns, rely on explicit purge, which is slower but rare.",
    ],
  ],
  [
    "tradeoff",
    "One CDN provider or two?",
    [
      "One is simpler and cheaper.",
      "Two (multi-CDN) protects against a provider outage, but needs DNS steering and doubles config work.",
      "For a meme site, one is right. For a major broadcaster, two might be.",
    ],
  ],
  [
    "alternative",
    "Why not run image servers behind a load balancer?",
    [
      "It works, but costs about fifteen times the budget and adds things to operate.",
      "It's justified when you need logic per request: on-the-fly resizing, access checks, watermarking.",
      "Even then, put a CDN in front of it.",
    ],
  ],
  [
    "alternative",
    "Resize images on upload, or on request at the edge?",
    [
      "On upload: predictable cost, fixed set of sizes, files ready to serve.",
      "On request: any size on demand, cached after the first request, but the first view is slow.",
      "Many sites pre-generate common sizes and resize on demand for the rest.",
    ],
  ],
  [
    "scale",
    "Traffic goes from 20,000 to 200,000 requests a second. What breaks first?",
    [
      "Probably not the CDN: they're built for this.",
      "The origin: misses scale with traffic, so 10% of 200,000 is 20,000 a second against a store that handles 5,000.",
      "An origin shield (a CDN tier in front of the origin) collapses repeated misses from many edge locations into one.",
    ],
  ],
  [
    "scale",
    "How would you estimate the monthly bandwidth bill?",
    [
      "Requests per second × average image size × seconds in a month.",
      "20,000 a second × 200KB is about 4GB a second: roughly 10 petabytes a month. Bandwidth dwarfs every other cost.",
      "That's why image size and format are the biggest levers.",
    ],
  ],
  [
    "edge-case",
    "An image must be taken down for legal reasons. Walk through what actually happens.",
    [
      "Delete it from the object store and issue a CDN purge for its URL.",
      "Purges take seconds to minutes to reach every edge location.",
      "Copies in users' browsers and on other sites are out of your control. Say so.",
    ],
  ],
  [
    "edge-case",
    "The origin object store has a regional outage. What do users see?",
    [
      "Images already cached at the edge keep working until their TTL.",
      "New or uncached images fail.",
      "Cross-region replication of the bucket, with a failover origin configured on the CDN, closes the gap.",
    ],
  ],
  [
    "edge-case",
    "What happens if someone requests millions of images that don't exist?",
    [
      "Every request misses the CDN and hits the origin: a cheap way to attack you.",
      "Cache 404s briefly, and rate-limit at the edge.",
      "Use unguessable URLs so enumeration is pointless.",
    ],
  ],
  [
    "security",
    "Someone uploads something illegal or malicious. What's your defence?",
    [
      "Scan uploads (malware and known-illegal-content hashes) before they're made public.",
      "Keep new uploads private until scanning passes.",
      "A reporting flow and a fast takedown path.",
    ],
  ],
  [
    "security",
    "How do you stop people hotlinking your images onto their sites at your expense?",
    [
      "Check the Referer at the CDN, though it's easy to spoof and sometimes missing.",
      "Signed URLs with expiry for anything you want to control tightly.",
      "Or accept it: for a meme site, hotlinking might be free marketing.",
    ],
  ],
  [
    "security",
    "Is a CDN a security component, and how?",
    [
      "It absorbs volumetric DDoS traffic before it reaches you.",
      "It can run a web application firewall at the edge.",
      "It hides your origin: lock the bucket so only the CDN can read it.",
    ],
  ],
  [
    "observability",
    "What would you monitor for a CDN-fronted site?",
    [
      "Cache hit ratio, because origin load is what fails.",
      "Origin request rate and errors.",
      "Edge latency and errors by region, since a problem can be local to one area.",
    ],
  ],
  [
    "observability",
    "Users in one country report broken images. How do you investigate?",
    [
      "Check CDN logs and errors filtered by that region's edge locations.",
      "Look for a regional CDN incident, or a DNS issue routing users badly.",
      "Run synthetic checks from that region.",
    ],
  ],
])

export const UPLOAD_RUSH = deck("upload-rush", [
  [
    "clarify",
    "What would you ask about the upload processing before designing it?",
    [
      "How long does processing take, and does it vary with file size?",
      "Does the user need the result immediately, or is 'ready in a few seconds' acceptable?",
      "What outputs are needed: how many sizes and formats?",
    ],
    "If the product says 'users must see the resized photo instantly', what changes?",
  ],
  [
    "clarify",
    "What would you ask about the files?",
    [
      "Typical and maximum size: a 2MB phone photo is very different from a 200MB RAW file.",
      "Which formats are allowed?",
      "How long are originals kept, and are they ever served?",
    ],
  ],
  [
    "clarify",
    "Is the upload rate steady or bursty?",
    [
      "Bursty (after an event, or on Sunday evening) means the queue absorbs peaks and workers catch up.",
      "Steady means workers must be sized for that rate permanently.",
      "Ask what an acceptable delay is during a burst.",
    ],
  ],
  [
    "product",
    "What should the user see between uploading and the resized photos being ready?",
    [
      "An immediate 'uploaded' confirmation with a local preview from their device.",
      "A processing indicator in the album until the thumbnails exist.",
      "A notification or live update when it's done, and a clear error if it fails.",
    ],
  ],
  [
    "decision",
    "Why does the app server hand the resize to a queue instead of doing it?",
    [
      "The resize takes about two seconds. The user shouldn't wait for it.",
      "It costs about 20 requests' worth of CPU, which would make the app tier huge.",
      "The queue also absorbs bursts: workers drain it at their own pace.",
    ],
  ],
  [
    "decision",
    "How did you size the worker pool?",
    [
      "300 uploads a second, 50 jobs a second per worker: 6 workers at 100%.",
      "Eight runs at 75%, leaving headroom for bursts and for losing one.",
      "In production, autoscale on queue depth or the age of the oldest message.",
    ],
    "Why is CPU a poor autoscaling signal for workers?",
  ],
  [
    "decision",
    "Where does each piece of data live, and why?",
    [
      "Photo bytes in the object store: cheap, durable, unlimited.",
      "Metadata (owner, album, caption, processing state) in the relational database.",
      "Jobs in the queue: transient, deleted once done.",
    ],
  ],
  [
    "tradeoff",
    "What do you give up by making processing asynchronous?",
    [
      "The user doesn't get the final result immediately.",
      "Failures happen after the request has succeeded, so you need a way to report them.",
      "More moving parts: a queue to monitor and workers to scale.",
    ],
  ],
  [
    "tradeoff",
    "At-least-once delivery means a job can run twice. Is that a problem here?",
    [
      "Not if the job is idempotent: writing the same resized file to the same key twice is harmless.",
      "It would be a problem for jobs with side effects, like charging a card or sending an email.",
      "Design every consumer to be safe to repeat.",
    ],
  ],
  [
    "tradeoff",
    "A worker pool vs serverless functions triggered by each upload?",
    [
      "Functions: no pool to size or scale, and you pay per job.",
      "Pool: cheaper at a steady 300 a second, more control over memory and libraries.",
      "Functions have time and memory limits that large images can hit.",
    ],
  ],
  [
    "alternative",
    "Could the browser resize the photo before uploading it?",
    [
      "Yes: smaller uploads, less server work, faster for the user.",
      "But you can't trust the client, and you still need consistent outputs, so server processing remains.",
      "A hybrid: the client uploads a reasonably sized version, the server makes the final sizes.",
    ],
  ],
  [
    "alternative",
    "Why not an event stream instead of a queue?",
    [
      "A queue fits: one kind of consumer, each job done once.",
      "A stream fits when several independent systems need every upload event (search, moderation, analytics).",
      "You can use both: a stream of 'photo uploaded' events, with a resize consumer group.",
    ],
  ],
  [
    "scale",
    "The database is at 60% on writes. What's your plan as uploads grow?",
    [
      "It's the next ceiling, so plan before it hits.",
      "Batch metadata writes, or write processing status less often.",
      "Long term: partition by user, or move upload metadata to a store that scales writes horizontally.",
    ],
  ],
  [
    "scale",
    "A burst brings 3,000 uploads a second for ten minutes. What happens?",
    [
      "The queue grows: 2,700 more jobs a second than workers finish.",
      "That's 1.6 million queued jobs, taking about an hour to drain with eight workers.",
      "Autoscale workers on queue depth, and tell users processing may be slow.",
    ],
  ],
  [
    "edge-case",
    "A corrupt image makes the worker crash every time. What happens to that job?",
    [
      "Without protection, it's retried forever, and might take a worker down each time.",
      "Limit retries, then move the message to a dead-letter queue.",
      "Mark the photo as failed and tell the user.",
    ],
  ],
  [
    "edge-case",
    "The upload succeeds but queueing the job fails. Now what?",
    [
      "The photo exists but is never processed.",
      "The outbox pattern: write the job to the database in the same transaction, then relay it to the queue.",
      "Or trigger processing from the object store's own 'object created' event.",
    ],
  ],
  [
    "edge-case",
    "A user deletes a photo while it's still being processed.",
    [
      "The worker might write resized copies for a deleted photo.",
      "Check the photo still exists before writing results, and clean up orphans with a periodic job.",
      "Make deletion and processing agree through state in the database.",
    ],
  ],
  [
    "security",
    "What are the security risks of processing user-uploaded images?",
    [
      "Image libraries have had serious vulnerabilities: a crafted file can exploit the decoder.",
      "Run workers with minimal permissions, isolated from the rest of the system.",
      "Strip metadata like GPS location before publishing photos.",
    ],
  ],
  [
    "security",
    "How do you make sure users can only see their own private photos?",
    [
      "Store private photos in a private bucket, never public URLs.",
      "Serve them through short-lived signed URLs issued after an authorisation check.",
      "Never rely on unguessable filenames alone.",
    ],
  ],
  [
    "observability",
    "What would tell you the pipeline is falling behind?",
    [
      "Queue depth, and more importantly the age of the oldest message.",
      "Time from upload to 'ready', as a percentile.",
      "Worker error rate and dead-letter queue size.",
    ],
  ],
  [
    "observability",
    "A user says their photo has been 'processing' for an hour. How do you investigate?",
    [
      "Look up the photo's processing state and job ID.",
      "Trace the job: was it queued, picked up, did it fail, is it in the dead-letter queue?",
      "Propagate a trace or correlation ID from upload through the queue to the worker so this is one query.",
    ],
  ],
])

export const ZONE_OUTAGE = deck("zone-outage", [
  [
    "clarify",
    "99.95% availability: what would you ask to pin down what that really means?",
    [
      "Measured how: successful requests, or minutes the homepage loads?",
      "Over what window: monthly or yearly? 99.95% monthly is about 22 minutes.",
      "Does planned maintenance count?",
    ],
    "Which of those answers would most change your design?",
  ],
  [
    "clarify",
    "What failures must it survive, and which are you allowed to ignore?",
    [
      "An instance crash, a zone outage, a whole region going down?",
      "Surviving a region loss means multi-region, which is a far bigger and costlier design.",
      "Get this agreed explicitly; it's the most expensive question in the interview.",
    ],
  ],
  [
    "clarify",
    "What would you ask about the data a payments dashboard shows?",
    [
      "Is this the system of record for payments, or a view of data held elsewhere?",
      "How fresh must balances be: real time, or a minute behind?",
      "Can merchants act on what they see (issue refunds)? That raises the stakes on correctness.",
    ],
  ],
  [
    "clarify",
    "What's the acceptable data loss and recovery time if the primary database dies?",
    [
      "RPO: with synchronous replication to a standby, close to zero.",
      "RTO: an automatic failover typically takes seconds to a minute.",
      "If they need zero downtime and zero loss, that's a different class of database.",
    ],
  ],
  [
    "product",
    "During a zone failover, what can merchants still do, and what should be paused?",
    [
      "Viewing balances: keep it working, even if a little stale.",
      "Refunds: better to block briefly than to risk doing one twice.",
      "Show an honest banner rather than mysterious errors.",
    ],
  ],
  [
    "decision",
    "Why must each zone be able to carry the whole peak on its own?",
    [
      "With two zones, losing one leaves half your instances for all your traffic.",
      "So eight instances, four per zone: four can carry 1,500 a second at about 94% busy.",
      "Busy but not failing is the goal during an outage.",
    ],
    "Is running at 94% during an outage acceptable? What's the risk?",
  ],
  [
    "decision",
    "Why leave the cache in one zone when everything else is in two?",
    [
      "Losing it degrades the system rather than breaking it: reads fall through to the database.",
      "The database can absorb all 1,350 reads a second at about 68%.",
      "A deliberate cost decision, and it only holds as long as the database can absorb a cold cache.",
    ],
  ],
  [
    "decision",
    "Synchronous or asynchronous replication to the standby?",
    [
      "Synchronous: a write isn't confirmed until the standby has it. No data loss on failover, slightly slower writes.",
      "Asynchronous: faster writes, but the last few seconds can be lost.",
      "For payments data, synchronous within a region is the usual choice.",
    ],
  ],
  [
    "tradeoff",
    "Two zones vs three: cost and resilience.",
    [
      "Two zones: 100% spare capacity needed, so 2× the instances.",
      "Three zones: each needs 50% of peak, so 1.5×.",
      "Three also survives one zone being degraded during maintenance in another.",
    ],
  ],
  [
    "tradeoff",
    "How do you weigh the cost of redundancy against the cost of downtime?",
    [
      "Estimate what an hour of downtime costs: lost transactions, support load, SLA credits, reputation.",
      "Compare it to the yearly cost of standbys and spare capacity.",
      "The decision belongs to the business; your job is to make the trade visible.",
    ],
  ],
  [
    "tradeoff",
    "Automatic failover vs manual failover?",
    [
      "Automatic: fast, works at 3am.",
      "But false positives: a network blip can trigger an unnecessary failover, or split brain.",
      "Managed database failover handles the fencing for you, which is a strong reason to use it.",
    ],
  ],
  [
    "alternative",
    "Would you go multi-region for this? When would you?",
    [
      "Not for zone-level failures: multi-zone is enough and far simpler.",
      "Multi-region when the business can't tolerate a region outage, or users are global and need low latency.",
      "Costs: data replication across regions, conflict handling, double the infrastructure.",
    ],
  ],
  [
    "alternative",
    "Would a distributed database that spans zones by itself be better here?",
    [
      "It removes the standby and failover dance: the provider handles it.",
      "But you'd trade relational features (transactions across tables, joins) that payments work relies on.",
      "Distributed SQL databases offer both, at higher cost and some latency.",
    ],
  ],
  [
    "scale",
    "How does the availability arithmetic work for this design?",
    [
      "Serial components multiply: load balancer × app tier × database.",
      "Redundant copies combine as 1 - (1 - a)^n: two app domains at 99% give 99.99%.",
      "The cache doesn't count: losing it degrades, it doesn't fail requests.",
    ],
    "Where's the weakest link now, and what would it cost to strengthen it?",
  ],
  [
    "scale",
    "What other shared dependencies could still take you down, even with all this redundancy?",
    [
      "DNS, the identity provider for logins, a single region's control plane.",
      "Configuration and secrets stores.",
      "A bad deploy is the most common cause of outages, and redundancy doesn't help with it.",
    ],
  ],
  [
    "edge-case",
    "Split brain: what is it, and how is it prevented?",
    [
      "Both the old primary and the promoted standby accept writes at once, and the data diverges.",
      "Prevented by fencing: the old primary must be cut off before the new one is promoted.",
      "Managed databases and consensus-based systems handle this, which is why rolling your own failover is risky.",
    ],
  ],
  [
    "edge-case",
    "The zone isn't down, just very slow. Is that worse?",
    [
      "Often, yes: health checks may still pass, so traffic keeps going to slow instances.",
      "Use latency-aware health checks, timeouts, and outlier detection to eject slow instances.",
      "Gray failures are harder to detect than clean ones.",
    ],
  ],
  [
    "edge-case",
    "A refund request arrives just as the database fails over. What goes wrong, and how do you stop it?",
    [
      "The client times out and retries, and the refund could happen twice.",
      "Idempotency keys: the client sends a unique key, and the server refuses to repeat a completed operation.",
      "This matters for any operation that moves money.",
    ],
  ],
  [
    "security",
    "What security controls does a payments dashboard need beyond the basics?",
    [
      "Strong authentication (multi-factor) for merchants, especially for refunds.",
      "An audit log of every sensitive action, written somewhere tamper-resistant.",
      "Least privilege: support staff see what they need, not full card data.",
    ],
  ],
  [
    "security",
    "Are backups a security concern as well as a reliability one?",
    [
      "Yes: a backup holds all the data, so encrypt it and restrict access tightly.",
      "Ransomware targets backups: keep immutable or offline copies.",
      "Test restores regularly; an untested backup isn't a backup.",
    ],
  ],
  [
    "observability",
    "How would you know a zone is failing before the provider tells you?",
    [
      "Break down error rate and latency by zone.",
      "Watch for health check failures clustering in one zone.",
      "Synthetic checks per zone.",
    ],
  ],
  [
    "observability",
    "How do you prove the design actually survives a zone loss?",
    [
      "Chaos testing: deliberately take a zone out of rotation in a controlled window.",
      "Game days, where the team practises the failover runbook.",
      "Measure real failover time and data loss, and compare with the targets.",
    ],
  ],
])

export const FEED_THE_ANALYSTS = deck("feed-the-analysts", [
  [
    "clarify",
    "What would you ask about how fresh search and analytics need to be?",
    [
      "Search: should a new product or order be findable in seconds, or is a minute fine?",
      "Analytics: do finance need real time, hourly, or daily numbers?",
      "These answers decide between streaming, micro-batch and nightly batch.",
    ],
    "If finance says 'real time', what do you ask next?",
  ],
  [
    "clarify",
    "How many systems need order data today, and how many will next year?",
    [
      "Two consumers could be wired directly; five can't be.",
      "Likely future consumers: email, fraud checks, loyalty points, recommendations.",
      "The answer justifies the event stream.",
    ],
  ],
  [
    "clarify",
    "What would you ask about the order events themselves?",
    [
      "Do consumers need the full order or just an ID to look up?",
      "Does order matter: must a cancellation never be processed before its order?",
      "How long must events be kept and replayable?",
    ],
  ],
  [
    "product",
    "A customer searches for an order they placed a second ago and can't find it. Is that acceptable?",
    [
      "For product search, yes. For 'my orders', probably not.",
      "Serve 'my orders' from the database, not the search index.",
      "Choose per feature which source is authoritative.",
    ],
  ],
  [
    "decision",
    "Why an event stream rather than a queue for order events?",
    [
      "A queue gives each message to one consumer, so search and the warehouse would split orders between them.",
      "A stream lets each consumer group read every event independently.",
      "It also keeps history, so a new consumer can replay old events.",
    ],
  ],
  [
    "decision",
    "Why must the warehouse stay off the checkout path?",
    [
      "It's built for big scans, not small fast lookups: seconds per query.",
      "Checkout would wait on it, and fail when it's busy or down.",
      "Asynchronously, it just ingests 320 events a second, which is trivial for it.",
    ],
  ],
  [
    "decision",
    "What would you choose as the partition key for order events, and why?",
    [
      "Order ID or customer ID: all events for one order land in one partition, so they stay in order.",
      "Avoid a key with a few huge values (like a merchant ID on a marketplace), which creates hot partitions.",
      "The key fixes ordering guarantees and parallelism together.",
    ],
  ],
  [
    "tradeoff",
    "The app writes to the database and publishes an event. What can go wrong?",
    [
      "The dual-write problem: one succeeds and the other fails, so they disagree.",
      "Outbox pattern: write the event to an outbox table in the same transaction, then relay it.",
      "Or change data capture: stream changes from the database's own log.",
    ],
    "Which would you choose, and why?",
  ],
  [
    "tradeoff",
    "What does eventual consistency cost you in this design?",
    [
      "Search and analytics briefly disagree with the database.",
      "Bugs that only show under lag are hard to reproduce.",
      "You gain isolation: a slow or broken consumer can't hurt checkout.",
    ],
  ],
  [
    "tradeoff",
    "Exactly-once processing: can you have it, and do you need it?",
    [
      "End-to-end exactly-once is hard; most systems are at-least-once with idempotent consumers.",
      "The search index is naturally idempotent: re-indexing an order gives the same result.",
      "Warehouse loads need deduplication on order ID.",
    ],
  ],
  [
    "alternative",
    "Change data capture vs publishing events from the app?",
    [
      "CDC: no app changes, can't miss a write, events mirror database rows exactly.",
      "App events: express business meaning ('order placed') rather than table changes.",
      "Many teams use CDC into an outbox table, getting both.",
    ],
  ],
  [
    "alternative",
    "Nightly batch export to the warehouse instead of streaming?",
    [
      "Much simpler, and fine if finance only needs yesterday's numbers.",
      "Batch jobs put heavy load on the database at night; read from a replica.",
      "Streaming earns its complexity when freshness or multiple consumers matter.",
    ],
  ],
  [
    "scale",
    "Order volume grows 10×. What do you check?",
    [
      "The database primary is at 64%, so it's the first to break.",
      "Stream throughput: add partitions, but changing partition count reshuffles keys.",
      "Search indexing rate, which is often the slowest consumer.",
    ],
  ],
  [
    "scale",
    "One consumer falls hours behind. What's the impact on everyone else?",
    [
      "None on checkout or other consumers: that's the point of the stream.",
      "Its own data gets stale, and it must catch up within the retention window or lose events.",
      "Monitor consumer lag per group.",
    ],
  ],
  [
    "edge-case",
    "An order is placed, then cancelled a second later. Can search show it as active?",
    [
      "Only if the events are processed out of order.",
      "Same partition key keeps them in order within one consumer.",
      "Consumers can also check a version number and ignore older updates.",
    ],
  ],
  [
    "edge-case",
    "You ship a bug that indexes orders wrongly for a day. How do you fix the data?",
    [
      "Fix the consumer, then replay the stream from before the bug.",
      "Possible only because the stream keeps history: one advantage over a queue.",
      "If retention is shorter than the bug, rebuild from the database instead.",
    ],
  ],
  [
    "edge-case",
    "A malformed event crashes the search consumer every time it reads it. What now?",
    [
      "A poison message blocks that partition.",
      "Catch the error, send the event to a dead-letter topic, and move on.",
      "Schema validation at the producer prevents most of these.",
    ],
  ],
  [
    "security",
    "Order events contain customer details. What should and shouldn't go in them?",
    [
      "Include only what consumers need: maybe an order ID, totals and items, not full addresses or card data.",
      "Every consumer that receives PII increases your compliance scope.",
      "Encrypt the stream and restrict which services can read which topics.",
    ],
  ],
  [
    "security",
    "A customer asks for their data to be deleted. What's hard about that here?",
    [
      "Their data is now in the database, the search index, the warehouse and the stream's history.",
      "Each store needs a deletion path, and the stream's retention must be accounted for.",
      "Pseudonymise analytics data so deleting the identity mapping is enough.",
    ],
  ],
  [
    "observability",
    "How would you monitor an event pipeline?",
    [
      "Consumer lag per consumer group, in messages and in time.",
      "Publish rate vs consume rate.",
      "Dead-letter topic size, and end-to-end latency from order to searchable.",
    ],
  ],
  [
    "observability",
    "Finance says the warehouse revenue doesn't match the database. How do you investigate?",
    [
      "Reconciliation: count and sum orders per hour in both, and find where they diverge.",
      "Check for dropped or duplicated events in that window.",
      "Build that reconciliation as a scheduled check, not a one-off.",
    ],
  ],
])
