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
      "Remove: $120 a month saved, simpler, no lag.",
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
    "edge-case",
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
      "Its utilisation was over 100%: 2,250 reads a second against about 2,000 of capacity.",
      "The app tier was at 63%, so not saturated.",
      "Always find the saturated component; scaling anything else only adds cost.",
    ],
  ],
  [
    "decision",
    "Why is a cache the right fix rather than a bigger database?",
    [
      "The catalogue is identical for every shopper, so it caches almost perfectly.",
      "A $25 cache absorbs about 1,800 reads a second.",
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
      "Replicas: any query, near-real-time, $120 each, take minutes to add.",
      "Cache: only shared hot data, a little stale, $25, and absorbs far more.",
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
      "Database writes: orders and baskets at 50% now, and they all go to one primary.",
      "Then the app tier at higher traffic.",
      "Partitioning baskets or moving them to a store that scales writes horizontally is the long-term fix.",
    ],
  ],
  [
    "edge-case",
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
    "edge-case",
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
    "Why does moving the PDF to a queue shrink the app tier from six instances to three?",
    [
      "Each inline render cost about 20 requests' worth of CPU.",
      "Without it, each instance handles ordinary requests only.",
      "The render work doesn't disappear; it moves to workers sized for it.",
    ],
  ],
  [
    "decision",
    "How many workers, and how do you decide?",
    [
      "120 orders a second at 50 renders a second per worker: 2.4 at 100%.",
      "Four gives headroom and survives losing one.",
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
    "edge-case",
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
      "Six instances over three zones: losing one zone leaves four, enough for peak at 75%.",
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
    "edge-case",
    "Zone A comes back. What happens now?",
    [
      "The old primary must not come back as a second primary: that's split brain.",
      "It rejoins as the new standby.",
      "Rebalance app instances back across zones gradually.",
    ],
  ],
  [
    "edge-case",
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
      "In money: what the last outage cost vs $120 a month.",
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
    "edge-case",
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
      "Streams cost more and need retention and partition planning.",
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
    "edge-case",
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
      "Make backwards-compatible changes: add fields, don't rename or remove.",
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
])
