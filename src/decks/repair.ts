import { deck } from "./build"

export const LOST_WRITES = deck("lost-writes", [
  [
    "clarify",
    "Customers say their changes vanish. What do you ask before touching anything?",
    [
      "Which changes, since when, and for all users or some?",
      "Does the save appear to succeed? Do they see the change briefly, then lose it?",
      "What changed recently: a deploy, a config change, a database migration?",
    ],
    "Why does 'what changed recently' come before any theory?",
  ],
  [
    "clarify",
    "What would you check first in the data itself?",
    [
      "Is the edit in the primary database at all?",
      "Is it in the replica but not the primary, or the other way round?",
      "Are there errors in the app logs at the time of the save?",
    ],
  ],
  [
    "clarify",
    "Is this a durability problem, a consistency problem, or a display problem?",
    [
      "Durability: the write was never stored, or was lost.",
      "Consistency: it was stored, but a reader sees an older copy.",
      "Display: it's stored and read correctly, but rendered wrongly.",
    ],
    "Which one is this incident, and what's the evidence?",
  ],
  [
    "product",
    "How do you tell affected customers, and what do you say?",
    [
      "Be honest and specific: which changes in which window may be lost.",
      "If you can recover data (from logs or client drafts), say so.",
      "Product fix: keep unsent drafts on the client so a failed save never loses typing.",
    ],
  ],
  [
    "decision",
    "Why was nothing erroring even though every write was lost?",
    [
      "The app was only connected to a replica, so writes had nowhere to go.",
      "In a real system they'd usually fail loudly against a read-only replica. Silent loss means a code path swallowed the error.",
      "Silent failures are the most dangerous kind: green dashboards, angry users.",
    ],
  ],
  [
    "decision",
    "What's the right fix: send everything to the primary, or split reads and writes?",
    [
      "At 600 requests a second, the primary can take everything. That's simpler and has no lag issues.",
      "A read/write split gives headroom for read growth, at the cost of replication lag.",
      "Choose the simpler option unless the read load demands otherwise.",
    ],
  ],
  [
    "decision",
    "How would you make routing writes to a replica impossible in future?",
    [
      "Separate connection settings for reads and writes, so code has to pick one deliberately.",
      "Use database credentials on the replica that can't write at all.",
      "A test or startup check that the write connection points at a writable primary.",
    ],
  ],
  [
    "tradeoff",
    "Once reads go to the replica, what new problem do you take on?",
    [
      "Replication lag: an agent saves, reloads, and reads a copy from a few milliseconds ago.",
      "Usually invisible, but lag can grow to seconds under load.",
      "Fixes: read your own recent writes from the primary, or wait for the replica to catch up.",
    ],
  ],
  [
    "tradeoff",
    "Keep the replica, or remove it after the fix?",
    [
      "Remove: $400 a month saved, simpler, no lag.",
      "Keep: read headroom, a warm copy for reporting queries, and faster recovery options.",
      "Either is defensible. Say what you'd measure to decide.",
    ],
  ],
  [
    "alternative",
    "Could a database proxy have prevented this?",
    [
      "A proxy can route writes to the primary and reads to replicas automatically.",
      "It also pools connections and handles failover.",
      "It's another component, but takes routing decisions out of application code.",
    ],
  ],
  [
    "alternative",
    "Could you recover the lost edits?",
    [
      "From app logs, if the payloads were logged (which raises privacy concerns).",
      "From client-side drafts, if the app kept them.",
      "From a queue or event log, if writes went through one. Without any of these, they're gone.",
    ],
  ],
  [
    "scale",
    "Reads grow 5×. How does the read/write split hold up?",
    [
      "Add replicas behind a reader endpoint to spread reads.",
      "Watch replication lag: more load on replicas can slow how fast they apply changes.",
      "Consider a cache for the hottest reads before adding many replicas.",
    ],
  ],
  [
    "edge-case",
    "An agent saves a ticket, and the next page load shows the old version. Bug or expected?",
    [
      "Expected with replication lag, but users experience it as a bug.",
      "Fix with read-your-writes: route that user's reads to the primary briefly after a write.",
      "Or return the saved object in the save response and display that.",
    ],
  ],
  [
    "edge-case",
    "The replica falls an hour behind. What do users see?",
    [
      "Hour-old tickets: replies seem missing, statuses wrong.",
      "Alert on lag and pull a lagging replica out of rotation automatically.",
      "Fall back to reading from the primary.",
    ],
  ],
  [
    "resilience",
    "The primary fails and the replica is promoted. What happens to writes in flight?",
    [
      "With async replication, the last moments of writes may not have reached the replica: lost.",
      "That's the RPO. Know it, and choose synchronous replication if it must be zero.",
      "Clients should retry with idempotency keys.",
    ],
  ],
  [
    "security",
    "Is 'any code can choose any database connection' a security concern?",
    [
      "Yes: least privilege says read paths should use read-only credentials.",
      "Separate roles limit what a compromised component or SQL injection can do.",
      "Here it would also have turned silent data loss into a loud error.",
    ],
  ],
  [
    "observability",
    "What monitoring would have caught this on day one?",
    [
      "Writes per second on the primary: it dropped to zero after the change.",
      "A synthetic check that creates a ticket, reads it back from the primary, then deletes it.",
      "Error rates on save endpoints, if errors weren't swallowed.",
    ],
    "Why is 'a metric suddenly went to zero' easy to miss on a dashboard?",
  ],
  [
    "observability",
    "What should a postmortem for this incident cover?",
    [
      "Timeline: the change, when the first customer reported it, when it was detected, when it was fixed.",
      "Why monitoring didn't catch it, and what's added so it would.",
      "Blameless: focus on why the system allowed it, not who deployed it.",
    ],
  ],
  [
    "observability",
    "How would you measure replication lag, and what's an acceptable value?",
    [
      "The database reports it, or write a heartbeat row on the primary and read its timestamp on the replica.",
      "Normally milliseconds; alert at seconds.",
      "Graph it next to write volume: lag usually rises with write load.",
    ],
  ],
  [
    "product",
    "Should the UI ever tell the user 'saved' before the database confirms it?",
    [
      "Optimistic UI feels fast, but it's misleading if the save later fails.",
      "If you do it, show clearly when a save fails and keep the draft.",
      "For important data, wait for confirmation, which only takes milliseconds anyway.",
    ],
  ],
  [
    "resilience",
    "The primary's disk fills up at the day's peak. What happens, and how do you recover?",
    [
      "Writes fail while reads from replicas keep working, so the app looks half alive.",
      "Free space or grow the volume; managed databases can do it without downtime.",
      "Alarm on disk at 80%, and on growth rate, so this is a ticket rather than an outage.",
    ],
  ],
])

export const BLACK_FRIDAY = deck("black-friday", [
  [
    "clarify",
    "Checkout is timing out. What do you ask before scaling anything?",
    [
      "What exactly is slow or failing: all pages, or checkout only?",
      "Which component is saturated? Utilisation per tier, not overall.",
      "What's the traffic now vs normal, and what's the read/write mix?",
    ],
    "Why is 'add more app servers' a dangerous first move?",
  ],
  [
    "clarify",
    "What would you ask about the catalogue data?",
    [
      "How often do prices and stock change?",
      "Is the catalogue the same for every shopper, or personalised?",
      "How bad is showing a price a few seconds old?",
    ],
  ],
  [
    "clarify",
    "Is this traffic expected to last, or is it a one-day spike?",
    [
      "A spike can justify temporary over-provisioning.",
      "A lasting change needs a structural fix.",
      "Black Friday is predictable: you could have load-tested for it.",
    ],
  ],
  [
    "product",
    "During the sale, which features would you switch off to protect checkout?",
    [
      "Recommendations, reviews, 'customers also bought' widgets.",
      "Anything expensive that isn't on the path to paying.",
      "Feature flags make this a quick switch rather than a deploy.",
    ],
  ],
  [
    "decision",
    "How did you identify the database as the real bottleneck?",
    [
      "Its utilisation was over 100%: 11,250 reads a second against about 10,000 of capacity.",
      "The app tier was at 63%, so not saturated.",
      "Always find the saturated component; scaling anything else only adds cost.",
    ],
  ],
  [
    "decision",
    "Why is a cache the right fix rather than a bigger database?",
    [
      "The catalogue is identical for every shopper, so it caches almost perfectly.",
      "A $150 cache absorbs about 9,000 reads a second.",
      "A bigger database means a failover or migration in the middle of the busiest day of the year.",
    ],
  ],
  [
    "decision",
    "You have to fix this during the sale. What's the safest order of changes?",
    [
      "First relieve pressure: shed or degrade non-essential features.",
      "Add the cache with a short TTL and a fallback to the database if it fails.",
      "Roll it out gradually, watching database load.",
    ],
  ],
  [
    "tradeoff",
    "Stock levels in the cache can be stale. How do you avoid overselling?",
    [
      "Show cached stock as a guide on product pages.",
      "Check and decrement stock in the database, transactionally, at checkout.",
      "Accept that a shopper might occasionally see 'in stock' and then be told it's sold out.",
    ],
    "Which is worse for the business: overselling, or showing 'sold out' too early?",
  ],
  [
    "tradeoff",
    "Read replicas vs a cache for the catalogue?",
    [
      "Replicas: any query, near-real-time, $400 each, take minutes to add.",
      "Cache: only shared hot data, a little stale, $150, and absorbs far more.",
      "For a hot, identical catalogue, the cache wins on cost and capacity.",
    ],
  ],
  [
    "tradeoff",
    "The ten app servers turned out not to be the problem. Should you scale them back down now?",
    [
      "Not during the sale: they're cheap insurance compared with an outage.",
      "Afterwards, right-size them from measured utilisation.",
      "Autoscaling makes this automatic.",
    ],
  ],
  [
    "alternative",
    "Could a CDN take some of this load?",
    [
      "Yes: product pages and images that are the same for everyone can be cached at the edge.",
      "Then requests don't even reach the app tier.",
      "Be careful with prices and stock; give them short TTLs or load them separately.",
    ],
  ],
  [
    "alternative",
    "A waiting room or queue for shoppers: when is that the right call?",
    [
      "When demand exceeds what you can serve, even after fixes.",
      "Better a fair queue than random failures for everyone.",
      "Common for ticket sales and limited drops.",
    ],
  ],
  [
    "scale",
    "How would you have known in advance that the database would fall over?",
    [
      "Load test at the expected peak (and beyond) before the event.",
      "Capacity plan: forecast traffic, multiply by reads per request, compare with database limits.",
      "Look for the component with the least headroom.",
    ],
  ],
  [
    "scale",
    "With the cache in place, what's the next bottleneck?",
    [
      "Database writes: orders and baskets at 42% now, and they all go to one primary.",
      "Then the app tier at higher traffic.",
      "Partitioning baskets or moving them to a store that scales writes horizontally is the long-term fix.",
    ],
  ],
  [
    "resilience",
    "The cache node restarts mid-sale. What happens?",
    [
      "All reads fall through, and the database is overloaded again.",
      "Two cache nodes, request coalescing, and a circuit breaker to shed load if the database struggles.",
      "Warm the cache before the sale starts.",
    ],
  ],
  [
    "edge-case",
    "A price is changed during the sale. When do shoppers see it?",
    [
      "When the cache entry expires or is invalidated.",
      "Invalidate on change for prices; never let a stale price reach checkout.",
      "Charge the price confirmed at checkout, read from the database.",
    ],
  ],
  [
    "resilience",
    "Retries make it worse: timeouts cause retries, which add load. How do you stop the spiral?",
    [
      "Exponential backoff with jitter on retries.",
      "Retry budgets: cap retries as a share of traffic.",
      "Circuit breakers to fail fast instead of piling on a struggling database.",
    ],
  ],
  [
    "security",
    "Big sales attract bots. What do they do, and how do you defend?",
    [
      "Scalpers buy limited stock; scrapers hammer catalogue pages; credential stuffers try stolen logins.",
      "Rate limits per IP and account, bot detection, and purchase limits per customer.",
      "Bots also add load, so blocking them is a capacity fix too.",
    ],
  ],
  [
    "observability",
    "What would have shown the real bottleneck at a glance?",
    [
      "A per-component saturation view: CPU, connections and query rate for the database next to the app tier.",
      "Slow query logs on the database.",
      "Traces showing where time is spent in a slow checkout.",
    ],
  ],
  [
    "observability",
    "How do you know the fix worked?",
    [
      "Database read rate and CPU drop; checkout error rate and latency return to target.",
      "Cache hit rate is high and steady.",
      "Keep watching through the rest of the peak; fixes can fail under different patterns.",
    ],
  ],
])

export const SLOW_CHECKOUT = deck("slow-checkout", [
  [
    "clarify",
    "Checkout takes two seconds. What do you ask to find out where the time goes?",
    [
      "Is it slow for every order, or some?",
      "Do you have a trace showing time per step?",
      "What does checkout do, step by step, between click and response?",
    ],
    "Why is a trace better than guessing from code?",
  ],
  [
    "clarify",
    "What would you ask about the invoice?",
    [
      "Does the customer need it immediately, on the confirmation page?",
      "Is it legally required to be issued at the moment of purchase?",
      "Is it emailed, downloaded, or both?",
    ],
  ],
  [
    "clarify",
    "Which steps of checkout must happen before you say 'order confirmed'?",
    [
      "Taking payment and recording the order: yes, synchronously.",
      "Invoice, confirmation email, warehouse notification, analytics: they can follow.",
      "Separating 'must happen now' from 'must happen eventually' is the core skill.",
    ],
  ],
  [
    "product",
    "What does the confirmation page show if the invoice isn't ready yet?",
    [
      "'Your invoice is being prepared and will be emailed to you.'",
      "A download link that becomes active when ready.",
      "Most customers never look at it immediately anyway; check analytics.",
    ],
  ],
  [
    "decision",
    "How did you identify the PDF rendering as the culprit?",
    [
      "The app tier's p99 was in seconds and it was saturated, while the database was relaxed.",
      "Rendering a PDF is CPU-heavy and slow, and it ran inside every checkout request.",
      "The giveaway: the slowest component was doing work the user didn't need.",
    ],
  ],
  [
    "decision",
    "Why does moving the PDF to a queue shrink the app tier from ten instances to two?",
    [
      "Each inline render cost about 750 requests' worth of CPU.",
      "Without it, each instance handles ordinary requests only.",
      "The render work doesn't disappear; it moves to workers sized for it.",
    ],
  ],
  [
    "decision",
    "How many workers, and how do you decide?",
    [
      "8 orders a second at about 2.7 renders a second per worker: three at 100%.",
      "Five gives headroom and survives losing one.",
      "Scale on the age of the oldest job, so invoices never get too far behind.",
    ],
  ],
  [
    "tradeoff",
    "What's harder once invoices are asynchronous?",
    [
      "Failures happen after the customer has left the page.",
      "You need retries, a dead-letter queue, and a way to alert and reissue.",
      "Support needs to see invoice status for an order.",
    ],
  ],
  [
    "tradeoff",
    "Generate on purchase, or on first request?",
    [
      "On purchase: ready when needed, but wasted work for invoices nobody opens.",
      "On demand: no waste, but the first download is slow, and that load is unpredictable.",
      "Legal requirements often decide it: some places require issuing at purchase.",
    ],
  ],
  [
    "tradeoff",
    "The queue adds a dependency to checkout. Is checkout now less available?",
    [
      "Slightly: if the queue is down, enqueueing fails.",
      "A managed queue is highly available, usually more than your app.",
      "The outbox pattern removes even that: write the job in the order transaction and relay it later.",
    ],
  ],
  [
    "alternative",
    "Could you just make PDF generation faster instead?",
    [
      "Maybe: a lighter library, templates rendered once, or HTML instead of PDF.",
      "That helps but doesn't change the principle: slow work the user doesn't need should leave the request path.",
      "Do both if the cost of workers matters.",
    ],
  ],
  [
    "alternative",
    "What else in a typical checkout belongs off the request path?",
    [
      "Confirmation emails, loyalty points, analytics events, warehouse and shipping notifications.",
      "Fraud scoring is a judgement call: some must block the order, some can run after.",
      "An 'order placed' event that each of these consumes is cleaner than one queue per task.",
    ],
  ],
  [
    "scale",
    "Orders double during a sale. What happens to invoices?",
    [
      "The queue absorbs the burst; invoices are delayed, not lost.",
      "Workers autoscale on queue age.",
      "Checkout itself is unaffected, which is the point.",
    ],
  ],
  [
    "resilience",
    "The invoice job fails for one order and keeps failing. What should happen?",
    [
      "Retry a few times with backoff, then move it to a dead-letter queue.",
      "Alert someone, and mark the invoice as failed on the order.",
      "Have a tool to retry it once the bug is fixed.",
    ],
  ],
  [
    "edge-case",
    "The order is refunded before its invoice is generated. What do you do?",
    [
      "The worker should check the order's current state before rendering.",
      "Perhaps issue a credit note instead, depending on accounting rules.",
      "Asynchronous systems must expect the world to change between enqueue and processing.",
    ],
  ],
  [
    "edge-case",
    "A job runs twice and the customer gets two invoices. How do you prevent it?",
    [
      "Make the job idempotent: one invoice number per order, generated once.",
      "Before rendering, check whether that order's invoice already exists.",
      "Store it under a fixed key so a second run overwrites rather than duplicates.",
    ],
  ],
  [
    "security",
    "Invoices contain names, addresses and amounts. How do you serve them safely?",
    [
      "Private storage, never public URLs.",
      "Short-lived signed links issued only after checking the requester owns the order.",
      "Don't put guessable order numbers in URLs that grant access.",
    ],
  ],
  [
    "observability",
    "What would have told you about this sooner?",
    [
      "A trace of checkout showing a long span for PDF rendering.",
      "p99 latency per endpoint, with checkout standing out.",
      "CPU per request on the app tier.",
    ],
  ],
  [
    "observability",
    "What should you track once invoices are asynchronous?",
    [
      "Time from order to invoice ready, as a percentile.",
      "Queue age and dead-letter queue size.",
      "Orders with no invoice after, say, an hour: a reconciliation check.",
    ],
  ],
  [
    "product",
    "What latency do customers really need from checkout, and why?",
    [
      "Under a second feels instant; multiple seconds makes people double-click or abandon.",
      "Slow checkouts cost conversion, which is measurable revenue.",
      "Use that to justify engineering time on latency.",
    ],
  ],
  [
    "resilience",
    "The invoice provider is down for an hour during a sale.",
    [
      "Orders keep succeeding: invoices are queued, not part of checkout.",
      "Jobs retry with growing delays rather than hammering a provider that's struggling.",
      "When it recovers, the backlog drains at the provider's rate limit, not all at once.",
    ],
  ],
])

export const THREE_AM_PAGE = deck("three-am-page", [
  [
    "clarify",
    "You're told 'we fixed it after the last outage'. What do you ask?",
    [
      "What exactly failed last time, and what was changed?",
      "Has the fix been tested by actually failing a zone?",
      "What's still single-instance or single-zone anywhere on the request path?",
    ],
    "Why is 'has it been tested' the question people least like answering?",
  ],
  [
    "clarify",
    "What availability target is the booking app held to, and who decided?",
    [
      "A contractual SLA, an internal SLO, or a vague expectation?",
      "What does an hour of downtime cost in lost bookings?",
      "That number justifies (or doesn't) the cost of a standby.",
    ],
  ],
  [
    "clarify",
    "What would you ask about recovery?",
    [
      "If the database is lost, how much data can you lose (RPO), and how fast must you be back (RTO)?",
      "Are backups taken, and when was a restore last tested?",
      "Who gets paged, and is there a runbook?",
    ],
  ],
  [
    "product",
    "During a failover, can bookings be taken safely?",
    [
      "If writes are blocked for seconds, show 'try again shortly' rather than a generic error.",
      "Never confirm a booking that wasn't committed.",
      "Double bookings during recovery are worse than a short pause.",
    ],
  ],
  [
    "decision",
    "How did you find the remaining single point of failure?",
    [
      "Walk the request path box by box and ask 'what if this dies?'",
      "The app tier had three zones. The database was one instance in one zone.",
      "Availability multiplies, so one weak link caps everything.",
    ],
  ],
  [
    "decision",
    "Why a standby rather than a read replica you'd promote by hand?",
    [
      "A standby is built for automatic failover: fast, fenced, no human needed at 3am.",
      "Promoting a replica manually is slower and easy to get wrong under pressure.",
      "Replicas are for read capacity; standbys are for availability.",
    ],
  ],
  [
    "decision",
    "Does the app tier need changes as well?",
    [
      "Three instances over three zones: losing one zone leaves two, enough for peak at 60%.",
      "The app must reconnect to the new primary after failover, so check DNS caching and connection pools.",
      "Retries with backoff smooth over the failover window.",
    ],
  ],
  [
    "tradeoff",
    "A standby costs as much as the primary and serves no traffic. When is it not worth it?",
    [
      "When downtime is cheap: internal tools, batch systems with retries.",
      "When the managed service already gives you zone redundancy.",
      "When the business accepts the risk explicitly. Write that decision down.",
    ],
  ],
  [
    "tradeoff",
    "Synchronous replication to the standby slows writes. Is it worth it for bookings?",
    [
      "Yes for bookings: losing a confirmed booking is costly and embarrassing.",
      "The added latency within a region is usually a millisecond or two.",
      "Across regions it would be much more, which is why cross-region is usually async.",
    ],
  ],
  [
    "alternative",
    "Would a managed database that's zone-redundant by default be simpler?",
    [
      "Yes: zone redundancy becomes a setting, not an architecture.",
      "Check what 'redundant' means: automatic failover time, data loss guarantees.",
      "Cost is usually similar to running a standby yourself.",
    ],
  ],
  [
    "alternative",
    "How would you design this to survive a whole region going down?",
    [
      "A second region with a replica database, and app servers ready (warm or cold).",
      "DNS or global load balancing to steer traffic.",
      "Async replication across regions means accepting some data loss, or paying in latency for sync.",
    ],
    "Active-active or active-passive, and why?",
  ],
  [
    "scale",
    "What other single points of failure hide outside the obvious request path?",
    [
      "DNS, the certificate (has it ever expired at night?), the identity provider.",
      "The CI/CD system and the container registry, which you need to deploy a fix.",
      "Shared configuration, secrets and the monitoring system itself.",
    ],
  ],
  [
    "edge-case",
    "The failover happens, but the app keeps trying the old primary. Why?",
    [
      "Cached DNS or long-lived connections pointing at the old address.",
      "Keep DNS TTLs short for the database endpoint, and make pools drop broken connections.",
      "Test it, because this is exactly what goes wrong in real failovers.",
    ],
  ],
  [
    "resilience",
    "Zone A comes back. What happens now?",
    [
      "The old primary must not come back as a second primary: that's split brain.",
      "It rejoins as the new standby.",
      "Rebalance app instances back across zones gradually.",
    ],
  ],
  [
    "resilience",
    "The failure is a corrupted database, not a lost zone. Does the standby help?",
    [
      "No: replication faithfully copies the corruption, or the bad delete.",
      "That's what point-in-time backups are for.",
      "Availability and durability are different problems with different tools.",
    ],
  ],
  [
    "security",
    "How do you make sure an attacker can't trigger your failover, or delete your backups?",
    [
      "Restrict who can change database configuration, with strong authentication and audit logs.",
      "Keep backups in a separate account, or immutable storage.",
      "Alert on unexpected failovers and deletions.",
    ],
  ],
  [
    "observability",
    "What should page someone at 3am, and what should wait for the morning?",
    [
      "Page: users can't book (error rate or latency over target), or the primary is down with no standby.",
      "Morning: one app instance died, or the standby is lagging slightly.",
      "Every page should need human action; otherwise fix the alert.",
    ],
  ],
  [
    "observability",
    "How do you prove you'd survive the next zone outage?",
    [
      "Scheduled failover drills, and chaos experiments in a controlled window.",
      "Measure failover time and errors during it.",
      "Update the runbook with what you learn.",
    ],
  ],
  [
    "observability",
    "What belongs in the postmortem for the original outage?",
    [
      "Timeline, impact in bookings and users, and the root cause (single database in one zone).",
      "Why the earlier fix missed it: it addressed the visible symptom (app servers).",
      "Action items with owners: the standby, a failover drill, alerting gaps.",
    ],
  ],
  [
    "product",
    "How would you explain the cost of the standby to a non-technical stakeholder?",
    [
      "In outage terms: 'one zone failure takes us down for hours; with this, it's a minute'.",
      "In money: what the last outage cost vs $400 a month.",
      "Avoid jargon; translate nines into minutes of downtime.",
    ],
  ],
])

export const ANALYTICS_ATE_PROD = deck("analytics-ate-prod", [
  [
    "clarify",
    "Finance asked for 'real-time' dashboards. What do you ask them?",
    [
      "What decision is made from the dashboard, and how quickly after the data changes?",
      "Would five minutes old be fine? An hour? Usually yes.",
      "Which numbers specifically: sign-ups today, revenue, churn?",
    ],
    "How do you push back on 'real time' without saying no?",
  ],
  [
    "clarify",
    "What would you ask about how the warehouse is used?",
    [
      "Who queries it, how often, and how heavy are the queries?",
      "Is it the source of truth for anything, or only a copy for analysis?",
      "What data must be in it, and how far back?",
    ],
  ],
  [
    "clarify",
    "What would you ask about the events that feed it?",
    [
      "Which actions matter: sign-up, upgrade, cancellation, payment?",
      "Do analysts need full state (the customer record) or just events?",
      "Must they be able to reprocess history if a metric's definition changes?",
    ],
  ],
  [
    "product",
    "What's the user impact of the current design, in product terms?",
    [
      "Every action waits on the warehouse: four-second page loads and failures.",
      "Sign-ups and upgrades fail, so revenue is lost to make a dashboard faster.",
      "An internal nice-to-have is hurting the customer-facing product.",
    ],
  ],
  [
    "decision",
    "Why is a data warehouse a bad thing to call during a request?",
    [
      "It's optimised for big scans across billions of rows, not for answering one small query fast.",
      "Its queries take seconds, and it handles few concurrent small requests.",
      "When it's busy with an analyst's big query, your users wait.",
    ],
  ],
  [
    "decision",
    "Why an event stream between the app and the warehouse?",
    [
      "The app publishes and moves on; the warehouse loads at its own pace.",
      "If the warehouse is slow or down, the app doesn't notice.",
      "Other consumers can read the same events later.",
    ],
  ],
  [
    "decision",
    "How fresh will the dashboards be now, and is that acceptable?",
    [
      "Minutes behind, depending on how often the warehouse loads batches.",
      "For finance, almost always fine; check with them, and agree it explicitly.",
      "If something truly needs seconds, serve that one metric from a small real-time store.",
    ],
  ],
  [
    "tradeoff",
    "Publishing events from the app vs change data capture from the database?",
    [
      "App events carry business meaning but risk the dual-write problem.",
      "CDC captures every committed change reliably with no app changes, but events mirror tables, not intent.",
      "CDC is often the quickest safe fix for an existing app.",
    ],
  ],
  [
    "tradeoff",
    "Streaming into the warehouse vs micro-batches every few minutes?",
    [
      "Streaming: freshest, but many small loads can be inefficient or costly for a warehouse.",
      "Micro-batches: efficient bulk loads, a few minutes stale.",
      "Most warehouses prefer batching; pick the interval from the freshness requirement.",
    ],
  ],
  [
    "alternative",
    "Could analysts just query a read replica of the production database?",
    [
      "For light reporting, yes: it's simple and fully consistent.",
      "Heavy analytical queries can still slow the replica, and replication with it.",
      "It doesn't scale to years of history or joins across many sources.",
    ],
  ],
  [
    "alternative",
    "When does a nightly batch job beat all of this?",
    [
      "When yesterday's numbers are good enough, which they often are.",
      "Simplest to build and run.",
      "Run it from a replica to keep load off the primary.",
    ],
  ],
  [
    "scale",
    "Event volume grows 100×. What changes?",
    [
      "The stream needs more partitions or throughput.",
      "Warehouse loading must batch efficiently; storage and query costs grow.",
      "Partition warehouse tables by date so queries scan less.",
    ],
  ],
  [
    "resilience",
    "The warehouse is down for maintenance for six hours. What happens?",
    [
      "Events wait in the stream, which must retain them long enough.",
      "When it's back, it catches up from where it left off.",
      "The app is unaffected, which is the point.",
    ],
  ],
  [
    "edge-case",
    "The same event is loaded twice. How do you keep metrics correct?",
    [
      "Give every event a unique ID and deduplicate on load.",
      "Or use upserts (merge on key) rather than appends.",
      "Run reconciliation checks against the source database.",
    ],
  ],
  [
    "edge-case",
    "Finance changes how 'active customer' is defined. Can you recompute last year?",
    [
      "Only if you kept raw events, not just pre-aggregated numbers.",
      "Keep immutable raw events and derive metrics from them.",
      "That's an argument for long stream retention or a raw events table.",
    ],
  ],
  [
    "security",
    "Who should be able to see customer data in the warehouse?",
    [
      "Most analysis doesn't need names or emails: pseudonymise them.",
      "Role-based access, with column-level controls for sensitive fields.",
      "Audit queries on sensitive data.",
    ],
  ],
  [
    "security",
    "A customer asks to be deleted. How does that reach the warehouse?",
    [
      "Publish a deletion event that the warehouse pipeline applies.",
      "Or hold identities in one mapping table and delete the mapping.",
      "Backups and stream history need retention limits that respect deletion.",
    ],
  ],
  [
    "observability",
    "How do you show that customers no longer wait on analytics?",
    [
      "p99 latency on sign-up, upgrade and cancel endpoints before and after.",
      "Traces with no warehouse span on the request path.",
      "Error rate on those endpoints.",
    ],
  ],
  [
    "observability",
    "How do you know the dashboards are still being fed?",
    [
      "Pipeline lag: the newest event's age in the warehouse.",
      "Alert if it exceeds the agreed freshness.",
      "Daily reconciliation of counts with the source database.",
    ],
  ],
  [
    "product",
    "How do you stop this from happening again when another team wants 'live' data?",
    [
      "A clear pattern: analytics reads from events or a replica, never on the request path.",
      "Design review for anything new added to the request path.",
      "Make the right way easy: an event pipeline teams can subscribe to.",
    ],
  ],
  [
    "resilience",
    "A bad transformation corrupts a week of metrics in the warehouse.",
    [
      "Keep the raw events, not only the transformed tables.",
      "Fix the transformation, then rebuild the affected week from the raw events.",
      "Tell people which dashboards were wrong and for which dates.",
    ],
  ],
])

export const HALF_THE_ORDERS = deck("half-the-orders", [
  [
    "clarify",
    "Search and finance each see half the orders. What do you ask first?",
    [
      "Exactly half, or a random share? An even split points at the delivery mechanism.",
      "Are the halves complementary: does every order appear in exactly one of them?",
      "When did it start, and what changed in the pipeline then?",
    ],
    "Why is 'are they complementary' such a strong clue?",
  ],
  [
    "clarify",
    "What would you ask about how the consumers read messages?",
    [
      "Do they read from one queue, or each from their own?",
      "Same consumer group, or different ones?",
      "Does a message disappear once one consumer has it?",
    ],
  ],
  [
    "clarify",
    "What do consumers need from the order events?",
    [
      "Every order, in order, or just eventually all of them?",
      "Can they tolerate duplicates?",
      "Do they ever need to replay history?",
    ],
  ],
  [
    "product",
    "What was the business impact while this was broken?",
    [
      "Customers couldn't find some orders in search.",
      "Finance reports understated revenue by about half, and someone may have acted on that.",
      "Data bugs are often costlier than outages, because nobody notices for weeks.",
    ],
  ],
  [
    "decision",
    "Why does a queue split orders between two consumers?",
    [
      "A queue distributes work: each message goes to exactly one consumer, then it's gone.",
      "That's right for a pool of identical workers sharing a job.",
      "It's wrong for two different systems that each need every message.",
    ],
  ],
  [
    "decision",
    "Why is an event stream the fix?",
    [
      "A stream keeps an ordered log; each consumer group tracks its own position.",
      "Search and the warehouse each read all events, independently.",
      "Adding a third consumer means a new group, with no producer changes.",
    ],
  ],
  [
    "decision",
    "How do you backfill the orders each system missed?",
    [
      "Replay history from the database into the new stream, or a one-off export into each consumer.",
      "Make loading idempotent so replaying doesn't duplicate.",
      "Reconcile counts afterwards to confirm both are complete.",
    ],
  ],
  [
    "tradeoff",
    "Two queues (one per consumer) vs one event stream?",
    [
      "Two queues: simple, but the producer must know every consumer and publish to each.",
      "A stream: the producer publishes once; consumers subscribe independently.",
      "Fan-out services (a topic delivering into several queues) are a middle ground.",
    ],
  ],
  [
    "tradeoff",
    "What do you lose by moving from a queue to a stream?",
    [
      "Per-message acknowledgement and automatic retry become per-consumer offset management.",
      "No built-in dead-letter handling; you build it.",
      "Streams need retention and partition planning. They're billed by the shard-hour, not per message: cheaper at high volume, dearer at a trickle.",
    ],
  ],
  [
    "alternative",
    "Could the consumers poll the database instead of reading events?",
    [
      "Polling 'orders updated since X' works at small scale.",
      "It adds read load, and is easy to get wrong around clock skew and transaction timing.",
      "Change data capture is the robust version of the same idea.",
    ],
  ],
  [
    "alternative",
    "When would a queue be the right choice in this system?",
    [
      "For work items: 'send confirmation email' handled by a pool of email workers.",
      "Each email sent once, by whichever worker is free.",
      "A common pattern: a stream of order events, with a consumer that puts email jobs on a queue.",
    ],
  ],
  [
    "scale",
    "How do consumers scale out on a stream without splitting events between systems?",
    [
      "Within one consumer group, partitions are divided among instances: that's competing consumers again, but only within one system.",
      "Different systems use different groups, so each still sees everything.",
      "Parallelism is capped by partition count.",
    ],
  ],
  [
    "resilience",
    "A consumer crashes after processing an event but before recording its position. What happens?",
    [
      "On restart it reads the event again: at-least-once delivery.",
      "Consumers must be idempotent: upsert by order ID.",
      "Recording position and output in one transaction avoids it, where possible.",
    ],
  ],
  [
    "edge-case",
    "You need to change the event format. How do you avoid breaking consumers?",
    [
      "Make backwards-compatible changes: add fields, don't rename or remove, and have consumers ignore fields they don't recognise.",
      "Use a schema registry and versioned schemas.",
      "For breaking changes, publish both versions during a migration period.",
    ],
  ],
  [
    "edge-case",
    "A new consumer is added and needs the last year of orders. Can it get them?",
    [
      "Only if the stream retains a year, which is costly.",
      "Usually: bootstrap from a database snapshot, then read the stream from that point.",
      "Plan retention around how new consumers will start.",
    ],
  ],
  [
    "security",
    "With several teams reading order events, how do you control access?",
    [
      "Per-topic permissions: each consumer gets read access only to what it needs.",
      "Keep sensitive fields out of widely shared topics.",
      "Encrypt in transit and at rest; audit who subscribes.",
    ],
  ],
  [
    "observability",
    "What check would have caught this on the first day?",
    [
      "Reconciliation: orders in the database vs orders in search vs orders in the warehouse, per hour.",
      "A 50% mismatch would have been obvious immediately.",
      "Per-consumer throughput compared with the producer's rate.",
    ],
  ],
  [
    "observability",
    "What do you monitor on the stream once it's fixed?",
    [
      "Consumer lag per group.",
      "Publish rate vs each group's consume rate: they should match.",
      "Error and dead-letter counts per consumer.",
    ],
  ],
  [
    "observability",
    "Each team blamed the other. How do you run that investigation better?",
    [
      "Start from shared data: trace one specific order through every system.",
      "Look at the mechanism between the systems, not just inside each team's code.",
      "Blameless postmortem, with a clear owner for the pipeline itself.",
    ],
  ],
  [
    "product",
    "Who should own the event pipeline?",
    [
      "A platform or data team, with clear contracts for producers and consumers.",
      "Otherwise it falls between teams, which is how this bug survived.",
      "Ownership includes schemas, retention and reconciliation checks.",
    ],
  ],
  [
    "resilience",
    "A consumer is down so long that the stream's retention runs out before it catches up.",
    [
      "Events older than the retention window are gone from the stream, so it can't replay them.",
      "Rebuild that consumer's data from the source of truth (a database export), then resume from the stream.",
      "Set retention longer than your worst realistic outage, and alarm on consumer lag well before it.",
    ],
  ],
])

export const BIG_MERCHANT = deck("big-merchant", [
  [
    "clarify",
    "Checkout fails for one retailer's customers, and adding shards didn't help. What do you ask first?",
    [
      "Since when? If it started the week the big retailer joined, the data changed, not the code.",
      "Is it every order of theirs, or only at peak?",
      "What's the partition key, and how big is the biggest value of it?",
    ],
    "Adding shards changed nothing. What does that rule out?",
  ],
  [
    "clarify",
    "Before choosing a new key, what do you want to know about the data?",
    [
      "The biggest seller, buyer and order as a share of all traffic.",
      "Which reads are most common, and which ID each one names.",
      "Whether anything has to change several records in one transaction, like an order and its items.",
    ],
  ],
  [
    "clarify",
    "What do the shard dashboards tell you?",
    [
      "One shard at 108% and seven at 23%: the load is uneven, not too big.",
      "Eight shards could take 24,000 writes a second, and only 8,100 arrive.",
      "Uneven load points at the key, not at the shard count.",
    ],
  ],
  [
    "product",
    "What do you tell the big retailer while you fix it?",
    [
      "The truth: their checkout fails at peak because of how orders are stored, and a fix is under way.",
      "What they can expect this weekend, and what you're doing in the meantime, such as holding back their reporting traffic.",
      "They're the biggest customer: give them a named contact and regular updates.",
    ],
  ],
  [
    "decision",
    "Why didn't going to eight shards help?",
    [
      "Split by seller, all of one seller's orders live on one shard, however many shards there are.",
      "That seller is 40% of writes, so their shard takes 40% whatever the count.",
      "The extra shards only added idle capacity, and $3,200 a month.",
    ],
  ],
  [
    "decision",
    "Why buyer ID rather than order ID?",
    [
      "Most reads are buyers checking their own orders, which names the buyer: one shard.",
      "Order ID spreads writes evenly, but a buyer's order list doesn't name an order, so it asks every shard.",
      "Buyers are many and small: no one buyer is a noticeable share.",
    ],
    "Which reads now ask every shard, and how many are they?",
  ],
  [
    "decision",
    "How many shards by buyer, and why that many?",
    [
      "8,100 writes a second at 3,000 a shard needs at least three, and three would each run at 90%.",
      "Four run at 68% at peak and 84% on a sale weekend.",
      "Five passes on load and goes over budget.",
    ],
  ],
  [
    "tradeoff",
    "What gets worse when you split by buyer?",
    [
      "A seller's sales page asks every shard: about 15% of reads.",
      "The big seller's reports scan all four shards.",
      "Nothing can update all of one seller's orders in one transaction any more.",
    ],
  ],
  [
    "tradeoff",
    "What about seller ID for small sellers, and seller then order ID for big ones?",
    [
      "It keeps small sellers together and spreads big ones, which is what Fleet Tracker needed.",
      "Buyers' reads would still ask every shard, because they don't name a seller.",
      "Here, buyer ID is simpler and fits the common read.",
    ],
  ],
  [
    "tradeoff",
    "What does moving to a new key cost while it happens?",
    [
      "Every order is copied to its new shard, and for a while every write goes to both.",
      "Compare the old and new copies, then move reads, then stop writing the old ones.",
      "Keep the old shards until you're sure, so you can go back.",
    ],
  ],
  [
    "alternative",
    "Could you give the big seller a shard of its own?",
    [
      "Their 40% of writes is still more than one {sql-primary} takes.",
      "A shard per tenant only works while every tenant fits on one machine.",
      "As they grow, you'd have to split them again.",
    ],
  ],
  [
    "alternative",
    "Would a {nosql} store fix this on its own?",
    [
      "It spreads keys over partitions for you, but one hot key still has a limit of its own.",
      "The problem is the key, and it follows you into any store.",
      "Orders also lose joins and transactions, which you'd have to rebuild.",
    ],
  ],
  [
    "scale",
    "The big seller doubles. What happens?",
    [
      "Split by buyer, nothing special: their buyers are spread over every shard.",
      "Total writes grow, so add a shard when the busiest passes about 70%.",
      "Their reporting gets heavier: feed it from a {data-warehouse}.",
    ],
  ],
  [
    "scale",
    "What happens when eight shards aren't enough?",
    [
      "Eight is the most offered here. Beyond it: bigger machines, or a store that splits itself.",
      "Hash the key onto shards so adding one moves only a share of the data.",
      "Plan the next split before you need it, not during a sale.",
    ],
  ],
  [
    "edge-case",
    "A buyer who also sells: where do their records live?",
    [
      "Their orders as a buyer go by buyer ID.",
      "Their listing as a seller is separate data, with its own home.",
      "Order IDs must be unique across shards, not just within one.",
    ],
  ],
  [
    "edge-case",
    "An order's buyer and seller would be on different shards. Where does the order go?",
    [
      "On the buyer's shard, with the seller ID as a column.",
      "The seller sees it through the read that asks every shard.",
      "No transaction needs both shards: one order is one row.",
    ],
  ],
  [
    "resilience",
    "A shard's primary crashes. What happens?",
    [
      "Its standby in the other zone takes over in seconds.",
      "Only that shard's buyers notice, briefly: about a quarter of them.",
      "With money involved, two copies per shard is the minimum.",
    ],
  ],
  [
    "resilience",
    "How much headroom do you have for the sale weekend?",
    [
      "The busiest shard runs at 84% at 1.25x: it holds, and latency rises.",
      "For more than that, add a shard before the sale, not during it.",
      "Shed reads that can wait, like seller analytics, first.",
    ],
  ],
  [
    "security",
    "Does the new key change who can see what?",
    [
      "No: every request still checks that the buyer owns the order.",
      "Don't let a client choose the shard. The server works it out from the signed-in buyer.",
      "Every shard holds personal data, so every shard is encrypted.",
    ],
  ],
  [
    "observability",
    "What would have caught this before checkout failed?",
    [
      "Load per shard, not just the total: the busiest next to the average.",
      "An alert when one shard runs at more than twice the average.",
      "The biggest customer's share of traffic, tracked as they grow.",
    ],
  ],
  [
    "observability",
    "After the move, how do you know it worked?",
    [
      "Shards within a few points of each other.",
      "p99 back under 300ms, and no errors at peak.",
      "The share of reads asking every shard where you expected it: about 15%.",
    ],
  ],
])

export const EVERYONE_ASKS = deck("everyone-asks", [
  [
    "clarify",
    "Every shard is overloaded, yet each takes an even share of writes. What do you ask?",
    [
      "Which requests are slow: reads or writes?",
      "How many shards does one read visit?",
      "What changed when we went from four shards to eight?",
    ],
  ],
  [
    "clarify",
    "What are the common reads?",
    [
      "Opening a conversation: its latest 50 messages.",
      "Scrolling back: older messages in the same conversation.",
      "Search across every conversation, which is rarer.",
    ],
  ],
  [
    "clarify",
    "What do you need to know about conversations?",
    [
      "How big the biggest one is: a company-wide channel with thousands of members?",
      "How many messages a second the busiest one gets.",
      "Whether messages ever move between conversations.",
    ],
  ],
  [
    "product",
    "Chat is slow for everyone. What can the product do while you fix it?",
    [
      "Load the latest few messages first and older ones as people scroll.",
      "Show a sent message on the sender's screen straight away.",
      "Say on the status page that chat is slow, and that messages aren't lost.",
    ],
  ],
  [
    "decision",
    "Why did eight shards make it slower than four?",
    [
      "A read that asks every shard waits for the slowest one. More shards, more chances of a slow one.",
      "Each shard still saw nearly every read, so none of them got quieter.",
      "The work of asking and merging grows with the number of shards.",
    ],
  ],
  [
    "decision",
    "Message ID spreads writes perfectly. Why is it the wrong key?",
    [
      "Spreading writes is half the job. Reads also have to find their data.",
      "A conversation's messages are scattered over every shard.",
      "The key should be what the common read names: here, the conversation.",
    ],
    "What would you check for any key before choosing it?",
  ],
  [
    "decision",
    "Why three shards by conversation?",
    [
      "16,000 reads a second over two shards runs each at 82%, and p99 goes over the limit.",
      "Three run at 57%.",
      "Four also work, and cost more than the budget.",
    ],
  ],
  [
    "tradeoff",
    "What does splitting by conversation cost you?",
    [
      "A very busy conversation lands on one shard.",
      "Search across conversations still asks every shard.",
      "Unread counts across all of someone's conversations touch many shards.",
    ],
  ],
  [
    "tradeoff",
    "Does the new key help keep messages in order?",
    [
      "Yes: a conversation's messages are on one shard, so numbering them in order is easy there.",
      "Message IDs that start with the time sort naturally.",
      "Order across different conversations doesn't matter.",
    ],
  ],
  [
    "tradeoff",
    "Why not split by user ID?",
    [
      "A conversation has many members, so a message would be stored once per member, or read from everywhere.",
      "Storing it per member multiplies the writes by the number of members.",
      "The conversation is the unit people read, so it's the natural key.",
    ],
  ],
  [
    "alternative",
    "Could a {cache} fix it without moving any data?",
    [
      "The latest messages in busy conversations cache well.",
      "Every miss still asks all eight shards.",
      "It treats the symptom and adds something else to keep in step.",
    ],
  ],
  [
    "alternative",
    "Would a {nosql} store be the better home?",
    [
      "Conversation as the partition key and time as the sort key is the classic chat design.",
      "It's the same lesson: the key has to match the read.",
      "Worth it when you outgrow eight shards.",
    ],
  ],
  [
    "scale",
    "Traffic doubles. Then what?",
    [
      "About six shards by conversation, and nothing else changes.",
      "Watch the busiest conversation's share as it grows.",
      "Move search to a {search-index} fed from the messages.",
    ],
  ],
  [
    "scale",
    "A channel with 50,000 members. What breaks?",
    [
      "Its shard takes a lot of reads: cache that channel's latest messages.",
      "Notifying 50,000 people is the harder part, not storing the message.",
      "If it keeps growing, it may need a shard of its own.",
    ],
  ],
  [
    "edge-case",
    "Someone deletes a message. How do you find it?",
    [
      "By conversation ID and message ID: the conversation tells you the shard.",
      "Split by message ID you could find it from the message alone. Now clients send both.",
      "A delete should leave a marker, so every device hears about it.",
    ],
  ],
  [
    "edge-case",
    "A direct message between two people: what's its conversation ID?",
    [
      "One worked out from both user IDs, so either person finds the same one.",
      "It lands on the same shard whoever writes first.",
      "That also stops the same pair getting two conversations.",
    ],
  ],
  [
    "resilience",
    "A primary crashes. What happens?",
    [
      "Its standby takes over, and a third of conversations pause briefly.",
      "Clients retry sends with an idempotency key, so nothing is posted twice.",
      "Two copies per shard is the minimum.",
    ],
  ],
  [
    "resilience",
    "How do you move every message to its new shard without losing any?",
    [
      "Write new messages to both the old and new layout for a while.",
      "Copy old messages across conversation by conversation.",
      "Switch reads once the counts match, and keep the old shards until you're sure.",
    ],
  ],
  [
    "security",
    "Does splitting by conversation change who can read what?",
    [
      "No: every read still checks the person is a member.",
      "The server picks the shard. A client can't ask for a shard directly.",
      "Every shard holds private messages, so every shard is encrypted.",
    ],
  ],
  [
    "observability",
    "What would have shown the problem before users did?",
    [
      "Shards visited per read, on average and at p99.",
      "Reads per shard next to writes per shard.",
      "An alert when the common read visits more than one shard.",
    ],
  ],
  [
    "observability",
    "What do you measure after the fix?",
    [
      "Reads per shard: about a third each.",
      "p99 under 300ms.",
      "The share of reads that ask every shard: about 3%.",
    ],
  ],
])

export const TODAYS_SHARD = deck("todays-shard", [
  [
    "clarify",
    "One shard is overloaded, and it's a different one each day. What does that tell you?",
    [
      "The partition key follows time.",
      "The load isn't growing, it's moving.",
      "So check the key before the shard count or the machine size.",
    ],
  ],
  [
    "clarify",
    "What do customers read?",
    [
      "Their own usage: today, this week, this bill.",
      "Always for one home's meter.",
      "Reports across many homes are rare, and belong to analytics.",
    ],
  ],
  [
    "clarify",
    "What do you ask about the readings themselves?",
    [
      "How often each meter sends, and whether it sends several at once.",
      "Whether readings arrive late or out of order.",
      "How long they must be kept, for billing and for the regulator.",
    ],
  ],
  [
    "product",
    "What should customers see while you fix it?",
    [
      "That usage figures may be delayed, and bills aren't affected.",
      "Meters keep readings until they're accepted, so nothing is lost.",
      "No 'unusual usage' alerts based on readings that are missing.",
    ],
  ],
  [
    "decision",
    "Why didn't the read replicas help?",
    [
      "A replica copies all the data and only takes reads.",
      "The problem was writes, all landing on one primary.",
      "Copies add read capacity and safety. Only shards add write capacity.",
    ],
    "When would replicas have been the right fix?",
  ],
  [
    "decision",
    "Why meter ID?",
    [
      "There are millions of meters, so writes spread evenly.",
      "The app's reads name the meter, so they visit one shard.",
      "A home's whole history stays together.",
    ],
  ],
  [
    "decision",
    "Why not split by region?",
    [
      "One city has 60% of the homes, so its shard takes 3,240 writes a second.",
      "Groups of very different sizes make shards of very different loads.",
      "Region is good for keeping data apart, and poor for spreading load.",
    ],
  ],
  [
    "tradeoff",
    "What gets harder with meter ID?",
    [
      "Reports for one hour across every home ask every shard.",
      "Old data lives on every shard, so you can't retire a whole old shard.",
      "Tidying up old readings needs a job on every shard.",
    ],
  ],
  [
    "tradeoff",
    "Keep the read replicas or drop them?",
    [
      "Drop them: three shards take the reads easily, and it saves $800 a month.",
      "Keep them if you need more read headroom, or a copy for reports.",
      "Here, keeping them goes over budget.",
    ],
  ],
  [
    "tradeoff",
    "What about meter ID, then date?",
    [
      "The meter decides the shard, and the date sorts readings within it.",
      "It makes 'this week's usage' a quick, ordered read.",
      "The writes spread exactly as with meter ID alone.",
    ],
  ],
  [
    "alternative",
    "Would a {time-series-db} be a better store?",
    [
      "It's built for this: readings by series and time, compressed, with old data rolled up.",
      "It isn't offered here. In real life it's a strong candidate.",
      "It still splits by series, the meter, and never by time alone.",
    ],
  ],
  [
    "alternative",
    "Could a {queue} in front smooth it out?",
    [
      "It evens out bursts, but every write still ends up on today's shard.",
      "The backlog grows all day, every day.",
      "Fix the key, not the speed of arrival.",
    ],
  ],
  [
    "scale",
    "A million more meters next year.",
    [
      "Writes grow with the number of meters: add shards.",
      "Meter ID keeps spreading them evenly.",
      "Hash meters onto shards so adding one moves only part of the data.",
    ],
  ],
  [
    "scale",
    "Meters switch from every 15 minutes to every minute.",
    [
      "Fifteen times the writes: far more shards, or several readings per message.",
      "Each meter sending a batch every 15 minutes keeps the write count where it is.",
      "At that rate, a {time-series-db} looks even better.",
    ],
  ],
  [
    "edge-case",
    "A meter is offline for a day, then sends everything at once.",
    [
      "Its shard gets a small burst.",
      "Each reading carries its own time, not the time it arrived.",
      "Usage shown for that day should say it was filled in late.",
    ],
  ],
  [
    "edge-case",
    "A family moves house, and someone new moves in.",
    [
      "The meter's readings stay where they are. What changes is who may see them.",
      "Keying by meter rather than customer means the history never moves.",
      "Access is checked by account and date of moving in.",
    ],
  ],
  [
    "resilience",
    "A shard's primary crashes.",
    [
      "Its standby takes over in seconds.",
      "Meters retry, and hold their readings until they're accepted.",
      "A third of homes see a brief pause.",
    ],
  ],
  [
    "resilience",
    "How do you move from date to meter without losing readings?",
    [
      "Write new readings to both layouts for a while.",
      "Copy old days across meter by meter, and compare counts.",
      "Switch reads, then writes, and retire the old shards last.",
    ],
  ],
  [
    "security",
    "What's sensitive in meter readings?",
    [
      "Usage shows when people are home and when they're away: it's personal data.",
      "Encrypt every shard and limit who can query them.",
      "Customers see only their own meter, checked on every request.",
    ],
  ],
  [
    "observability",
    "What would have caught this?",
    [
      "Writes per shard, not just the total.",
      "An alert on the busiest shard's share of writes.",
      "A chart that shows the hot shard moving each day.",
    ],
  ],
  [
    "observability",
    "What do you watch after the fix?",
    [
      "Shards within a few points of each other.",
      "Failed writes at zero.",
      "The busiest meter's share, in case one goes wrong and floods.",
    ],
  ],
])

export const DOUBLE_SPEND = deck("double-spend", [
  [
    "clarify",
    "About 200 accounts are below zero, and nothing errored. What do you ask?",
    [
      "When did they go below zero? All during last Tuesday's network fault?",
      "Which zone were those payments made in?",
      "What's the balances store's consistency setting, and when did it last change?",
    ],
  ],
  [
    "clarify",
    "What do you ask about the rules for balances?",
    [
      "May a balance ever go below zero, even briefly?",
      "Is a refused payment acceptable, and what does the customer see?",
      "Who reconciles the accounts, and how quickly?",
    ],
  ],
  [
    "clarify",
    "What exactly happened in the network fault?",
    [
      "One zone was cut off for a few minutes, and nothing crashed.",
      "Both sides kept serving customers.",
      "Did the app or the store know it was cut off?",
    ],
  ],
  [
    "product",
    "What do you do about the 200 accounts?",
    [
      "Don't chase customers for the system's mistake: write off small amounts.",
      "Contact the few with larger amounts, politely.",
      "Fix the cause first, so the number doesn't grow.",
    ],
  ],
  [
    "decision",
    "How did eventual consistency allow a double spend?",
    [
      "Each side accepted a payment after checking only its own copy of the balance.",
      "The same money was spent once on each side.",
      "When the split healed, both payments were real, and the balance went below zero.",
    ],
  ],
  [
    "decision",
    "What does strong consistency do during a split?",
    [
      "A write commits only once a majority of copies have it.",
      "The side with one copy of three can't, so it refuses.",
      "The side with two carries on: two thirds of customers notice nothing.",
    ],
  ],
  [
    "decision",
    "Why three copies, not two?",
    [
      "With three, one side of a split always holds two: a majority.",
      "With two, neither side does, so everything stops.",
      "Quorums want odd numbers.",
    ],
  ],
  [
    "tradeoff",
    "What does strong consistency cost every day?",
    [
      "About 5ms more per write, waiting for a copy in another zone.",
      "Refused payments in the cut-off zone during a split.",
      "For money, that's usually a fair price.",
    ],
  ],
  [
    "tradeoff",
    "Strong for everything, or only for payments?",
    [
      "Payments and top-ups must check a majority.",
      "The balance on the home screen can be a second old.",
      "Separate the read people glance at from the write that moves money.",
    ],
  ],
  [
    "tradeoff",
    "Refuse during a split, or allow a small overdraft?",
    [
      "Some prepaid schemes allow a small offline limit and absorb the losses.",
      "Refusing is the simple, safe default.",
      "It's a business decision: put the numbers in front of the people who own it.",
    ],
  ],
  [
    "alternative",
    "Should the balances move to a {sql-primary}?",
    [
      "A single-leader database is consistent by design.",
      "With three copies over three zones it costs $1,599 here, less than the {nosql} store.",
      "It's a migration rather than a setting: the better long-term fix, and slower to ship.",
    ],
  ],
  [
    "alternative",
    "Why not let both sides accept payments and reconcile afterwards?",
    [
      "You'd find the conflicting payments and reverse one.",
      "The coffee has been drunk: there's nothing to reverse.",
      "It works for things you can undo, like a basket.",
    ],
  ],
  [
    "scale",
    "Ten times the customers.",
    [
      "More blocks of the store, and the cost of a quorum write stays the same.",
      "Split the balances by customer ID.",
      "Each balance still lives in one place, with a majority deciding.",
    ],
  ],
  [
    "scale",
    "Should balances run in two regions?",
    [
      "A strong write across regions waits for the other side: about 100ms each.",
      "Keep each customer's balance in a home region instead.",
      "Here, one region is enough.",
    ],
  ],
  [
    "edge-case",
    "A payment times out in the app, and the customer taps again.",
    [
      "An idempotency key makes the second tap return the first result.",
      "Without one, even strong consistency charges them twice.",
      "It's a different problem, and also about money.",
    ],
  ],
  [
    "edge-case",
    "Someone tops up on the cut-off side during a split.",
    [
      "It's refused too: strong refuses every write there.",
      "If the card was already charged, reconcile with the card provider.",
      "Make top-ups idempotent so a retry doesn't add twice.",
    ],
  ],
  [
    "resilience",
    "A zone goes down completely, rather than being cut off.",
    [
      "The other two copies are a majority, so payments carry on.",
      "The lost copy rebuilds when the zone returns.",
      "It's the same rule as a split.",
    ],
  ],
  [
    "resilience",
    "How do you check this before the next network fault?",
    [
      "Cut a zone off in a test environment on purpose.",
      "Check the cut-off side accepts no writes.",
      "Alert on any write accepted without a majority.",
    ],
  ],
  [
    "security",
    "Could someone exploit a split to spend twice?",
    [
      "They're unlikely to cause one, but people do look for windows like this and share them.",
      "With strong consistency there's no window.",
      "Flag unusual spending patterns, like several payments in a few seconds.",
    ],
  ],
  [
    "observability",
    "What would have shown this last Tuesday?",
    [
      "Writes accepted on the cut-off side that the others couldn't see.",
      "An alert the moment any balance goes below zero.",
      "An audit log of configuration changes, like the consistency setting.",
    ],
  ],
  [
    "observability",
    "What do you watch after the fix?",
    [
      "Refusals during a split, which should match the cut-off share.",
      "No balances below zero.",
      "Write p99 about 5ms higher, and steady.",
    ],
  ],
])

export const RESUME_POINT = deck("resume-point", [
  [
    "clarify",
    "Viewers got errors, and nothing had crashed. What do you ask?",
    [
      "Which requests failed: pressing play, or saving the position?",
      "Were the failing viewers all in one zone?",
      "What's the position store's consistency mode?",
    ],
  ],
  [
    "clarify",
    "How bad is a position that's out of date?",
    [
      "A few seconds back: nobody minds.",
      "Starting from the beginning: annoying, not harmful.",
      "An error instead of the show: the worst outcome of the three.",
    ],
  ],
  [
    "clarify",
    "What else does pressing play depend on?",
    [
      "Whether they're subscribed, which does need to be right.",
      "The video itself, from a {cdn}.",
      "The position is a nice-to-have: play should work without it.",
    ],
  ],
  [
    "product",
    "What should play do if the position can't be read at all?",
    [
      "Start from the last position the device remembers, or from the beginning.",
      "Never block playback waiting for it.",
      "Offer 'resume from' once it's available again.",
    ],
  ],
  [
    "decision",
    "Why eventual here, when Double Spend needed strong?",
    [
      "A wrong answer here costs a few seconds of video. There, it cost money.",
      "Here, being available matters more than being exact.",
      "Consistency is chosen per store, by what a wrong answer costs.",
    ],
  ],
  [
    "decision",
    "When the copies meet again, which position wins?",
    [
      "The one saved last.",
      "Saved last by the player's clock, recorded when it was saved.",
      "Or the furthest one: a product choice.",
    ],
  ],
  [
    "decision",
    "Why did strong mode refuse a third of viewers?",
    [
      "The cut-off side held one copy of three: no majority.",
      "So it refused reads as well as writes.",
      "A third of the traffic was on that side.",
    ],
  ],
  [
    "tradeoff",
    "What does eventual cost you?",
    [
      "Two devices may briefly disagree.",
      "Positions need merging after a split.",
      "Little else, and every write saves about 5ms.",
    ],
  ],
  [
    "tradeoff",
    "Saved last wins, or furthest wins?",
    [
      "Saved last respects someone rewinding on purpose.",
      "Furthest protects against an old device overwriting a newer position.",
      "Pick one per product, and test it with real viewing patterns.",
    ],
  ],
  [
    "tradeoff",
    "Save every 5 seconds or every 30?",
    [
      "Every 30 is a sixth of the writes.",
      "A crash then loses up to 30 seconds of position.",
      "Also save on pause and when the app closes.",
    ],
  ],
  [
    "alternative",
    "Why not keep the position only on the device?",
    [
      "It breaks carrying on from another device, which is the whole feature.",
      "It's a good fallback when the store is unreachable.",
      "Do both: save locally first, then sync.",
    ],
  ],
  [
    "alternative",
    "Could a {cache} hold positions instead of a database?",
    [
      "It's fast, but a restart loses everyone's place.",
      "Positions are worth keeping for months.",
      "Fine as a layer in front, not as the only copy.",
    ],
  ],
  [
    "scale",
    "A season finale: everyone presses play at 9pm.",
    [
      "Reads spike all at once, so add capacity before the night.",
      "Everyone starts a new episode at zero, so the app can skip the lookup.",
      "Saves follow a few seconds later: they're the bigger load.",
    ],
  ],
  [
    "scale",
    "Saves are 60% of traffic. Can you cut them?",
    [
      "Save less often while playing normally.",
      "Only save when the position has moved by more than a few seconds.",
      "Always save on pause and on exit.",
    ],
  ],
  [
    "edge-case",
    "Two people share a profile and watch different shows.",
    [
      "Positions are per show, so they don't clash.",
      "Same show on two devices: one position wins.",
      "Separate profiles are the real answer.",
    ],
  ],
  [
    "edge-case",
    "A device's clock is an hour wrong.",
    [
      "Saved last by that clock picks the wrong position.",
      "Use the server's time with a counter from the device, or furthest wins.",
      "Clocks that combine both, called hybrid logical clocks, are designed for this.",
    ],
  ],
  [
    "resilience",
    "A zone goes down completely.",
    [
      "Eventual keeps serving from the other zones.",
      "Saves in the lost zone that hadn't been copied are lost: a few seconds of position.",
      "That's an acceptable loss here.",
    ],
  ],
  [
    "resilience",
    "How do you check this works before the next fault?",
    [
      "Cut a zone off in a test environment.",
      "Expect no errors, and some positions merged afterwards.",
      "Check the merge picked the position you'd expect.",
    ],
  ],
  [
    "security",
    "Is a viewing position sensitive?",
    [
      "Viewing history is personal data.",
      "Encrypt it, and only the account can read it.",
      "Don't write it to logs in plain text.",
    ],
  ],
  [
    "observability",
    "What would have warned you before viewers did?",
    [
      "Refused requests, broken down by zone.",
      "Play errors broken down by which dependency failed.",
      "An audit log of configuration changes.",
    ],
  ],
  [
    "observability",
    "What do you watch after the fix?",
    [
      "How many positions are merged after each split.",
      "Play errors during faults: should be zero.",
      "How far behind the copies are during normal running.",
    ],
  ],
])

export const SUMMARY_ON_VIEW = deck("summary-on-view", [
  [
    "clarify",
    "The model bill is exploding and pages are timing out. What do you ask first?",
    [
      "Did it start when the summaries launched?",
      "How many model calls does one page view make?",
      "What's our quota, and are we at it?",
    ],
  ],
  [
    "clarify",
    "How often does a summary change?",
    [
      "Only when the article is edited.",
      "How many times a day is an article edited, on average?",
      "So it needs working out once per edit, not once per view.",
    ],
  ],
  [
    "clarify",
    "What should readers see if a summary isn't ready yet?",
    [
      "The article without a summary.",
      "Or the previous summary, until the new one arrives.",
      "Not a spinner: it draws attention to something missing.",
    ],
  ],
  [
    "product",
    "Should every article have a summary?",
    [
      "Long pieces, yes. A three-paragraph news item may not need one.",
      "Fewer summaries means fewer tokens.",
      "Ask the editors which pieces readers use them on.",
    ],
  ],
  [
    "decision",
    "Why move the model call off the reading path?",
    [
      "Reads outnumber edits 4,000 to one.",
      "The summary is the same for every reader.",
      "Work it out once, store it, and serve it.",
    ],
    "What else in a typical site is computed on read and could be stored?",
  ],
  [
    "decision",
    "Why a {queue} and a {worker}, rather than calling the model when the editor saves?",
    [
      "The editor shouldn't wait for the model, which takes seconds.",
      "If the model fails, the job is retried.",
      "If the model is down, jobs wait instead of saves failing.",
    ],
  ],
  [
    "decision",
    "Where does the summary live?",
    [
      "In the article's row in the {sql-primary}.",
      "So a page view is still one read.",
      "Alongside the article version it was made from.",
    ],
  ],
  [
    "tradeoff",
    "What does summarising on save cost?",
    [
      "A few seconds without a summary after publishing.",
      "Every edit, even a typo, costs a new summary.",
      "Changing the prompt means redoing every old article.",
    ],
  ],
  [
    "tradeoff",
    "{queue} or {event-stream} for the jobs?",
    [
      "A {queue}: one consumer, simple, $7,434 in all.",
      "An {event-stream}: $7,459, and other things (search, newsletters) can react to the same publishes.",
      "Choose the stream if more consumers are coming.",
    ],
  ],
  [
    "tradeoff",
    "{worker} or {serverless} for the summariser?",
    [
      "{serverless} is $7,314 in all: paid per job, nothing running in between.",
      "A {worker} is $120 a month whether there's work or not.",
      "At one job every two seconds, either is fine.",
    ],
  ],
  [
    "alternative",
    "Why not cache the model's answer instead?",
    [
      "Even with nine views in ten served from the cache, the rest make 200 calls a second.",
      "That's over twice the quota, and about $3.4 million a month.",
      "Caching helps when misses are rare. Here, nothing needs to miss at all.",
    ],
  ],
  [
    "alternative",
    "A {llm-batch} job is half the price. Why not use it?",
    [
      "It returns within about a day.",
      "A summary of today's news tomorrow is no use.",
      "It's the right tool for summarising the archive once.",
    ],
  ],
  [
    "scale",
    "Ten times the readers.",
    [
      "Model calls don't change: they follow edits, not readers.",
      "Add {app-server} instances, or a {cdn} for whole pages.",
      "That's the point of taking the model off the reading path.",
    ],
  ],
  [
    "scale",
    "Summaries in five languages.",
    [
      "Five calls per edit: still tiny.",
      "Translate the short summary, not the whole article: far fewer tokens.",
      "Store each language alongside the article.",
    ],
  ],
  [
    "edge-case",
    "An editor publishes, then fixes two typos within a minute.",
    [
      "Three jobs for one article: only the last result matters.",
      "Skip jobs for versions older than the latest.",
      "Or wait a minute after the last edit before summarising.",
    ],
  ],
  [
    "edge-case",
    "A summary says something the article doesn't.",
    [
      "Editors can edit or remove it.",
      "Store which prompt and article version produced it.",
      "Label it clearly as machine-written.",
    ],
  ],
  [
    "resilience",
    "The model is down for an hour.",
    [
      "Jobs wait in the {queue}, and articles keep their old summaries.",
      "New articles appear without one until it's back.",
      "Before the fix, every page view would have timed out.",
    ],
  ],
  [
    "resilience",
    "Breaking news doubles the traffic.",
    [
      "The model doesn't notice.",
      "The {app-server} tier goes from 25% to 50% busy.",
      "Reads only touch the database.",
    ],
  ],
  [
    "security",
    "Can a reader still make the site call the model?",
    [
      "No: only an editor's save starts a job.",
      "Before, every page view was a paid call, so a bot could run up the bill.",
      "Limit who can publish, and cap jobs per article per hour.",
    ],
  ],
  [
    "observability",
    "What would have caught this before launch?",
    [
      "An estimate: calls a second × tokens × price.",
      "A load test with the model in the path.",
      "A budget alert on the model bill.",
    ],
  ],
  [
    "observability",
    "What do you watch now?",
    [
      "Model calls per hour next to articles saved per hour.",
      "The age of the oldest job in the {queue}.",
      "Cost per article.",
    ],
  ],
])
