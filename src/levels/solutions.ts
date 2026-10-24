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
  "step-counter": {
    overview:
      "Syncs are small writes, keyed by user and day, and every read is for one user. That's what a {nosql} store is built for: it spreads users across partitions, so writes scale by adding capacity. One {sql-primary} would need four times its write limit.",
    walkthrough: [
      "{load-balancer} → {app-server}. A sync carries the wristband's samples since the last one.",
      "The app writes them to the {nosql} store under the key 'user ID + date', adding to that day's item.",
      "Opening the app reads today's item, or the last seven, all by key: no scans, no joins.",
      "Keys spread across partitions, so the busiest user is one tiny share of the traffic.",
    ],
    numbers: [
      "5,000 requests a second: 3,500 syncs and 1,500 reads.",
      "One {sql-primary} would run at 117% on writes, and more each year; standbys add none. Six {nosql} blocks of about 1,000 writes a second each run at 58%.",
      "Nine {app-server} instances run at 56%, and at 83% on the January spike, without dropping anything.",
      "Five blocks are $950 cheaper and fine on a normal day at 70%, but the spike takes them to 105%, and about 3% of requests fail.",
      "Cost: about $64 for the {load-balancer} + 9 × $70 + 6 × $950 = $6,394 of $7,000. Most of it is the {nosql} store's provisioned write capacity.",
    ],
    tradeoffs: [
      "The key decides what's cheap to ask. 'All users who walked over 20,000 steps yesterday' needs a scan, or a second copy built for it.",
      "No transactions across users. Fine here; a leaderboard between friends would need care.",
      "A managed store bills per capacity: at quiet times you pay for headroom you don't use, unless it scales on demand.",
    ],
    alternatives: [
      "A {sql-primary} with writes queued behind a {queue} still takes them at 3,000 a second: the queue grows by 500 a second, forever.",
      "Sharding SQL by user works, but you'd run and rebalance the shards yourself for data that never joins.",
      "Batching samples on the wristband (sync every ten minutes instead of five) halves the writes for free, if the product allows it.",
    ],
  },
  "slow-partner": {
    overview:
      "Orders are saved straight away and charged later. The {app-server} writes the order to the {sql-primary} and puts a charge on a {queue}; {worker} instances call the payment provider. When the provider slows down, customers don't notice: workers give up on slow calls after half a second, retry with backoff, and send an idempotency key so a retried charge is never taken twice.",
    walkthrough: [
      "{load-balancer} → {app-server}. Browsing reads menus and order status from the {sql-primary}.",
      "Placing an order writes it to the {sql-primary} as 'awaiting payment', puts a charge message on the {queue}, and tells the customer it's being confirmed.",
      "A {worker} takes the message and calls the {third-party-api} with the order's ID as the idempotency key. On success it marks the order paid.",
      "If the call takes longer than its timeout, the worker gives up and the message comes back later, with a growing delay between attempts. If the provider had in fact charged the card, the retry sends the same key and gets the original result back.",
    ],
    numbers: [
      "1,200 requests a second: 1,080 browsing and 120 orders.",
      "Two {app-server} instances run at 60%; the {sql-primary} at 11%.",
      "A charge is mostly waiting, so each worker keeps about 100 calls in flight. Two workers run at 9% normally. When the provider slows by five seconds, each call holds its slot for at most half a second, and backoff adds a fifth more calls: they run at 45%, and the queue keeps up.",
      "With no timeout, each call holds its slot for five seconds and the queue falls 87 orders a second behind. Twenty workers would keep up, at more than twice the budget. With immediate retries, the provider gets three calls for each charge, 180% of its quota, and charges fall 160 a second behind.",
      "Retries with no idempotency key charge about 14 orders a second twice.",
      "Calling the provider from the {app-server} instead puts its slowness on every customer: the app tier runs out of capacity and every request fails.",
      "Cost: about $34 for the {load-balancer} + 2 × $70 + 2 × $400 + about $114 for the {queue} + 2 × $120 = $1,328 of $1,450.",
    ],
    tradeoffs: [
      "The customer sees 'confirming payment' instead of an instant answer. Most of the time it's seconds; on a bad day it's minutes, and the app should say so.",
      "A failed charge is found out after the order is placed, so the product needs a way to ask for another card.",
      "Two workers are far more than a normal evening needs: the spare is what survives the provider's bad days.",
    ],
    alternatives: [
      "A circuit breaker stops calling the provider entirely once it's clearly failing, and checks again every so often. It saves the provider's quota and the workers' time.",
      "A second payment provider to fail over to removes the single dependency, at the cost of two integrations to keep working.",
      "Charging synchronously with a short timeout is simpler, but every slow call becomes an error the customer sees.",
    ],
  },
  "poison-pill": {
    overview:
      "Uploads go to the {object-store}, and preview jobs go on a {queue} that {worker} instances drain. The queue has a dead-letter queue: a message that fails three times is moved aside, an alert fires, and the work behind it carries on. Once the converter bug is fixed, the parked messages are replayed.",
    walkthrough: [
      "{load-balancer} → {app-server}. Opening a document reads it and its previews from the {object-store}.",
      "An upload stores the original in the {object-store} and puts a preview job on the {queue}.",
      "A {worker} takes a job, makes the page previews and saves them next to the original.",
      "A corrupt file crashes the converter. After the third failed attempt, the queue moves that message to the dead-letter queue instead of handing it out again.",
    ],
    numbers: [
      "800 requests a second: 760 document views and 40 uploads.",
      "Two {app-server} instances run at 40%. A preview takes about half a second of CPU, so each worker makes 8 a second, and eight workers run at 63%.",
      "With no dead-letter queue, the corrupt files keep coming back and the workers lose more than half their time to them: the queue falls 14 jobs a second behind.",
      "Buying through it takes thirteen workers, which costs $2,349 against a $1,900 budget, and they still spend most of their time failing.",
      "Cost: about $31 for the {load-balancer} + 2 × $70 + about $580 for the {object-store} + about $38 for the {queue} + 8 × $120 = $1,749 of $1,900.",
    ],
    tradeoffs: [
      "A parked message is a document without previews until someone acts. The alert on the dead-letter queue is what makes it a short wait.",
      "Three attempts is a guess: too few parks messages that failed for a passing reason, too many wastes workers on ones that never will.",
      "Replaying from the dead-letter queue needs the fix deployed first, or the messages come straight back.",
    ],
    alternatives: [
      "Validating files at upload catches some corrupt ones before they're queued, but not the ones that only fail deep inside the converter.",
      "Running each conversion with a time and memory limit stops one file from taking a worker down, which helps alongside the dead-letter queue.",
      "Dropping failed messages keeps the queue moving, but loses uploads silently.",
    ],
  },
  "login-flood": {
    overview:
      "The same small design as any read-heavy app, with two settings that matter here: a rate limit at the {load-balancer} (usually a web application firewall rule attached to it), so password guesses from each source are capped where they land, and a sign-in check on the {app-server}, so a request without a valid session gets nothing.",
    walkthrough: [
      "{load-balancer} → {app-server}. A firewall rule at the balancer counts requests per source, and turns away anything over the limit with a 'slow down' answer.",
      "The {app-server} checks the session on every request before reading anything.",
      "Catalogue reads come from the {cache}; accounts and watch history from the {sql-primary}.",
      "Sign-in attempts are also limited per account, so one account can't be guessed at slowly from thousands of addresses.",
    ],
    numbers: [
      "10,000 requests a second: 9,000 reads and 1,000 writes.",
      "The {cache} answers 5,130 reads a second; the {sql-primary} sees 3,870 reads and runs at 39%.",
      "Sixteen {app-server} instances run at 63%.",
      "Without the rate limit, the attack brings 40,000 requests a second and 60% of them fail, real users included. Forty servers cost $4,004 and still fail 16%: the {sql-primary} behind them is the next thing to fall over.",
      "Without the sign-in check, the probe's requests are answered.",
      "Cost: about $104 for the {load-balancer} + 16 × $70 + 2 × $150 + 2 × $400 = $2,324 of $2,500.",
    ],
    tradeoffs: [
      "Limits per source can block a whole office or university behind one address. Limit per account as well, and raise limits for known good sources.",
      "Too strict a limit turns a busy evening into errors for real users. Set it from normal traffic, with headroom.",
      "Checking sessions on every request costs a little CPU, which a cache of valid sessions mostly removes.",
    ],
    alternatives: [
      "A CAPTCHA after a few failed sign-ins stops automated guessing without blocking people outright.",
      "Checking new passwords against lists of leaked ones, and offering passkeys, makes stolen passwords far less useful.",
      "An {api-gateway} can do both the limit and the sign-in check in one place, in front of every service.",
    ],
  },
  "bad-migration": {
    overview:
      "A standby protects against a machine failing, not against a mistake: it copies the bad migration instantly. Point-in-time recovery on the {sql-primary}, and versioning on the {object-store}, let both be restored to the minute before the migration ran, inside the labs' 15-minute limit.",
    walkthrough: [
      "{load-balancer} → {app-server}. Results are read and written in the {sql-primary}; attached files in the {object-store}.",
      "The database keeps its log of changes, so a restore can replay to any minute. The {object-store} keeps old versions of every file.",
      "When the migration runs, the standby copies it. Nothing on the live system still has the data.",
      "Restore a copy of the database to the minute before the migration, check it, then switch over to it. The files are rolled back to the same moment.",
    ],
    numbers: [
      "600 requests a second: 540 reads and 60 writes.",
      "Two {app-server} instances run at 30%; the {sql-primary} at 5%.",
      "Point-in-time recovery restores to within about five minutes. A nightly backup could lose up to a day of results, against a 15-minute limit; with no backups, the deleted column is gone.",
      "The standby costs $400 a month and copies the mistake within a second: it's for uptime, not for this.",
      "Cost: about $30 for the {load-balancer} + 2 × $70 + 2 × $400 + about $432 for the {object-store} = $1,402 of $1,550.",
    ],
    tradeoffs: [
      "A restore takes time (the RTO): the notebook is read-only or down while it runs. Practise it, and time it.",
      "Writes made after the migration are lost by the restore unless they're replayed from logs by hand.",
      "Keeping the log for point-in-time recovery costs storage. Keep it as long as you might take to notice a mistake.",
    ],
    alternatives: [
      "A delayed replica, kept an hour behind, is a quick way back from a mistake noticed in time, but it's useless for one noticed later.",
      "Testing migrations on a copy of production data first catches most of these before they run.",
      "Migrations that add a new column and remove the old one later make most mistakes reversible without a restore.",
    ],
  },
  "nobody-noticed": {
    overview:
      "Invoices go on a {queue} that {worker} instances drain, and the queue has an alert on the age of its oldest message. When the workers hang, they look healthy, but the queue starts getting older, and the alert gets someone to replace the stuck worker. Six workers mean five can carry the load while that happens.",
    walkthrough: [
      "{load-balancer} → {app-server}. Usage records and invoice requests are written to the {sql-primary}.",
      "Each invoice request also goes on the {queue}. A {worker} renders the PDF and saves it to the {object-store}.",
      "The queue's alert fires when its oldest message is more than a few minutes old: the sign that workers have stopped, whatever the health checks say.",
      "Whoever is paged restarts the stuck worker, and the backlog drains.",
    ],
    numbers: [
      "400 requests a second: 380 reads and 20 invoices.",
      "A PDF takes about 300ms of CPU, so each worker renders about 13 a second. Three run at 50%. With one replaced at a time, two run at 75% and keep up.",
      "With no alerts on the workers or the queue, every worker stays hung and the queue grows by 20 invoices a second until someone notices.",
      "Two {app-server} instances run at 20%; the {sql-primary} at 4%.",
      "Cost: about $28 for the {load-balancer} + 2 × $70 + 2 × $400 + about $19 for the {queue} + 3 × $120 + about $104 for the {object-store} = $1,451 of $1,600.",
    ],
    tradeoffs: [
      "Health checks that only ask 'are you running?' miss this. A check that does a little real work catches more, but costs more to run.",
      "An alert on queue age catches any stopped consumer, whatever the cause, which makes it one of the most useful alerts there is.",
      "Every alert needs an owner and a first step, or it gets ignored.",
    ],
    alternatives: [
      "A timeout on each job, after which the worker kills it and moves on, stops one stuck job taking a worker for good.",
      "Restarting workers automatically when the queue ages helps at 3am, but can hide a bug that should be fixed.",
      "Tracing a sample of invoices end to end shows where they stop, which makes the fix faster.",
    ],
  },
  "balance-sheet": {
    overview:
      "A ledger, where a wrong answer is worse than no answer. The {sql-primary} runs three copies in three zones and commits a transfer only once a majority have it. During a split, the two connected zones still hold a majority and keep working; the cut-off zone refuses until the network heals.",
    walkthrough: [
      "{load-balancer} → {app-server}. The app checks the balance and writes the transfer in one transaction.",
      "The {sql-primary} sends the write to its other copies and commits once two of the three have it. Only then does the app say the money has moved.",
      "During a split, the side with two copies has a majority, so it carries on. The cut-off copy can't reach a majority, so it refuses: people there see an error and try again in a minute.",
      "If the cut-off copy was the primary, the two connected copies promote one of themselves after a short pause. The old primary can't commit anything meanwhile, and must step down when the network heals, or there'd be two primaries (split brain).",
      "Nobody on either side can commit a transfer the other side doesn't know about, so the same money can't be spent twice.",
    ],
    numbers: [
      "600 requests a second: 360 balance checks and 240 transfers.",
      "Three {app-server} instances run at 20%.",
      "The {sql-primary} is 8% busy on writes. Its p99 of 38ms includes about 5ms of waiting for a second zone to confirm each write.",
      "During the split, the cut-off zone's 200 requests a second are refused: 33% of traffic, and no conflicting transfers.",
      "Two copies cost $400 less, but a split leaves neither side with a majority, so every transfer is refused until it heals.",
      "A {nosql} store set to keep serving accepts 80 transfers a second on the cut-off side that the rest can't see. Some of them spend money that's already gone.",
      "Cost: about $30 for the {load-balancer} + 3 × $70 + 3 × $400 = $1,440 of $1,550.",
    ],
    tradeoffs: [
      "Refusing is a visible failure: the cut-off zone's users can't pay for a minute. That's the price of never being wrong.",
      "Every write waits for another zone, split or not. That's the other half of the trade (PACELC): latency for consistency, all the time.",
      "Three copies cost 50% more than two, and the third exists only to break ties.",
    ],
    alternatives: [
      "A second region: overkill here. The users are in one country, and with the ledger's copies in two regions every transfer would wait about 150ms for the other side to confirm, instead of 5. Zones already survive the chaos round; a second region pays off only when the business must survive a whole region going dark, and then it costs a full copy of the ledger.",
      "Reading balances from a replica would be cheaper, but it can show money that was just spent. Fine for a statement page, not for the check before a transfer.",
      "Five copies survive two zones failing, but cost more and add latency for a risk the business may not need to cover.",
      "A store that keeps serving, with a rule to undo overdrafts afterwards, is what some card networks do for small amounts: the business accepts a little risk to never decline a coffee.",
      "A {nosql} store with three copies, set to refuse during a split: also consistent, and cheaper here, but a transfer touches two accounts, so it needs the store's multi-item transactions, which are slower and more limited than a relational database's.",
    ],
  },
  "full-basket": {
    overview:
      "The opposite of a ledger: refusing an add-to-basket loses a sale, and two slightly different baskets can be merged. A {nosql} store keeps three copies and lets every copy accept writes. During a split, both sides keep working, and the baskets are merged when it heals.",
    walkthrough: [
      "{load-balancer} → {app-server}. The app reads and writes the shopper's basket by its basket ID.",
      "Each write returns as soon as one copy has it; the other copies catch up within milliseconds.",
      "During a split, the cut-off zone keeps taking adds and removals for its shoppers. The other zones don't see them yet.",
      "When the split heals, each basket's two versions are merged: every item added on either side is kept.",
    ],
    numbers: [
      "15,000 requests a second: 10,500 basket views and 4,500 adds and removals.",
      "4,500 writes a second is 150% of what one {sql-primary} can take, so the basket lives in {nosql}, where six blocks of about 1,000 writes a second each run at 75%.",
      "Twenty-eight {app-server} instances run at 54%.",
      "During the split, 1,500 writes a second land on the cut-off side and are merged later. Nobody is refused.",
      "Refuse mode turns the same split into errors for 33% of shoppers, and adds about 5ms to every request even without a split.",
      "Cost: about $143 for the {load-balancer} + 28 × $70 + 6 × $950 = $7,803 of $8,500. The {nosql} store's provisioned capacity is most of it.",
    ],
    tradeoffs: [
      "Merging adds keeps everything, which means a removed item can come back. Recording removals as well as adds fixes it, at the cost of more data per basket.",
      "Shoppers can briefly see an older basket on another device. Few notice; everyone notices a failed add.",
      "Checkout is different: the payment and stock check must be consistent even if the basket isn't.",
    ],
    alternatives: [
      "A {sql-primary} with standbys would keep one true basket, but it can't take the writes here, and a split would refuse a third of shoppers.",
      "Keeping the basket in the browser avoids the server entirely, but it's lost between devices and can't be seen by support.",
      "Last-writer-wins is simpler than merging, but it silently drops one side's changes.",
    ],
  },
  "tenant-split": {
    overview:
      "Writes outgrew one {sql-primary}, so the data is split into four shards by company. Each company's projects, tasks and comments live together, so almost every request goes to exactly one shard, and the biggest customer still fits inside one shard's quarter of the traffic.",
    walkthrough: [
      "{load-balancer} → {app-server}. Every request belongs to a signed-in user, who belongs to one company.",
      "The app works out the company's shard from its ID and sends the query there. Joins between tasks, comments and projects stay inside one database.",
      "Each shard is a primary with a standby in a second zone, so a crashed primary fails over without losing its companies.",
      "The rare report across every company (an admin dashboard) asks all four shards and merges the answers.",
    ],
    numbers: [
      "15,000 requests a second: 9,000 reads and 6,000 writes. One {sql-primary} would run at 200%.",
      "Four shards by company ID: the busiest takes 25% of the traffic, 1,500 writes a second, and runs at 50%. The biggest customer is 12%, which fits.",
      "By created date, 95% of writes are new rows on the newest shard: 5,700 a second, 190% of what it can take, however many shards there are.",
      "By task ID, writes spread evenly, but opening a task list doesn't name a task, so 85% of reads ask all four shards. The busiest runs at 80% and p99 reaches 350ms.",
      "Thirty {app-server} instances run at 50%. Three shards would leave the busiest at 67%, with p99 at 285ms against a 300ms target: it works today, with little room to grow.",
      "Cost: about $143 for the {load-balancer} + 30 × $70 + 4 × 2 × $400 = $5,443 of $5,900.",
    ],
    tradeoffs: [
      "A company that grows past one shard's capacity needs moving to a shard of its own, which is a planned migration, not a setting.",
      "Reports across companies are slow and depend on every shard being up. Feed them from a copy built for analytics instead.",
      "Keeping each company's data together also keeps it apart from others, which helps with data residency and noisy neighbours.",
    ],
    alternatives: [
      "Project ID also works here: projects are small and even. But a company's dashboard then asks several shards, and one company's data is spread across all of them.",
      "Hashing a key spreads writes perfectly but loses locality: queries that span related rows go everywhere.",
      "A distributed SQL database shards for you, but you still choose the key, and the same rules about hot keys and cross-shard queries apply.",
    ],
  },
  "like-storm": {
    overview:
      "One post is a hot key: keyed by post, all its likes land on one key, which no amount of capacity can fix. Splitting the hot post's likes across many sub-keys (the post ID plus a random suffix) spreads them across the store's partitions. Reading a count means adding up the sub-keys, so counts are cached. During a split, both sides keep taking likes and the counts are added up when it heals.",
    walkthrough: [
      "{load-balancer} → {app-server}. A like is written under its post ID plus a random suffix from 0 to 9.",
      "A count is read from the {cache} first. On a miss, the app reads all ten sub-keys, adds them up, and caches the total for a few seconds.",
      "The {nosql} store keeps copies in several zones and is set to keep serving, so each copy accepts likes on its own.",
      "During a split, likes keep landing on both sides. Counts and the set of who liked what merge cleanly when it heals, because adding likes up gives the same answer in any order.",
    ],
    numbers: [
      "15,000 requests a second: 12,000 count reads and 3,000 likes.",
      "The {cache} answers 10,830 count reads a second. 1,170 reach the store, and each reads ten keys.",
      "Without the {cache}, all 12,000 count reads reach the store, ten keys each: 222% of its read capacity, and 44% of requests fail.",
      "By post ID, the singer's post is 40% of likes: 1,200 a second on one key, 120% of what a key can take. Doubling the store's capacity doesn't help.",
      "With the suffix, the busiest key takes 4% of likes, 120 a second. Four blocks take all 3,000 likes at 75%.",
      "During the split, 1,000 likes a second land on the cut-off side and are added in later. Nobody's like fails. Refuse mode fails 9% of requests instead.",
      "Twenty-four {app-server} instances run at 63%.",
      "Cost: about $143 for the {load-balancer} + 24 × $70 + 2 × $150 + 4 × $950 = $5,923 of $6,500.",
    ],
    tradeoffs: [
      "Only hot posts need the suffix. Applying it to every post makes every count read ask ten places for no reason.",
      "Counts lag by a few seconds and can differ between two people looking at once. For likes, nobody minds.",
      "A like and an unlike on different sides of a split need a rule: storing each user's latest choice, not a running total, avoids counting both.",
    ],
    alternatives: [
      "Keying by the user who liked spreads writes too, but every count read then scans the whole table: even behind the {cache}, the store runs at 278% on reads.",
      "Sending likes through a {queue} and adding them up in batches cuts writes further, at the cost of counts that lag more.",
      "A single counter in memory is fastest, but it's lost on a restart unless something durable records the likes.",
    ],
  },
  worldwide: {
    overview:
      "Run everything users touch in two regions, and use a store that writes locally in each. The {load-balancer}, {app-server} tier and {cache} run in both regions, and the {nosql} store keeps a full copy in each, accepting writes on both sides and syncing them across within a second or two. Distant users never cross the ocean, and either region can carry everyone if the other goes dark.",
    walkthrough: [
      "{dns} sends each user to the nearest region's {load-balancer}, and away from a region that's down.",
      "Each region has its own {app-server} instances and {cache}, so a feed loads without leaving the continent.",
      "The {nosql} store keeps a copy in each region. Writes land in the nearest copy and replicate to the other in the background; conflicting edits to the same item are merged, newest version winning.",
      "When a region goes dark, {dns} stops sending users to it, and the surviving region takes everyone.",
    ],
    numbers: [
      "20,000 requests a second: 18,000 reads and 2,000 writes. Half the users are on another continent.",
      "Sixty {app-server} instances, thirty per region, run at 33%. When a region goes dark, the thirty left run at 67%. Forty would also pass, but at exactly 100% after losing a region: no headroom at all.",
      "Three {nosql} blocks in each region take the writes at 67%.",
      "Everything in one region instead adds the 150ms ocean crossing for half the users: p99 reaches 336ms, and the region outage takes everything down.",
      "Strong consistency across regions makes every write wait for the other region: p99 336ms. A {sql-primary} has one leader for the world, so distant writes cross the ocean: p99 381ms.",
      "Cost: $1 + about $208 for two {load-balancer}s + 60 × $70 + 2 × 2 × $150 + 2 × 3 × $950 = $10,709 of $11,600. Every store's cost doubles with the second copy.",
    ],
    tradeoffs: [
      "Writing locally means two regions can briefly disagree: a like might appear in Europe a second before Asia. For photos and likes that's fine; for a bank balance it isn't.",
      "Replication between regions is asynchronous, so a region that dies can take its last second or two of writes with it. Synchronous replication would cost 150ms on every write.",
      "Two of everything is expensive: the second region's stores cost as much as the first. That's the price of serving distant users quickly and surviving a region.",
    ],
    alternatives: [
      "One region with a {cdn}: images and static pages come from the edge near users, but every feed and every write still crosses the ocean.",
      "Home regions: each user's data lives in one region, and only that region writes it. No conflicts, and data stays in its country, at the cost of slow access when someone travels.",
      "A single {sql-primary} with read replicas abroad: reads are local, but every write still goes to one leader across the ocean.",
    ],
  },
  "claim-your-name": {
    overview:
      "Uniqueness is a consistency problem: a name can only be checked and claimed safely in one place. Sharding by username sends each name to exactly one shard, and each shard keeps three copies in three zones and refuses during a split unless it holds a majority. Two people can never both get the same name.",
    walkthrough: [
      "{load-balancer} → {app-server}. Signing up as a name goes to the shard that owns that name.",
      "The shard inserts the name only if it isn't there, and commits once two of its three copies have it.",
      "During a split, the two connected zones keep signing people up. The cut-off zone refuses until it heals, so it can't give away a name the others just gave out.",
      "Logging in by email doesn't name the username, so those few reads ask every shard. A second table keyed by email would make them single-shard.",
    ],
    numbers: [
      "15,000 requests a second: 9,000 name checks and profile reads, and 6,000 sign-ups and edits. One {sql-primary} would run at 200%.",
      "Three shards by username: the busiest takes 2,000 writes a second, at 67%. Its p99 of 119ms includes about 5ms of waiting for a quorum.",
      "By sign-up time, 90% of writes hit the newest shard: 5,400 a second, 180% of what it can take. By email domain, one big mail provider puts 55% on one shard: 110%.",
      "During the split, 33% of requests (the cut-off zone's) are refused, and no name is given out twice.",
      "Two copies per shard cost $1,200 less, but refuse everything during a split. A {nosql} store set to keep serving accepts 2,000 writes a second on the cut-off side, some of them names already taken.",
      "Thirty {app-server} instances run at 50%.",
      "Cost: about $143 for the {load-balancer} + 30 × $70 + 3 × 3 × $400 = $5,843 of $6,300.",
    ],
    tradeoffs: [
      "Sign-ups pause for a minute in the cut-off zone. A clear 'try again shortly' is better than giving the name away twice.",
      "A shard per name range makes popular short names land together. Hashing the name spreads them, at the cost of not being able to list names in order.",
      "Every sign-up waits for a second zone to confirm. On a launch day that's a few milliseconds on a form people fill in once.",
    ],
    alternatives: [
      "Reserving a name in a {cache} first is fast, but a cache can lose the reservation. The claim itself must be in the system of record.",
      "Letting both sides accept and renaming one person afterwards is a real strategy, but it means telling someone their name is gone.",
      "A single primary for names alone, with everything else sharded, works while sign-ups are within one primary's limit.",
    ],
  },
  "short-links": {
    overview:
      "A read-heavy key lookup: short code in, long URL out. A {cache} answers the popular links, so the {sql-primary} only sees misses and new links. The catch is that the database is now sized for the misses, so the cache gets a second node.",
    walkthrough: [
      "{dns} → {load-balancer} → {app-server}. The app reads the short code from the path.",
      "It asks the {cache} for the long URL. Popular links come back from memory in about a millisecond, and the app replies with a redirect.",
      "On a miss, the app reads the {sql-primary}, puts the answer in the cache with a long expiry, and redirects. Links rarely change, so cached copies rarely go stale.",
      "Creating a link writes a new row to the {sql-primary}, with a short code generated from a counter range each server reserved in advance.",
    ],
    numbers: [
      "20,000 requests a second: 19,600 clicks and 400 new links.",
      "90% of clicks are for links popular enough to be cached, and the cache hits 95% of those: 16,758 clicks a second never reach the database. It sees about 2,840 reads (28% of what it can do) and 400 writes.",
      "Thirty-two {app-server} instances run at 63%.",
      "Lose a single cache node and all 19,600 clicks hit the database at once: 196% of its capacity, and nearly half of requests fail. Two cache nodes in two zones survive losing one.",
      "Two read replicas would also survive it, but they cost $650 more than a second cache node and break the budget.",
      "The database's standby takes availability from 99.5% to 99.97% for the whole system.",
      "Cost: $1 + about $183 for the {load-balancer} + 32 × $70 + 2 × $150 + 2 × $400 = $3,524 of $3,800.",
    ],
    tradeoffs: [
      "A 301 (permanent) redirect lets browsers cache it, which cuts load but can hide repeat clicks from your analytics. A 302 sends every click back. Interviewers usually expect 302 when analytics matter; in practice big shorteners often send 301 with cache headers that keep browsers from caching it for long, and still count clicks.",
      "Long cache expiry is safe because links almost never change. When one is edited or taken down for abuse, delete its cache entry explicitly.",
      "Counter-based codes are unique without a lookup, but sequential codes are guessable. Shuffle or encrypt the counter if links must not be enumerable.",
    ],
    alternatives: [
      "A {nosql} key-value store suits this data perfectly and scales reads without replicas. A relational database is fine at this size and simpler to run.",
      "Hashing the long URL gives the same code for the same URL, but needs a collision check on every create.",
      "Redirecting from the {cdn}: fast and cheap, but every edge-served redirect is a click you don't count.",
    ],
  },
  "group-chat": {
    overview:
      "A write-heavy system: half of all requests are messages. A single {sql-primary} can't take 5,000 writes a second, so messages go to a partitioned {nosql} store, keyed by conversation. Each message also goes onto an {event-stream}, and push senders notify recipients who are offline.",
    walkthrough: [
      "Phones keep a connection open to an {app-server}, through the {load-balancer}.",
      "Sending a message: the app writes it to the {nosql} store, partitioned by conversation ID and sorted by time, then acknowledges to the sender (one tick).",
      "It publishes a message-sent event to the {event-stream}. Recipients connected to an app server get it over their open connection (two ticks).",
      "{serverless} push senders consume the same stream and send a push notification to anyone offline.",
      "Opening a chat reads its latest messages from the {nosql} store, starting from the last message the phone already has.",
    ],
    numbers: [
      "10,000 requests a second: 5,000 history reads and 5,000 messages.",
      "A {sql-primary} takes about 3,000 writes a second. 5,000 messages is well past that, and more instances are only standbys. The {nosql} store with seven blocks of capacity handles them at 71%.",
      "Eighteen {app-server} instances across three zones run at 56%. When a zone goes dark, the twelve left run at 83%.",
      "The {event-stream} carries 5,000 events a second across seven shards at 71%, and one block of {serverless} push senders runs at 50%.",
      "Availability is 99.93%: the stream is on the write path, so its 99.95% counts.",
      "Cost: $1 + about $104 for the {load-balancer} + 18 × $70 + 7 × $950 + 7 × $25 + about $1,577 of {serverless} invocations = $9,767 of $10,500. Write capacity in the {nosql} store is most of it.",
    ],
    tradeoffs: [
      "Partitioning by conversation keeps a chat's messages together and in order, but a huge group chat becomes a hot partition.",
      "Store first, then deliver: a message is never lost, but delivery happens after the write. At-least-once delivery means the phone must drop duplicates by message ID.",
      "End-to-end encryption means the server stores ciphertext it can't read, which rules out server-side search.",
    ],
    alternatives: [
      "A second region: overkill here, where the chaos round is a zone and the users aren't spread across continents. It would double the cost of every store. It earns its place once users are worldwide, so a message doesn't cross an ocean on its way to someone in the same city.",
      "Sharding the relational database by conversation works, but you'd be building a partitioned store by hand.",
      "Polling for new messages instead of open connections: simpler, but slower to deliver and far more requests.",
      "Delivering through a {queue}: each message would go to one consumer only, so either the connection servers or the push senders would miss it.",
    ],
  },
  "home-timeline": {
    overview:
      "Fan-out on write. When someone posts, {worker} instances copy the post into each follower's stored timeline. Opening the app is then a single lookup, answered from the {cache} for active users.",
    walkthrough: [
      "{dns} → {load-balancer} → {app-server}. Loading the timeline reads the user's precomputed timeline from the {cache}, falling back to the {nosql} store.",
      "Posting writes the post to the {nosql} store and publishes a post-created event to the {event-stream}. The user's request finishes there.",
      "Fan-out {worker} instances read each event, look up the author's followers, and add the post's ID to each follower's timeline.",
      "Accounts with millions of followers skip fan-out. Their posts are merged into a follower's timeline when it's read.",
    ],
    numbers: [
      "25,000 requests a second: 24,250 timeline loads and 750 posts.",
      "90% of loads are for active users whose timelines are in the {cache}, which hits 95% of those: 20,734 a second. The {nosql} store sees 3,516 reads, 23% of what its three blocks can take.",
      "Forty {app-server} instances run at 63%, and 94% on cup final night without dropping requests.",
      "Twenty-five fan-out workers handle 750 posts a second at 60%, and 90% on the spike.",
      "Building timelines at read time instead puts every load on the {nosql} store at 162% of its capacity: p99 reaches 533ms and 37% of requests fail before the spike even starts.",
      "Fanning out inside the request instead pushes the app tier to 136%: p99 reaches 1.7 seconds and 26% of requests fail.",
      "Cost: $1 + about $222 for the {load-balancer} + 40 × $70 + 2 × $150 + 3 × $950 + 2 × $25 + 25 × $120 = $9,223 of $10,000. The app tier, the {nosql} store and the fan-out workers are almost all of it.",
    ],
    tradeoffs: [
      "A post takes a few seconds to appear in every follower's timeline. Show it in the author's own timeline at once so it feels instant.",
      "Storage: every post is copied once per follower. Store post IDs, not posts, and cap each timeline at the latest few hundred.",
      "The hybrid (pull for celebrities) makes reads a merge of two sources, which is more code and harder to rank.",
    ],
    alternatives: [
      "Pure fan-out on read: simple, and fine for small apps, but the work repeats on every scroll.",
      "Pure fan-out on write: a celebrity post becomes millions of writes at once and takes minutes to land.",
      "A {queue} instead of the stream works for fan-out alone, but the stream lets search, notifications and analytics read the same posts.",
    ],
  },
  "ticket-drop": {
    overview:
      "Two very different kinds of traffic. Seat-map views can be a second stale, so the {cdn} and {sql-replica} instances absorb them. Seat holds must be exactly right, so they wait in a {queue}, and {worker} instances admit them to the {sql-primary} at the rate it can take.",
    walkthrough: [
      "{dns} → {cdn}. The event page and seat map are cached at the edge for a second or two, so most refreshes never reach you.",
      "Misses go through the {load-balancer} to the {app-server}, which reads seat availability from the {sql-replica} instances.",
      "Holding a seat: the app puts the request in the waiting-room {queue} and tells the fan their place in line.",
      "{worker} instances take requests at a fixed rate and try a conditional update on the {sql-primary}: hold this seat only if nobody else has. The winner gets ten minutes to pay.",
    ],
    numbers: [
      "20,000 requests a second: 18,000 seat-map views and 2,000 seat holds.",
      "The {cdn} serves 13,680 views a second from the edge. 4,320 reach the origin, split over two replicas at 22% each.",
      "Twenty-four {app-server} instances run at 26% normally and 79% in the on-sale minute.",
      "Six workers admit 3,000 holds a second, exactly what the {sql-primary} can write. Each keeps 100 holds in flight, and a hold spends about 200ms waiting on row locks.",
      "In the on-sale minute, 6,000 holds a second arrive. 3,000 are admitted and the line grows by 3,000 a second. Fans wait; nobody sees an error.",
      "Sending holds straight to the {sql-primary} instead fails half of them in the on-sale minute: 5% of all requests.",
      "Cost: $1 + about $2,628 for the {cdn} + about $33 for the {load-balancer} + 24 × $70 + 2 × $400 + about $315 for the {queue} + 6 × $120 + 2 × $400 = $6,978 of $7,500. Edge requests are the biggest line, even with on-sales only a few days a month.",
    ],
    tradeoffs: [
      "The seat map can show a seat that was just taken. That's fine as long as the hold itself checks the primary.",
      "A waiting room is honest but slow: tell fans their place and an estimated wait, and don't let them lose it by refreshing.",
      "Ten-minute holds stop payment racing another buyer, but block seats for people who abandon checkout. Release them on expiry.",
    ],
    alternatives: [
      "Holding seats in a {cache} is fast, but a cache can lose a hold or disagree with the database. Inventory belongs in the system of record.",
      "Scaling the app tier doesn't help: the limit is the database's writes, not the servers'.",
      "Selling general admission as a counter rather than named seats is far less contended, if the product allows it.",
    ],
  },
  "video-night": {
    overview:
      "Two pipelines that never share capacity. Watching: the {cdn} serves video segments from the edge, backed by the {object-store}. Uploading: the {app-server} stores the original, queues a transcode job, and {worker} instances produce each resolution.",
    walkthrough: [
      "A viewer's player fetches the playlist, then segments a few seconds long, choosing the resolution its bandwidth can handle.",
      "The {cdn} serves popular segments from the edge. Misses go through the {load-balancer} and {app-server} to the {object-store}.",
      "An upload is stored in the {object-store} and a job goes onto the {queue}. The creator sees 'processing'.",
      "Transcode {worker} instances produce each resolution, cut it into segments, and write them back to the {object-store}. Then the video goes live.",
    ],
    numbers: [
      "20,000 requests a second: nearly all segment requests, and one upload every two seconds.",
      "95% of requests are for popular videos, and the {cdn} hits 95% of those: 18,050 a second served at the edge. 1,950 reach the origin.",
      "Six {app-server} instances run at 33%, and 65% at the premiere.",
      "The {object-store} sees 1,950 reads, 35% of what one key prefix can take, and a trickle of writes: each upload, then its renditions.",
      "Each upload takes a transcode worker two minutes. Forty workers run at 38%, and 75% at the premiere.",
      "Without the {cdn}, 20,000 requests a second reach the origin. Even twenty app servers are swamped and the object store hits 364%.",
      "Cost: $1 + about $15,768 for the {cdn} + about $40 for the {load-balancer} + 6 × $70 + about $644 for the {object-store} + 40 × $120 = $21,674 of $23,500. Edge requests are most of the bill. For a real video service, bandwidth costs more again, and isn't modelled here.",
    ],
    tradeoffs: [
      "Transcoding every upload into every resolution wastes compute on videos nobody watches. Transcode the common resolutions first and the rest on demand.",
      "Segments of a few seconds let the player adapt quickly, but mean more requests and more files.",
      "The long tail of rarely watched videos always misses the edge, so the origin must be sized for it.",
    ],
    alternatives: [
      "Uploading straight to the {object-store} with a signed URL takes big files off the app servers entirely.",
      "Streaming a single file at one quality: simpler, but it stalls on slow connections.",
      "A commercial video platform: it does all of this for a per-minute fee, which is often the right call below a certain scale.",
    ],
  },
  "ride-hailing": {
    overview:
      "Location pings are 85% of the traffic, and a ping is worthless four seconds later. They go to an in-memory {cache}, bucketed by area for 'nearest drivers' lookups, and the {event-stream} carries the history to the {data-warehouse} for ETA and pricing models.",
    walkthrough: [
      "Each driver's phone sends its location every few seconds: {dns} → {load-balancer} → {app-server}.",
      "The app overwrites the driver's entry in the {cache}, in a geo bucket for their area. No database write.",
      "It publishes the ping to the {event-stream}, which the {data-warehouse} consumes for history.",
      "A rider's request reads the nearby buckets from the {cache} to find the closest available drivers, then offers the trip to one at a time.",
    ],
    numbers: [
      "25,000 requests a second: 3,750 rider reads and 21,250 location pings.",
      "The {cache} takes all 21,250 pings and every rider lookup at 11% busy: memory is built for this.",
      "Forty-five {app-server} instances across three zones run at 56%. When a zone goes dark, the thirty left run at 83%.",
      "Forty {event-stream} shards take about 1,000 events a second each, so they run at 53% and publishing stays fast. The {data-warehouse} loads 21,250 rows a second at 42%. It's behind the stream, so if it slows, history arrives late but riders notice nothing.",
      "Taking the pings in {nosql} instead would need 22 blocks of about 1,000 writes a second: over $20,000 a month against $300 for two cache nodes, and slower.",
      "Cost: $1 + about $222 for the {load-balancer} + 45 × $70 + 2 × $150 + 40 × $25 + $1,000 = $5,673 of $6,200.",
    ],
    tradeoffs: [
      "If a cache node is lost, its drivers vanish from the map for one ping interval, about four seconds, until they report again.",
      "Bucket size matters: too big and every lookup scans thousands of drivers; too small and a lookup needs many neighbouring buckets.",
      "Trips, fares and payments are not ephemeral. They belong in a durable database, written once per trip, not per ping.",
    ],
    alternatives: [
      "A {search-index} with geo queries: rich queries, but it can't absorb thousands of updates a second.",
      "Sending pings less often saves load and battery, at the cost of the car on the rider's map jumping.",
      "Matching by queueing trip requests per area rather than querying on demand: fairer in a surge, more machinery.",
    ],
  },
  "top-players": {
    overview:
      "Keep the ranking in memory, and the truth on disk. Every score goes into sorted sets in the {cache}, which answer 'top 100' and 'my rank' in microseconds; every score also goes onto an {event-stream}, and {worker} instances store each player's best score in a {nosql} store keyed by player, so the ranking can be rebuilt if the cache is lost.",
    walkthrough: [
      "{dns} → {load-balancer} → {app-server}. A finished game's score is checked (was this game real?) and added to the season's sorted set in the {cache}.",
      "Rank checks read the sorted set: the top 100 is a range at the top, and a player's rank is their position, both fast at millions of entries.",
      "The score is also published to the {event-stream}. {worker} instances compare it with the player's stored best and write only improvements.",
      "Bests live in the {nosql} store, keyed by player. If the cache loses a node, the ranking is rebuilt from them.",
    ],
    numbers: [
      "30,000 requests a second: 15,000 scores and 15,000 rank checks.",
      "Sixty {app-server} instances run at 50%, and 75% in the season's last hour.",
      "Two {cache} nodes take every score and every rank check at about 8% busy: sorted sets are built for exactly this.",
      "Thirty {event-stream} shards run at 50%. Twelve workers check scores at 63% (94% in the last hour), and one in five is a new best: 3,000 writes a second to four {nosql} blocks at 75%. In the last hour the store falls a little behind, then catches up.",
      "Keying the ranking itself in {nosql} makes the whole board one key: 3,000 writes a second against the 1,000 a key takes. Ranking in a {sql-primary} means 15,000 writes a second, five times what it takes.",
      "Cost: $1 + about $262 for the {load-balancer} + 60 × $70 + 2 × $150 + 30 × $25 + 12 × $120 + 4 × $950 = $10,753 of $11,600.",
    ],
    tradeoffs: [
      "The ranking lives in memory, so losing the cache means rebuilding it from the stored bests. Two nodes, one copying the other, make that rare.",
      "One sorted set holds the whole board on one node. Past tens of millions of players, split it by score range or region, and combine the tops.",
      "Ranks for players far down the board change constantly and matter little. Show 'top 12%' instead of '1,204,331th', and compute it less often.",
    ],
    alternatives: [
      "Storing every submission rather than each best: full history for anti-cheat, but five times the writes.",
      "Recomputing the board from the database every minute: simple, but ranks are a minute stale and the query is heavy.",
      "Separate boards per region or per friends list: smaller sorted sets, and often more interesting to players than a global rank.",
    ],
  },
  "near-me": {
    overview:
      "Find places by map cell, and cache each popular cell's results. The {app-server} turns a search into the map cells it covers and reads their results from the {cache}; misses go to a {search-index} built for geographic queries. Places live in the {sql-primary}, and every change flows through an {event-stream} into the index.",
    walkthrough: [
      "{dns} → {load-balancer} → {app-server}. A search for 'pizza within 1 km' becomes the geohash cell the point is in, plus its neighbours, so places near a cell's edge aren't missed.",
      "Each cell's results come from the {cache}. City centres are a few hundred cells everyone asks about, so most searches never go further.",
      "Misses go to the {search-index}, which answers geographic queries and ranks by distance, rating and whether a place is open.",
      "Owners' updates and new reviews are written to the {sql-primary}, published to the {event-stream}, and indexed within seconds.",
    ],
    numbers: [
      "30,000 searches a second, and 150 updates.",
      "Fifty {app-server} instances run at 60%, and 90% on Friday evening.",
      "The {cache} answers 22,686 searches a second; 7,164 reach the {search-index}, where seven nodes run at 51%, and 77% on Friday.",
      "Without the cache, even the ten nodes you can run would be at 149%.",
      "Searching with latitude and longitude ranges in the {sql-primary} instead runs it at 298%: a range on two columns can't use one ordinary index well.",
      "Cost: $1 + about $262 for the {load-balancer} + 50 × $70 + 2 × $150 + 7 × $200 + 2 × $400 + $25 = $6,288 of $6,900.",
    ],
    tradeoffs: [
      "Cached cell results can be a few minutes stale: a place that just closed may still show. Store opening hours and check them when ranking, rather than caching 'open now'.",
      "Fixed-size cells are simple, but a cell in a city centre holds thousands of places and one in the countryside none. A quadtree splits busy areas into smaller cells.",
      "The index trails the database by seconds, which is fine for places that change a few times a year.",
    ],
    alternatives: [
      "A quadtree in memory: cells split until each holds a manageable number of places. Precise, and it has to be rebuilt as places change.",
      "A database with spatial indexes: fine at lower volume, and simpler than a separate search index.",
      "A {cdn} for the busiest cells: answers from the edge, at a per-request price higher than serving from the cache.",
    ],
  },
  "on-schedule": {
    overview:
      "Jobs live in the {sql-primary} with their next run time. When one comes due, the scheduler puts it on a {queue}, and {worker} instances run it: one webhook call each, with a timeout, backoff and an idempotency key. A dead-letter queue sets aside jobs that always fail, and alerts catch workers that hang.",
    walkthrough: [
      "Customers create and check jobs through the {load-balancer} and {app-server}. Each job is a row in the {sql-primary} with its schedule and next run time, indexed by that time.",
      "Every few seconds the scheduler claims the jobs now due, with a lease so two schedulers can't both take one, puts each on the {queue}, and sets its next run time.",
      "{worker} instances run each job: one webhook call with a half-second timeout, retried with backoff, carrying an idempotency key so the customer can ignore repeats.",
      "A job that keeps failing moves to the dead-letter queue and the customer is told. Alerts on the queue's oldest message catch workers that hang.",
    ],
    numbers: [
      "2,000 requests a second: 1,000 customers checking on their jobs and 1,000 jobs coming due.",
      "Four {app-server} instances run at 50%; the {sql-primary} at 33%.",
      "A run is one webhook call of about 300ms, nearly all waiting, so each worker keeps 100 in flight. Twelve run at 25% normally.",
      "In the chaos round, timeouts hold each slow call for half a second instead of five, backoff adds a fifth more calls, the dead-letter queue sets aside the job that always fails, and alerts replace hung workers: the twelve run at 82%.",
      "Take away any one of those settings and the queue falls behind: by 511 jobs a second without the dead-letter queue, and by every job with no alert on either the workers or the queue. Without idempotency keys, retries deliver about 120 webhooks a second twice.",
      "Calling webhooks inside the scheduler's requests instead puts their slowness on every customer request: p99 passes 12 seconds.",
      "Cost: $1 + about $41 for the {load-balancer} + 4 × $70 + 2 × $400 + about $946 for the {queue} + 12 × $120 = $3,508 of $3,800.",
    ],
    tradeoffs: [
      "Delivery is at least once: a worker can call a webhook and crash before recording it. The idempotency key is what lets the customer treat a repeat as harmless.",
      "A job runs at its time plus the queue's wait. When everyone schedules for midnight, that wait grows: add jitter to 'daily' jobs, or let customers pick a window rather than a second.",
      "Polling a time-indexed table is simple and durable. It's less precise than an in-memory timer wheel, which is faster but has to be rebuilt from the table after a restart.",
    ],
    alternatives: [
      "A timer wheel in memory: jobs sorted into buckets by second, very cheap to fire, but every scheduler restart reloads the next stretch of jobs from the database.",
      "The queue's own delayed delivery: enqueue each job with a delay. Simple for one-off jobs, but long delays and recurring schedules still need the table.",
      "One cron process on one machine: fine for a handful of jobs, and a single point of failure for a service.",
    ],
  },
  "shared-doc": {
    overview:
      "Each document is a log of small edits, kept in order per document and merged so every copy ends up the same. The {app-server} that holds a document's open connections orders its edits and appends them to a {nosql} log keyed by document; the {cache} holds recent snapshots for fast opens. During a split, both sides keep typing, and the edits merge when it heals.",
    walkthrough: [
      "{dns} → {load-balancer} → {app-server}. Everyone editing a document is routed to the same server, which keeps their live connections and orders their edits.",
      "Each batch of keystrokes becomes an edit with the version it was made against. The server transforms it against edits that arrived first (or the edits are built to merge in any order), then broadcasts it to the other editors.",
      "Edits are appended to the {nosql} log, partitioned by document ID, and a snapshot is written now and then so opening a document doesn't replay its whole history.",
      "Opening a document reads its latest snapshot (usually from the {cache}) and the edits since.",
    ],
    numbers: [
      "10,000 requests a second: 6,000 batches of edits and 4,000 opens and catch-ups.",
      "Twenty {app-server} instances run at 50%.",
      "The {cache} answers 1,900 opens a second from recent snapshots; 2,100 reach the store.",
      "Keyed by document, eight {nosql} blocks take the edits at 75%. The busiest document writes 480 edits a second, under the 1,000 one key takes.",
      "Keyed by who typed, opening a document scans for every editor's changes: 237% of read capacity. Keyed by time, every new edit lands on one key.",
      "During the split, the cut-off zone keeps taking about 2,000 edits a second, merged when it heals. Refusing instead fails 27% of requests.",
      "Cost: $1 + about $104 for the {load-balancer} + 20 × $70 + 2 × $150 + 8 × $950 = $9,405 of $10,200.",
    ],
    tradeoffs: [
      "Operational transforms need one place to order each document's edits, which is simpler to reason about but ties a document to one server. CRDTs merge in any order, so offline editing and splits just work, at the cost of extra metadata in every edit.",
      "Routing every editor of a document to one server makes ordering easy, but that server is a hot spot for the busiest documents, and it must hand over cleanly when it fails.",
      "Snapshots trade storage for speed: more often means faster opens and more writes.",
    ],
    alternatives: [
      "Locking a paragraph while someone types in it: simple, and no merging, but people wait on each other, and a lost connection leaves a lock behind.",
      "Last writer wins on the whole document: easy, and it silently throws away everyone else's typing.",
      "A {sql-primary} for the edit log: fine for a small product, but 6,000 edits a second is twice what one takes.",
    ],
  },
  "click-counter": {
    overview:
      "Record fast, count later, keep everything. The {app-server} publishes each click to an {event-stream} and redirects at once. {worker} instances count clicks per ad per minute and write one total a minute to the {nosql} store; the {data-warehouse} keeps every raw click, so finance can recount and settle disputes.",
    walkthrough: [
      "{dns} → {load-balancer} → {app-server}. The click link carries a signed ID; the app checks it, publishes a click event, and redirects.",
      "The {event-stream} is partitioned by ad, so each ad's clicks go to one {worker}.",
      "Workers keep this minute's counts in memory. When the minute closes, each writes one count per ad to the {nosql} store, keyed by ad and minute, and commits its position in the stream.",
      "A second consumer loads every raw click into the {data-warehouse}, where billing is recounted nightly.",
    ],
    numbers: [
      "15,000 clicks a second at peak, and 30,000 in the half-time ad break.",
      "Forty {app-server} instances run at 38%, and 75% in the ad break.",
      "Forty {event-stream} shards of about 1,000 events a second each run at 38%, and 75% in the ad break.",
      "Twenty workers count at 38% (75% in the ad break) and write about 15 counts a second: a thousand times fewer writes than clicks.",
      "Writing each click to the {nosql} store instead gives the top ad's key 750 writes a second, and 1,500 in the ad break, over the 1,000 a key takes. It also needs twenty blocks: about $22,000 a month.",
      "Counting in a {sql-primary} means 15,000 writes a second, five times what it takes. Writing to the {data-warehouse} inside the request puts its seconds of latency on every redirect.",
      "Cost: $1 + about $143 for the {load-balancer} + 40 × $70 + 40 × $25 + 20 × $120 + $950 + $1,000 = $8,294 of $9,000.",
    ],
    tradeoffs: [
      "Dashboards are a minute behind, because a count is written when its minute closes. For billing, a minute is fine; for a live view, workers can also publish partial counts.",
      "Two paths, the fast stream counts and the nightly recount, are more to run. They're worth it where the numbers are money: the slow path catches what the fast one gets wrong.",
      "Late clicks need a rule: keep each minute open a little longer, and send anything later still to the nightly correction.",
    ],
    alternatives: [
      "A single path: count only in the stream, and replay raw events to fix mistakes. Simpler, if you trust the counting code with the bill.",
      "Counting only in the warehouse, in batches every few minutes: cheapest, but dashboards trail by the batch interval.",
      "A count-min sketch for approximate per-ad counts over millions of ads: fixed memory, small error, fine for dashboards, not for bills.",
    ],
  },
  "sync-folder": {
    overview:
      "Split the bytes from the bookkeeping. File contents travel as 4 MB chunks straight between devices and the {object-store}, through short-lived signed URLs; the {app-server} only answers what changed, signs those links, and records each new version in the {sql-primary}. Relaying the chunks instead would need more servers than you can buy.",
    walkthrough: [
      "A device splits a changed file into 4 MB chunks and hashes each one. It asks the {app-server} which hashes the store doesn't have yet.",
      "The app answers with a signed upload link for each missing chunk. The device sends them straight to the {object-store}: the bytes never reach your servers.",
      "The device then commits the new version: the file's list of chunk hashes. The app checks the chunks arrived and writes the version to the {sql-primary}.",
      "Other devices ask the app what changed since their last version, get signed download links for the chunks they lack, and fetch them from the {object-store}.",
    ],
    numbers: [
      "10,000 requests a second. Through the app tier: 5,000 checks for changes and 1,000 commits. Straight to the store: 2,000 chunk uploads and 2,000 chunk downloads.",
      "Twelve {app-server} instances run at 50%, and 75% on Monday morning.",
      "The {sql-primary} holds the metadata at 50% busy, 75% on Monday.",
      "The {object-store} takes 2,000 chunk uploads a second, 57% of what one key prefix accepts. Chunks are named by their hash, so they spread across prefixes as the service grows.",
      "Relaying the chunks through the app tier instead runs it at 883%. Even 60 servers, the most you can run, would be at 177%.",
      "A connection from the users that isn't set to carry chunks just becomes a second entrance, and half the ordinary traffic arrives at the store by mistake.",
      "Cost: $1 + about $72 for the {load-balancer} + 12 × $70 + 2 × $400 + about $8,540 for the {object-store} = $10,253 of $11,000. Most of it is per-request charges for chunks, so skipping chunks the store already has is the biggest saving.",
    ],
    tradeoffs: [
      "A signed URL is a bearer token: anyone holding it can use it until it expires. Keep links to one key, one action and a few minutes.",
      "The device must report the upload before the version is committed, so a half-uploaded file never appears. The app checks every chunk exists first.",
      "Fixed 4 MB chunks are simple, but inserting a byte at the start of a file shifts every chunk. Content-defined chunking finds boundaries in the data itself, so an edit changes only the chunks around it.",
    ],
    alternatives: [
      "A {cdn} in front of chunk downloads: popular shared files come from the edge. Most chunks are private and read once or twice, so the hit rate would be low.",
      "Relaying everything through the app tier: simpler permissions, but it pays for every byte twice and can't scale here.",
      "Storing small files inline with their metadata in the database: fewer requests for tiny files, at the cost of a bigger database.",
    ],
  },
  "save-game": {
    overview:
      "A key-value store keyed by player ID spreads millions of saves evenly, and keeps taking them during a split, because a lost save is the one thing players won't forgive. The catch is the single key everyone reads: no partition can serve 4,050 reads a second of one key, so the {cache} answers it.",
    walkthrough: [
      "{dns} → {load-balancer} → {app-server}. Every request names the player.",
      "Loads go to the {cache} first. Today's event settings, read by every player, are nearly always there, and so are active players' saves.",
      "Misses and saves go to the {nosql} store, partitioned by player ID, with three copies across zones.",
      "During a split, every copy keeps accepting saves. When it heals, copies exchange what they missed, and a per-player version decides which save wins.",
    ],
    numbers: [
      "30,000 requests a second: 27,000 loads and 3,000 saves.",
      "Fifty {app-server} instances run at 60%.",
      "The {cache} answers 15,390 loads a second, including almost every read of the event key. 11,610 reach the store.",
      "Keyed by player, saves spread across five {nosql} blocks at 60%. The event key gets 1,741 reads a second, under the 3,000 one key can take.",
      "Without the cache, that one key gets 4,050 reads a second, 135% of its limit. Ten blocks don't help: one key lives in one place.",
      "Keyed by region, the biggest region's partition takes 40% of the traffic and overloads. Keyed by time of save, every new save lands on the newest partition, and loading a player means a scan.",
      "During the split, the cut-off zone keeps taking about 1,000 saves a second, merged when it heals. Refusing instead fails 16% of requests.",
      "Cost: $1 + about $262 for the {load-balancer} + 50 × $70 + 2 × $150 + 5 × $950 = $8,813 of $9,500.",
    ],
    tradeoffs: [
      "A player who saves on one side of a split and loads on the other can see an older save for a moment. A version on each save means the newest wins when copies meet.",
      "Two devices saving the same player at once is a real conflict. Merge by the game's rules (most progress, the union of items) rather than letting the last write silently win.",
      "The cached event settings can be a minute stale after a change. Version the key, or push changes, if an event must start on the second.",
    ],
    alternatives: [
      "Ship today's event with the app, or serve it from a {cdn}: it's the same for everyone, so it needn't touch the store at all.",
      "Store the hot key as ten copies and read one at random: reads spread over ten partitions without a cache, and the daily write updates all ten.",
      "A {sql-primary} with replicas takes the loads, but 3,000 saves a second is its entire write capacity, so growth means sharding by hand.",
    ],
  },
  "fair-share": {
    overview:
      "The limit has to live where the API key is known, and its counters have to be shared. Each {app-server} checks the caller's key against a counter in the {cache} before doing any work, and refuses with '429 Too Many Requests' once the key is over its limit. The same cache holds popular map data, so the {sql-primary} sees only the misses.",
    walkthrough: [
      "{dns} → {load-balancer}, which limits by address: enough for a simple flood from one machine, not for this one.",
      "The {app-server} reads the API key and takes a token from that key's bucket in the {cache}: one atomic step, so two servers can't both spend the last token.",
      "Over the limit, the app answers 429 straight away, with how long to wait. Under it, the request carries on.",
      "Tile and address reads come from the {cache}; misses and writes go to the {sql-primary}.",
    ],
    numbers: [
      "20,000 requests a second: 19,000 reads and 1,000 writes.",
      "The {cache} answers 14,440 reads a second and keeps every key's count; the {sql-primary} sees 4,560 reads and 1,000 writes, at 46%.",
      "Thirty-six {app-server} instances run at 56%.",
      "The runaway script adds 60,000 requests a second. Each is refused at the first server it reaches, so the servers stay at 56%.",
      "With no limit in the app, the flood reaches every server: they run at 222% and over half of all requests fail, everyone's included.",
      "Counting in each server's memory instead lets the script through almost unchecked: each server sees only a 36th of its requests.",
      "Cost: $1 + about $183 for the {load-balancer} + 36 × $70 + 2 × $150 + 2 × $400 = $3,804 of $4,100.",
    ],
    tradeoffs: [
      "Every request now makes a call to the {cache}, so it's on the critical path. If it fails, a paid API should let requests through and alert; sign-ins might refuse instead.",
      "A token bucket allows short bursts and holds the average. A fixed window is cheaper but lets a caller send double across the boundary.",
      "Counts are shared within one region. Across regions, split the limit or sync counts every few seconds, and accept a little overshoot.",
    ],
    alternatives: [
      "A managed {api-gateway}: per-key limits and usage tiers with nothing to run, but it's billed per call, about $15,800 a month at this traffic.",
      "Counting in memory and syncing to the shared store every second: far fewer calls to the {cache}, at the price of briefly overshooting the limit.",
      "Limiting only by address at the {load-balancer}: cheap and worth keeping, but this script comes from hundreds of machines under one key.",
    ],
  },
  "pay-button": {
    overview:
      "A payment is recorded before it's charged, and charged in the background. The {app-server} writes it to the ledger as pending and queues the charge; {worker} instances call the provider with a timeout, backoff and the payment's idempotency key, then record the result. Every change goes on an {event-stream}, and the {data-warehouse} reconciles the ledger against the provider's records each day.",
    walkthrough: [
      "{dns} → {load-balancer} → {app-server}. The shopper's request carries an idempotency key, so a repeat returns the first answer instead of making a second payment.",
      "The app writes the payment to the ledger on the {sql-primary} as pending, in double entry: the shopper's side and the seller's side, always summing to zero.",
      "It puts the charge on the {queue} and tells the shopper the payment is processing. Their app checks the status, or is told when it changes.",
      "{worker} instances call the provider with a half-second timeout and retry with backoff and jitter, passing the same idempotency key every time, so the provider charges once however many attempts it takes.",
      "Each status change is published to the {event-stream}. The {data-warehouse} matches the ledger against the provider's settlement records every day and flags anything that doesn't agree.",
    ],
    numbers: [
      "2,000 requests a second: 1,400 status checks and 600 payments.",
      "Six {app-server} instances across three zones run at 33%, and 50% when a zone goes dark.",
      "The ledger's {sql-primary} is 20% busy, with a standby in a second zone that takes over in the outage.",
      "A charge takes about 300ms, nearly all waiting, so each worker keeps 100 in flight: about 333 charges a second. Twelve run at 15% on a normal day.",
      "On the bad afternoon the timeout holds each slow call for half a second, backoff adds a fifth more calls, and the dark zone takes four workers with it. The eight left run at 67%.",
      "Without idempotency keys, retries charge about 72 payments a second twice. Charging inside the request fails every payment once the provider slows, and a single ledger instance takes everything down with its zone.",
      "Cost: $1 + about $41 for the {load-balancer} + 6 × $70 + 2 × $400 + about $568 for the {queue} + 12 × $120 + $25 + $1,000 = $4,294 of $4,700. The provider's fees are a business cost, not counted here.",
    ],
    tradeoffs: [
      "The shopper sees 'processing' rather than an instant answer. Most charges finish in under a second; on a bad afternoon the app must say so, and never show 'paid' until the provider has confirmed.",
      "Twelve workers are mostly idle on a normal day. That's the price of surviving a slow provider and a lost zone at the same time.",
      "Idempotency keys only protect while both sides remember them. One large provider deletes them after about 24 hours, so a retry days later must check the payment's own record first.",
    ],
    alternatives: [
      "A second region for the ledger: tempting for payments, but a {sql-primary} has one leader, so the second region's writes would cross the ocean anyway, and failing over between regions can lose the last seconds of payments unless replication is synchronous, at about 150ms a write. Most payment systems run each market in its own region instead.",
      "Authorise the card while the shopper waits and take the money later in the background: an instant yes or no, at the cost of a slow request when the provider is slow. Many checkouts do this with a short timeout and fall back to 'processing'.",
      "A {nosql} ledger scales writes further, but double entry needs both sides of each movement written together, which relational transactions do best.",
      "Reconciling straight from the {sql-primary}: simple, but heavy queries compete with payments. Feeding the warehouse from the event stream keeps them apart.",
    ],
  },
  "web-crawler": {
    overview:
      "Finding links is fast and fetching pages is slow, so they're split. The frontier service checks each link against the URLs already seen and queues the new ones; {worker} instances fetch them with a timeout, store the pages in the {object-store}, and never ask any site for more than politeness allows.",
    walkthrough: [
      "Links found on fetched pages arrive at the {load-balancer} and the {app-server} frontier service.",
      "The frontier normalises each URL (lowercase host, no fragment or tracking parameters) and looks up its hash in the {nosql} seen set. Four in five are already there.",
      "New URLs are recorded in the seen set and put on the frontier {queue}.",
      "Fetcher {worker} instances take URLs off the queue and fetch them, with a half-second timeout and backoff on retries. Pages are stored in the {object-store}, keyed by URL, so a repeated fetch overwrites rather than duplicates.",
    ],
    numbers: [
      "7,500 links a second: 6,000 already seen and 1,500 new.",
      "Fourteen {app-server} instances run at 54%.",
      "The seen set grows by 1,500 keys a second, about 130 million a day, far too many for one database to keep forever. Two {nosql} blocks take the writes at 75% and the lookups at 60%.",
      "A fetch takes about a second, nearly all waiting, so each fetcher keeps 100 in flight. Thirty fetch 1,500 pages a second at 50%, using 75% of the sites' politeness budget.",
      "When big sites slow to ten seconds, the timeout cuts each try at half a second and backoff retries it later: the fetchers rise to 80% and keep up. With no timeout, each fetch waits the full ten seconds and the crawl falls 1,269 pages a second behind.",
      "Fetching inside the frontier service instead puts every site's response time on every link: p99 passes 13 seconds and most requests fail.",
      "Cost: about $84 for the {load-balancer} + 14 × $70 + 2 × $950 + about $1,419 for the {queue} + 30 × $120 + about $5,938 for the {object-store} = $13,921 of $15,000. Storing each page as its own object is the biggest line: writes are billed per request.",
    ],
    tradeoffs: [
      "One object per page is simple but costs about $5,900 a month in write requests. Real crawlers append pages into large archive files, which cuts the request count a thousandfold at the cost of keeping an index of where each page sits.",
      "Politeness caps the crawl: the sites set the pace, not your fetchers. More throughput means more sites in flight at once, not faster fetching from each.",
      "A timeout abandons slow pages, so slow sites are crawled less often. That's usually right: a slow site may be struggling, and asking less is the polite answer.",
    ],
    alternatives: [
      "A {sql-primary} for the seen set works at first, but it grows by 130 million rows a day, and every lookup is by one key. A partitioned key-value store is built for exactly that.",
      "A Bloom filter in memory in front of the seen set answers 'definitely new' without a lookup, and saves most of the reads for a small chance of skipping a URL that was new.",
      "Revisiting with conditional requests: an unchanged page answers 'not modified' with no body, so recrawling for freshness costs far less than the first fetch.",
    ],
  },
  "push-alerts": {
    overview:
      "Sending a push is slow, rate-limited work done by someone else. The {app-server} records each notification and puts it on a {queue}; {worker} instances hand them to the provider at the rate its quota allows. When a goal doubles traffic, the line grows for a minute and then drains, and the app never waits on the provider.",
    walkthrough: [
      "{dns} → {load-balancer} → {app-server}. A request to notify someone is checked against their settings (muted? quiet hours?) and written to the {sql-primary} as pending.",
      "The app puts the notification on the {queue} and answers straight away. Whoever asked doesn't wait for the push.",
      "{worker} instances take notifications off the queue, look up the user's device tokens and call the provider, about 100 calls in flight each.",
      "When the provider accepts, the worker marks the notification sent. If it refuses or times out, the message goes back on the queue and is retried with backoff; after a few failures it moves to a dead-letter queue.",
      "Inbox loads read the {sql-primary}, so a notification swiped away on the lock screen is still there when the app opens.",
    ],
    numbers: [
      "3,000 requests a second: 1,200 notifications to send and 1,800 inbox loads.",
      "Nine {app-server} instances run at 33%, and 67% when the goal doubles traffic.",
      "The {sql-primary} is 40% busy on writes, and 80% during the goal.",
      "A provider call takes about 150ms, nearly all waiting, so each worker keeps 100 in flight and sends about 667 a second. Three send 2,000 a second, exactly the provider's quota, and run at 60% at peak.",
      "The goal brings 2,400 notifications a second. 2,000 go out and the line grows by 400 a second; when the burst passes, the spare capacity drains it.",
      "Calling the provider inside the request instead puts its 600ms p99, and every refusal, on the app's critical path: p99 passes 12 seconds, and requests fail before the goal even goes in.",
      "Cost: $1 + about $49 for the {load-balancer} + 9 × $70 + 2 × $400 + about $1,135 for the {queue} + 3 × $120 = $2,975 of $3,250. The provider's own fees are a business cost, not counted here.",
    ],
    tradeoffs: [
      "A notification can arrive seconds late during a burst. For a goal alert that's fine; for a sign-in code it isn't, so time-critical messages deserve their own queue that bulk alerts can't hold up.",
      "The queue is billed per message: about $1,135 a month here. Sending and receiving in batches of ten cuts most of that.",
      "Delivery is at-least-once, so a retry can send a push twice. A notification ID the worker checks before sending keeps duplicates rare, and a collapse key lets the phone show only one.",
    ],
    alternatives: [
      "An {event-stream} instead of the queue: replayable, and analytics or email digests could read the same events. But each consumer tracks its own position, and a queue's per-message retries and dead-letter handling suit sending better.",
      "Buying more quota instead of queueing: the provider caps it, and a goal would still overshoot it for a minute. Queueing is cheaper than paying for a peak you hit twice a season.",
      "{serverless} senders: they scale per message with nothing to run, but every one still counts against the same quota, so you still need the queue to pace them.",
    ],
  },
  typeahead: {
    overview:
      "No time to search: the top suggestions for every prefix are worked out in advance and kept in memory. The {cdn} answers common prefixes at the edge, the {cache} answers the rest, and completed searches flow through an {event-stream} to the {data-warehouse}, where tomorrow's suggestions are built.",
    walkthrough: [
      "Each keystroke asks for suggestions for the prefix so far: 'pi', 'piz', 'pizz'. The client waits a few milliseconds after typing stops before asking.",
      "The {cdn} answers popular prefixes from the edge. Suggestions here aren't personalised, so everyone typing 'pizz' gets the same answer, and the browser can keep it for a minute too: backspacing and retyping costs nothing.",
      "Misses go through the {load-balancer} to the {app-server}, which looks up the prefix's top ten in the {cache}.",
      "When someone completes a search, the app logs it to the {event-stream}. A daily job in the {data-warehouse} recounts searches and rebuilds the top ten for every prefix.",
    ],
    numbers: [
      "10,000 requests a second: 9,500 keystrokes and 500 completed searches.",
      "The {cdn} serves 9,025 keystrokes a second from the edge. 475 reach the origin, plus the 500 logged searches.",
      "Four {app-server} instances run at 24%, and 49% when breaking news doubles traffic.",
      "The latency budget: about 4ms for {dns}, 35ms at the edge, 8ms at the balancer, 106ms in the app and 3ms in the {cache}. Logging a completed search to the {event-stream} adds 33ms, so the slowest request takes 187ms against a 200ms target.",
      "Asking a {search-index} on every keystroke instead adds about 75ms, and p99 reaches 232ms.",
      "Cost: $1 + about $7,884 for the {cdn} + about $33 for the {load-balancer} + 4 × $70 + 2 × $150 + 2 × $25 + $1,000 = $9,548 of $10,300.",
    ],
    tradeoffs: [
      "Suggestions are as fresh as the last rebuild. For trending topics, run a second, faster pipeline over the last hour and merge it in.",
      "Personalised suggestions can't be cached at the edge. Blend a small personal list on the client with the shared list from the edge.",
      "Edge requests are most of the bill. You're paying for answers that arrive from close to every user, and an origin that barely notices a breaking-news spike.",
      "Every suggestion you show is also a suggestion you endorse: filter offensive and harmful completions before they're published.",
    ],
    alternatives: [
      "A trie in each app server's memory: fastest of all, but each server needs a copy, and rebuilding it means a redeploy or a swap.",
      "Prefix queries on a {search-index}: flexible and always fresh, but too slow on every keystroke at this scale.",
      "Only suggesting after three characters cuts load a lot, at the cost of the first keystrokes.",
      "No {cdn}: the app tier and browser caches answer every keystroke. Cheaper here, since each answer is a few hundred bytes from memory, but users far from your region wait a long round trip on every keystroke, and a news spike lands on your servers.",
    ],
  },
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
      "200 requests a second, a quarter of them new receipts: 50 a second. 60% are photos, so 30 OCR jobs a second, and the other 20 are typed in.",
      "OCR providers cap calls per second, and default quotas are small: Amazon's receipt API defaults to 5 a second in its largest regions. Each {doc-ai} block here is 10 a second of raised quota; five blocks run at 60%.",
      "Deadline day is the chaos round at 1.5×: 45 jobs a second. Five blocks run at 90% and keep up. Three blocks would fall 15 jobs a second behind, and the queue would never drain.",
      "Each OCR call keeps a {worker} waiting about three seconds, but one worker can wait on about a hundred at once: two run at 45% normally and 68% on deadline day.",
      "The {sql-primary} takes two writes per photo (the pending row, then the results): 80 writes a second, about 3% of what it can take.",
      "Cost: $40,696 of $45,000, and about $39,400 of it is OCR. Tax season averages about a twentieth of the deadline peak, which is still almost 4 million pages a month at a cent each. The servers, database, storage and queue together are about $1,300.",
    ],
    tradeoffs: [
      "The user doesn't get the extracted fields immediately. Show the photo at once with a 'reading your receipt' state, and let them type the fields if they're in a hurry.",
      "OCR quota is a capacity plan you file with the provider, not a slider you move on the day. Raise it weeks before the deadline.",
      "Low-confidence results need review: send them to the user to confirm, rather than silently storing a wrong amount on a tax return.",
      "Photos cost money per page, so detect duplicates (the same receipt uploaded twice) before calling OCR, not after.",
    ],
    alternatives: [
      "Calling the {doc-ai} straight from the {app-server}: every upload waits seconds, and a burst hits the rate limit and fails.",
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
      "10,000 requests a second: 9,500 map views and 500 check-ins and notes.",
      "60% of map views are for busy, shared areas, and the {cdn} serves about 95% of those: roughly 5,400 a second never reach the origin. About 4,090 reads and the 500 writes get through.",
      "Eleven {app-server} instances run at 42%. On a holiday road trip (2×), they reach 83% without dropping requests.",
      "Five {search-index} nodes handle the geo queries at 41%, and 82% on the road trip.",
      "Without the {cdn}, the same origin sits above 90% busy on a normal day, and the road trip overloads it. Doubling the origin instead would actually cost less than the {cdn}'s requests: at about $1 per million, edge caching costs more per request than serving it yourself. You pay it to absorb the spike, and so drivers get answers from nearby rather than from your region.",
      "Cost: $1 + about $7,880 of {cdn} requests + about $61 for the {load-balancer} + 11 × $70 + 2 × $150 + 2 × $950 + 5 × $200 + 2 × $25 = $11,966 of $13,000.",
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
      "Peak is 1,500 requests a second and each {app-server} handles about 1,000. Two would cope at 75% busy, but the chaos round kills one, and one server can't carry 1,500. Three instances sit at 50%, and survive losing one at 75%.",
      "The {sql-primary} sees 1,200 reads and 300 writes a second: about 12% of what it can do. It doesn't need help with load.",
      "A single database instance is 99.5% available, which caps the whole system below the 99.9% target. The standby puts it in two failure domains: 1 - 0.005² = 99.9975%.",
      "Cost: about $37 for the {load-balancer} (a $25 fee plus usage) + 3 × $70 + 2 × $400 = $1,047 of the $1,200 budget.",
    ],
    tradeoffs: [
      "The standby doubles the database bill and adds no capacity at all. You're paying for availability, not speed.",
      "Spreading the app tier over two zones costs nothing extra, which is why it's always worth doing.",
      "The app servers must be stateless (sessions in a signed token) or losing one logs its users out.",
    ],
    alternatives: [
      "A {cache} would work, but the database is at 12%: it solves a problem this system doesn't have yet.",
      "Read replicas cost $400 each and also solve a load problem that isn't there. A standby is the cheaper fix for availability.",
    ],
  },
  "front-page": {
    overview:
      "A read-heavy workload where most reads ask for the same few articles. A {cache} between the app tier and the database turns 14,250 database reads a second into about 2,070.",
    walkthrough: [
      "The {load-balancer} spreads requests across the {app-server} pool, which builds each reader's personalised feed.",
      "To fetch articles, the app asks the {cache} first. Hits come back from memory in about a millisecond.",
      "Misses, and every write (comments, likes, new articles), go through to the {sql-primary}.",
      "When an editor updates an article, the app deletes the cached copy so the next read fetches the new one.",
    ],
    numbers: [
      "14,250 reads a second would overload the {sql-primary}, which tops out around 10,000.",
      "90% of reads are for cacheable articles, and a warm cache serves 95% of those: about 12,180 reads a second never reach the database. It gets roughly 2,070 reads and 750 writes, comfortably within its limits.",
      "The p99 target drives the app tier. At 15,000 requests a second, 27 instances run at 56% busy, which keeps their tail latency low enough for the 250ms target.",
      "Two {cache} nodes in two zones: the chaos round restarts one cold, and the other keeps serving. With a single node, all 14,250 reads hit the database at once and about 28% of them fail.",
      "Cost: about $143 for the {load-balancer} (a $25 fee plus usage) + 27 × $70 + 2 × $150 + 2 × $400 = $3,133 of the $3,300 budget.",
    ],
    tradeoffs: [
      "Readers can see an article a few seconds stale if invalidation is missed. For news, that's acceptable; for a bank balance, it wouldn't be.",
      "The second cache node exists purely to survive the cold-start stampede. It's $150 well spent, but only because the database can't absorb a full miss storm.",
      "Most of the bill is the app tier. A looser latency target would let you run fewer, busier servers.",
    ],
    alternatives: [
      "Read replicas: each takes up to 10,000 reads, so 14,250 a second needs two more at $400 each. That breaks the budget for something a $150 cache node does better.",
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
      "The page around the image (its HTML, scripts and styles) is static too, so it takes the same path: built once, uploaded to the {object-store}, served by the {cdn}. Comments, likes or sign-in would need an API behind the edge, which this level leaves out.",
    ],
    numbers: [
      "10,000 requests a second. All of them reaching the {object-store} would be nearly twice the 5,500 a second it serves for files that share a prefix, with or without {app-server} instances in front.",
      "95% of reads are for the viral images, and the {cdn} serves 95% of those. That leaves about 970 reads (and 50 uploads) a second for the {object-store}, well inside its 5,500.",
      "During the 2× spike, the origin sees about 2,000 a second: still under its limit, so nothing fails.",
      "Cost: $1 + about $7,880 of {cdn} requests + about $530 for the {object-store} (storage plus requests) = $8,413 a month. Bandwidth, the biggest real cost of images, isn't in this game's budget.",
    ],
    tradeoffs: [
      "Purging is slow: if an image is taken down, edge copies can survive until their TTL runs out unless you purge explicitly.",
      "The {cdn} is the only thing standing between 10,000 requests a second and an origin that serves 5,500. If it misbehaves, the origin is overwhelmed.",
      "In a real system, uploads would go straight to the {object-store} with a pre-signed URL rather than through the CDN.",
    ],
    alternatives: [
      "An {object-store} alone: 9,950 reads a second against 5,500. Nearly half of requests fail.",
      "{app-server} instances in front of the store: they'd still pass every request through to it, so it fails the same way, and you'd be running servers for files that need no logic.",
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
      "Browsing an album, the other half of the traffic, reads its photo details from the {sql-primary}. The page links to the resized copies, which browsers fetch straight from the {object-store}, usually through a {cdn}. This level leaves that path out: Going Viral is about it.",
    ],
    numbers: [
      "Done inline, each upload costs the {app-server} about 250 requests' worth of capacity (half a second of CPU, against about 2ms for an ordinary request) and adds half a second to the user's wait. That fails the 300ms target however many servers you add.",
      "With the slow work queued, two {app-server} instances handle 200 requests a second at 10% busy: they're there for availability, not capacity.",
      "100 uploads a second at half a second each: a 4-core {worker} does about 8 a second, so 12.5 would be 100% busy. Sixteen run at 78%, and when one dies in the chaos round, fifteen still keep up at 83%.",
      "The {sql-primary} takes 100 metadata writes a second, about 3% of what it can write. Resizing, not the database, is what this system pays for.",
      "Cost: about $26 for the {load-balancer} + 2 × $70 + $400 + about $95 of {queue} messages + 16 × $120 + about $420 for the {object-store} (mostly the price of writing 100 files a second) = $3,000 of $3,300.",
    ],
    tradeoffs: [
      "The user gets an instant response but not an instant result. You need a 'still processing' state and a way to tell them it's done.",
      "Queues deliver at least once, so the same resize job can run twice. Writing the output to a fixed key makes that harmless.",
      "Workers should scale on queue depth, not CPU. Size them for the peak arrival rate, or the backlog never drains.",
    ],
    alternatives: [
      "{serverless} functions triggered by each upload: no pool to size, but cold starts and per-invocation pricing at 100 a second.",
      "More app servers with inline resizing: the capacity can be bought, but the half-second wait can't be bought off.",
    ],
  },
  "zone-outage": {
    overview:
      "Every tier you run yourself must survive losing a zone: enough {app-server} instances that half of them can carry peak, and a {sql-primary} with a standby elsewhere. The {cache} can stay in one zone, because the database can absorb its loss.",
    walkthrough: [
      "The managed {load-balancer} already spans zones and routes around the dead one.",
      "Sixteen {app-server} instances across two zones: eight in each.",
      "Reads go through the {cache}; misses and writes reach the {sql-primary}.",
      "When zone A goes dark, the standby in zone B is promoted to primary.",
    ],
    numbers: [
      "Losing zone A takes eight of the sixteen {app-server} instances. The remaining eight have 8,000 requests a second of capacity for 7,500 of traffic: busy, but nothing is dropped.",
      "The {cache} goes down with zone A, so every read falls through: the {sql-primary} sees all 6,750 reads a second, about 68% of its limit, so the system slows rather than fails.",
      "Availability: {load-balancer} 99.99% × two app domains (99.99%) × two database domains (99.9975%) ≈ 99.977%, above the 99.95% target. The cache isn't counted, because losing it degrades the system rather than breaking it.",
      "Cost: about $84 for the {load-balancer} + 16 × $70 + $150 + 2 × $400 = $2,154 of $2,600.",
    ],
    tradeoffs: [
      "Two zones means each must carry 100% of peak, so you buy double. Three zones means each needs 50%, which is cheaper headroom once a tier is large.",
      "Failover isn't instant: expect a minute or two of errors while the standby is promoted.",
      "Leaving the {cache} single-zone is a deliberate bet that the database can survive a cold start. If it couldn't, you'd need a second node.",
    ],
    alternatives: [
      "Twelve {app-server} instances across three zones survive the outage too (eight remain), and cost $280 less. The reference uses two zones to make the 'each zone carries everything' point.",
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
      "4,000 requests a second, 1,600 of them orders. Seven {app-server} instances run at 57%.",
      "Each consumer of the {event-stream} receives all 1,600 events a second, across three shards of about 1,000 each. With a {queue}, they would split them and each see only 800.",
      "On the request path, the {data-warehouse} would add about four seconds to every request and could only answer about 20 small queries a second. Behind the stream, it just loads 1,600 events a second, a small share of what it can ingest.",
      "Cost: about $57 for the {load-balancer} + 7 × $70 + 2 × $400 + 3 × $25 + $200 + $1,000 = $2,622 of $2,900.",
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
      "600 requests a second: 480 reads to the {sql-replica} (5% of its capacity) and 120 writes to the {sql-primary} (4%).",
      "Before the fix, 0 of those 120 writes a second were stored anywhere. Nothing errored, because nothing ever tried to write.",
      "Cost: about $30 for the {load-balancer} + 3 × $70 + $400 + 2 × $400 = $1,440 of $1,550.",
    ],
    tradeoffs: [
      "Replication lag: an agent who saves a ticket and reloads at once may read the old version from the replica. Reading from the primary for a few seconds after a write fixes it.",
      "At this load, the replica isn't needed for capacity. It buys read headroom and a warm copy of the data.",
    ],
    alternatives: [
      "Point the app only at the {sql-primary} and remove the replica: also correct, and $400 cheaper, since the primary can easily take all 600 requests a second.",
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
      "11,250 reads a second against a {sql-primary} that tops out around 10,000: about 10% of requests failed, and adding app servers couldn't change that.",
      "85% of reads are for the catalogue and the cache serves 95% of those, so about 9,080 reads a second never reach the database. It now sees about 2,170 reads and 1,250 writes.",
      "The twenty {app-server} instances were fine all along, at 63% busy.",
      "Cost: about $124 for the {load-balancer} + 20 × $70 + $150 + 2 × $400 = $2,474 of $2,700.",
    ],
    tradeoffs: [
      "Prices and stock in the cache can be briefly stale. Show cached stock as a hint, and check the database at checkout.",
      "If the cache restarts cold during the sale, the database is back above its limit. A second node would cover that.",
    ],
    alternatives: [
      "Read replicas: two would split the reads under the limit, at $800 rather than $150.",
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
      "Rendering inline cost about 1.5 seconds per order and 750 requests' worth of CPU. Ten {app-server} instances spent almost all their time rendering PDFs.",
      "Without that work, two {app-server} instances handle 400 requests a second at 20% busy.",
      "8 orders a second at about 2.7 PDFs a second per {worker} needs three workers. Five run at 60%, and four still keep up at 75% if one dies.",
      "Cost: about $28 for the {load-balancer} + 2 × $70 + 2 × $400 + about $7 for the {queue} + 5 × $120 + about $57 for the {object-store} = $1,632 of $1,750: no more than the broken version, which spent its app tier rendering.",
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
      "Zone A takes one of the three {app-server} instances. Two remain, with 2,000 requests a second of capacity for 1,200 of traffic.",
      "Cost: about $34 for the {load-balancer} + 3 × $70 + 2 × $400 = $1,044 of $1,150.",
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
      "Wired in directly, the warehouse received 490 small reads a second against a limit of about 20, and its four-second p99 landed on every request.",
      "Behind the stream, it ingests 210 events a second: well under 1% of what it can load.",
      "Two {app-server} instances run at 35% busy.",
      "Cost: about $31 for the {load-balancer} + 2 × $70 + 2 × $400 + $25 + $1,000 = $1,996 of $2,200.",
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
      "50 orders a second, out of 2,000 requests. With the {queue}, each consumer got about 25, so each team saw half the orders and blamed the other.",
      "With the {event-stream}, both receive all 50 a second. One shard takes them at 5% of its capacity.",
      "Cost: about $41 for the {load-balancer} + 4 × $70 + 2 × $400 + $25 + $200 + $1,000 = $2,346 of $2,550. The {queue} it replaces cost about $47 a month, so price was never the reason to switch: delivery was.",
    ],
    tradeoffs: [
      "Consumers must track their own position in a stream, and it needs retention planning. Cost is a wash here: a {queue} is billed per message and a stream by the shard-hour, so a stream only gets cheaper at high volume. Choose on delivery, not price.",
      "Ordering only holds within a partition. Key events by order ID so each order's events stay in sequence.",
    ],
    alternatives: [
      "Two queues, with the app publishing to both: it works, but the app now knows every consumer, and adding a third means changing it again.",
    ],
  },
}
