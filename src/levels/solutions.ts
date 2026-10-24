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
      "6,000 requests a second: 3,000 count reads and 3,000 likes.",
      "The {cache} answers 2,280 count reads a second. 720 reach the store, and each reads ten keys.",
      "By post ID, the singer's post is 40% of likes: 1,200 a second on one key, 120% of what a key can take. Doubling the store's capacity doesn't help.",
      "With the suffix, the busiest key takes 4% of likes, 120 a second. Four blocks take all 3,000 likes at 75%.",
      "During the split, 1,000 likes a second land on the cut-off side and are added in later. Nobody's like fails. Refuse mode fails 21% of requests instead.",
      "Ten {app-server} instances run at 60%.",
      "Cost: about $72 for the {load-balancer} + 10 × $70 + 2 × $150 + 4 × $950 = $4,872 of $5,500.",
    ],
    tradeoffs: [
      "Only hot posts need the suffix. Applying it to every post makes every count read ask ten places for no reason.",
      "Counts lag by a few seconds and can differ between two people looking at once. For likes, nobody minds.",
      "A like and an unlike on different sides of a split need a rule: storing each user's latest choice, not a running total, avoids counting both.",
    ],
    alternatives: [
      "Keying by the user who liked spreads writes too, but every count read then scans the whole table: even behind the {cache}, the store runs at 171% on reads.",
      "Sending likes through a {queue} and adding them up in batches cuts writes further, at the cost of counts that lag more.",
      "A single counter in memory is fastest, but it's lost on a restart unless something durable records the likes.",
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
  typeahead: {
    overview:
      "No time to search: the top suggestions for every prefix are worked out in advance and kept in memory. Each keystroke is one lookup in the {cache}, and completed searches flow through an {event-stream} to the {data-warehouse}, where tomorrow's suggestions are built.",
    walkthrough: [
      "Each keystroke asks for suggestions for the prefix so far: 'pi', 'piz', 'pizz'. The client waits a few milliseconds after typing stops before asking.",
      "Suggestions here aren't personalised, so everyone typing 'pizz' gets the same answer, and the browser can keep it for a few minutes: backspacing and retyping costs nothing.",
      "Requests go through the {load-balancer} to the {app-server}, which looks up the prefix's top ten in the {cache}.",
      "When someone completes a search, the app logs it to the {event-stream}. A daily job in the {data-warehouse} recounts searches and rebuilds the top ten for every prefix.",
    ],
    numbers: [
      "10,000 requests a second: 9,500 keystrokes and 500 completed searches.",
      "Two {cache} nodes answer 9,500 lookups a second at 5% busy. Each answer is a few hundred bytes from memory.",
      "Twenty-five {app-server} instances run at 40%, and 80% when breaking news doubles traffic.",
      "The latency budget: about 4ms for {dns}, 10ms at the balancer, 133ms in the app and 3ms in the {cache}. Logging a completed search to the {event-stream} adds 33ms, so the slowest request takes 181ms against a 200ms target.",
      "Asking a {search-index} on every keystroke instead adds about 110ms, and p99 reaches 262ms.",
      "Cost: $1 + about $104 for the {load-balancer} + 25 × $70 + 2 × $150 + 2 × $25 + $1,000 = $3,205 of $3,500.",
    ],
    tradeoffs: [
      "Suggestions are as fresh as the last rebuild. For trending topics, run a second, faster pipeline over the last hour and merge it in.",
      "Personalised suggestions can't be shared between users. Blend a small personal list on the client with the shared list from the server.",
      "Every suggestion you show is also a suggestion you endorse: filter offensive and harmful completions before they're published.",
    ],
    alternatives: [
      "A trie in each app server's memory: fastest of all, but each server needs a copy, and rebuilding it means a redeploy or a swap.",
      "Prefix queries on a {search-index}: flexible and always fresh, but too slow on every keystroke at this scale.",
      "Only suggesting after three characters cuts load a lot, at the cost of the first keystrokes.",
      "A {cdn} in front: popular prefixes answered closer to users. At about $1 per million requests it would add about $7,900 a month, more than the whole origin, for answers that cost almost nothing to serve from memory.",
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
      "1,600 orders a second. With the {queue}, each consumer got about 800, so each team saw half the orders and blamed the other.",
      "With the {event-stream}, both receive all 1,600 a second, across three shards of about 1,000 each.",
      "Cost: about $57 for the {load-balancer} + 7 × $70 + 2 × $400 + 3 × $25 + $200 + $1,000 = $2,622 of $2,900. The {queue} it replaces cost about $1,500 a month by itself, because it's billed per message.",
    ],
    tradeoffs: [
      "Consumers must track their own position in a stream, and it needs retention planning. At this volume it's also cheaper: a {queue} is billed per message, a stream by the shard-hour.",
      "Ordering only holds within a partition. Key events by order ID so each order's events stay in sequence.",
    ],
    alternatives: [
      "Two queues, with the app publishing to both: it works, but the app now knows every consumer, and adding a third means changing it again.",
    ],
  },
}
