import { deck } from "./build"

/**
 * Decks for the CAP shelf. Every card steers the discussion back to the same
 * question: when copies of the data can't agree, what does this product do?
 * Same layout in each deck, so quiz questions can cite cards by position:
 * 0-2 clarify, 3-4 product, 5-8 decision, 9-11 trade-off, 12-13 alternative,
 * 14-15 scale, 16 edge case, 17-18 failure and recovery, 19-20 security,
 * 21 observability.
 */

export const BALANCE_SHEET = deck("balance-sheet", [
  [
    "clarify",
    "What would you ask about what a wrong balance costs?",
    [
      "Is an overdraft a disaster, or a fee the business can recover? That decides whether a short disagreement between copies is ever acceptable.",
      "Are there limits on how much can move at once? Small, capped transfers make the cost of a mistake bounded.",
      "Who carries the loss if money is spent twice: the user, the business or a partner bank?",
    ],
    "If the business says 'a few pounds of risk is fine, a declined payment isn't', what changes?",
  ],
  [
    "clarify",
    "What would you ask about how the system is spread across zones or regions?",
    [
      "How many zones or regions hold copies, and are users in one place or spread out?",
      "How often does the network between them break, and for how long? Rare, short splits change how much refusing costs.",
      "Do any regulators require the data to stay in one country? That limits where the copies can go.",
    ],
  ],
  [
    "clarify",
    "Which reads need the very latest balance, and which can be a little old?",
    [
      "The check before a transfer needs the latest balance: it must come from the copies that decide.",
      "A statement page or a monthly summary can be seconds behind.",
      "Separating the two lets most reads be cheap without risking the transfers.",
    ],
  ],
  [
    "product",
    "During a split, what should a user on the cut-off side see?",
    [
      "A clear message that payments are paused and will be back shortly, not a spinner that times out.",
      "Their balance, marked as possibly out of date, so they're not left blind.",
      "No retries that might send the money twice once the split heals.",
    ],
  ],
  [
    "product",
    "Should small transfers be allowed while the system can't be sure of the balance?",
    [
      "Some payment systems approve small amounts offline and settle later, accepting the risk for a better experience.",
      "That's a product decision, with a limit per user and a way to recover what's lost.",
      "Large transfers still wait for the consistent answer.",
    ],
    "How would you cap the total risk across everyone on the cut-off side?",
  ],
  [
    "decision",
    "During a network split, should the ledger refuse transfers or keep accepting them?",
    [
      "Refuse. If both sides accept withdrawals they can't see each other's, the same money can be spent twice.",
      "That's choosing consistency over availability for this data, which is what the CAP theorem says you must choose between during a split.",
      "Refusing is visible but recoverable: the user tries again. A double spend may not be recoverable.",
    ],
    "What would make you choose the other way?",
  ],
  [
    "decision",
    "How many copies of the ledger, and why that number?",
    [
      "Three, in three zones. A write commits once two have it, and one zone cut off still leaves two together: a majority.",
      "Two copies can't do it: after a split each side has one of two, and neither is a majority, so both must refuse.",
      "Four survives no more than three does and costs more. Five survives two failures.",
    ],
    "Why does the majority rule stop both sides committing different transfers?",
  ],
  [
    "decision",
    "When does the app tell the user their transfer is done?",
    [
      "Only once a majority of copies have committed it, so it survives any single zone failing straight after.",
      "Before that, it's 'processing'. Saying 'done' early and then losing it is the worst outcome.",
      "Give the transfer an ID the client sends, so a retry after a timeout can't apply it twice.",
    ],
  ],
  [
    "decision",
    "How do you make a transfer between two accounts all-or-nothing?",
    [
      "One database transaction debits one account and credits the other, so neither half can happen alone.",
      "Record every transfer as an entry in an append-only ledger, and derive balances from it.",
      "If the accounts ever live in different shards, that becomes a distributed transaction: much harder, and a reason to keep the ledger together while you can.",
    ],
  ],
  [
    "tradeoff",
    "What does strong consistency cost when nothing is broken?",
    [
      "Every write waits for a copy in another zone to confirm it, which adds latency to every transfer.",
      "That's the second half of PACELC: else, without a split, you trade latency for consistency.",
      "Splits are rare; the latency is paid on every request. Measure it against the target.",
    ],
  ],
  [
    "tradeoff",
    "Three copies across three zones: what do you pay for the third?",
    [
      "50% more database cost than two, and the third mostly exists to break ties.",
      "In return, one zone failing or being cut off never stops the ledger.",
      "A cheaper third copy that only votes (a witness) can break ties without holding all the data.",
    ],
  ],
  [
    "tradeoff",
    "Is the 'C' in CAP the same as the 'C' in ACID?",
    [
      "No. ACID's consistency means the database keeps its own rules, such as balances never going negative.",
      "CAP's consistency means every copy gives the same, latest answer: what you read is what was last committed anywhere.",
      "Mixing them up is a common interview slip. Say which one you mean.",
    ],
  ],
  [
    "alternative",
    "Could you keep accepting transfers and fix mistakes afterwards?",
    [
      "Yes, with limits: approve small transfers, record them, and recover overdrafts later. Card networks do something like this.",
      "It trades a small, bounded financial risk for never declining a payment.",
      "It needs a reconciliation process and someone who owns the losses.",
    ],
  ],
  [
    "alternative",
    "Why not read balances from replicas to save the primary?",
    [
      "A replica lags, so it can show money that was just spent. Fine for a statement, unsafe for the check before a transfer.",
      "Here reads aren't the bottleneck, so there's nothing to save.",
      "If reads grow, send only the history and statement pages to replicas.",
    ],
  ],
  [
    "scale",
    "Transfers grow tenfold. What breaks first?",
    [
      "One primary's writes. You'd shard the ledger by account.",
      "A transfer between accounts on two shards then needs both to agree, which needs a protocol such as two-phase commit, and is slower.",
      "Keeping related accounts (a family, a business) on one shard keeps most transfers single-shard.",
    ],
  ],
  [
    "scale",
    "Users spread to a second continent. Do you put a copy there?",
    [
      "A strong write would then wait for a round trip across an ocean, adding tens to hundreds of milliseconds.",
      "Alternatively, give each user a home region where their account lives, and only that region writes it.",
      "Reads elsewhere can come from a nearby copy that's a little behind.",
    ],
  ],
  [
    "edge-case",
    "A transfer times out. Did it happen?",
    [
      "Maybe: the commit may have succeeded just before the timeout. The client can't tell.",
      "The client retries with the same transfer ID; the ledger sees the ID and returns the original result.",
      "Never retry with a new ID, or a slow network becomes a double payment.",
    ],
  ],
  [
    "resilience",
    "A whole zone fails, not just its network link. What's different from a split?",
    [
      "Nothing for the ledger: the two remaining copies are still a majority, so writes carry on.",
      "The difference is that the dead zone's copy needs rebuilding from the others when it comes back.",
      "Until it does, the ledger has no spare: lose another zone and it refuses everything. Restore the third copy quickly.",
    ],
  ],
  [
    "resilience",
    "A bad release starts writing wrong balances. How do you recover?",
    [
      "Copies don't help: they faithfully copy the mistake. You need backups and a point-in-time restore.",
      "Because the ledger is append-only, you can find the bad entries and write correcting ones instead of editing history.",
      "Know your RPO: how many minutes of transfers you could re-create if you had to restore.",
    ],
  ],
  [
    "security",
    "What stops a user replaying a transfer request someone else captured?",
    [
      "Signed requests with a unique ID and an expiry: a replay has an ID the ledger has already seen.",
      "Strong authentication for anything that moves money.",
      "Limits per account and alerts on unusual transfers.",
    ],
  ],
  [
    "security",
    "Who can change the ledger directly?",
    [
      "Nobody, day to day: corrections are new entries made through the app, with a reason and a second approver.",
      "Database access for engineers is logged and time-limited.",
      "An audit trail that can't be edited is a requirement for most financial regulators.",
    ],
  ],
  [
    "observability",
    "How would you know the ledger is refusing writes because of a split?",
    [
      "Alert on the share of writes refused for want of a majority, per zone.",
      "Track the time since each copy last heard from the others.",
      "Run a nightly check that every account's balance equals the sum of its ledger entries.",
    ],
  ],
])

export const FULL_BASKET = deck("full-basket", [
  [
    "clarify",
    "What would you ask about what an out-of-date basket costs?",
    [
      "Is it worse for a shopper to see an item they removed, or to be told they can't add one? The business usually says the second.",
      "How long can two devices disagree before people notice?",
      "Does the basket reserve stock, or is stock only checked at checkout?",
    ],
    "If adding to the basket did reserve stock, would your answer change?",
  ],
  [
    "clarify",
    "What would you ask about the traffic?",
    [
      "How many adds and removals at peak, compared with views? Here it's 4,500 writes a second, more than one SQL primary takes.",
      "Is there a seasonal peak, such as a holiday sale, that sets the size?",
      "How big does a basket get? A few items, or hundreds for business buyers?",
    ],
  ],
  [
    "clarify",
    "Which parts of shopping must be exactly right, and which can be merged later?",
    [
      "The basket can be merged later: adds from two devices can both be kept.",
      "Payment and stock at checkout must be exactly right.",
      "Drawing that line early is what lets each part choose differently.",
    ],
  ],
  [
    "product",
    "A shopper adds an item on their phone and removes it on their laptop during a split. What should they see afterwards?",
    [
      "With a plain merge of adds, the item comes back, which is confusing.",
      "Recording the removal as well as the add lets the merge keep it removed.",
      "Showing 'we updated your basket' when a merge changes something helps people trust it.",
    ],
  ],
  [
    "product",
    "Should a signed-out shopper's basket survive signing in?",
    [
      "Yes: merge the guest basket into the account's basket, the same way two devices merge.",
      "Ask only if there's a real conflict, such as different quantities of the same item.",
      "This is the same merge logic, used every day, not just during splits.",
    ],
  ],
  [
    "decision",
    "During a split, should basket writes be refused or accepted?",
    [
      "Accepted. A refused add is a lost sale; a basket that briefly differs between devices costs almost nothing.",
      "That's choosing availability over consistency for this data.",
      "The copies will disagree until the split heals, so you need a merge rule.",
    ],
    "Which part of the same shop would you choose the opposite for?",
  ],
  [
    "decision",
    "How do two versions of a basket become one?",
    [
      "Merge them: keep every item added on either side, and apply removals that were recorded.",
      "Last-writer-wins by timestamp is simpler but silently drops one side's changes, and clocks on different machines disagree.",
      "Data types designed to merge (CRDTs, such as a set that tracks adds and removes) make the merge automatic.",
    ],
  ],
  [
    "decision",
    "Why a {nosql} store rather than a {sql-primary} for baskets?",
    [
      "4,500 writes a second is 150% of one primary. A partitioned store spreads them.",
      "Baskets are looked up by one key and never joined, which is what a key-value store is built for.",
      "Many such stores let each copy accept writes and reconcile, which is the behaviour the basket needs.",
    ],
  ],
  [
    "decision",
    "When a write returns, how many copies have it?",
    [
      "In keep-serving mode, one: the write returns fast and the others catch up within milliseconds.",
      "That means a copy that fails straight after a write could lose it, unless it has been passed on.",
      "Some stores let you choose per request: one copy for a basket, a majority for something that matters more.",
    ],
  ],
  [
    "tradeoff",
    "What do you give up by choosing availability for baskets?",
    [
      "Shoppers may see an older basket on another device for a moment.",
      "Removed items can return after a merge unless removals are recorded.",
      "You need merge logic and tests for it, which a single source of truth wouldn't need.",
    ],
  ],
  [
    "tradeoff",
    "Keep-serving mode is also faster. Why?",
    [
      "A write returns once one copy has it, instead of waiting for another zone to confirm.",
      "That's PACELC: even without a split, you're trading consistency for lower latency.",
      "Here it saves about 5ms per request, between zones. With copies in other regions it's tens of milliseconds or more.",
    ],
  ],
  [
    "tradeoff",
    "Should 'items in basket' on the page header always match the basket itself?",
    [
      "Ideally, but they may be read from different copies a moment apart.",
      "Reading both from the same copy in one request keeps one page consistent with itself.",
      "Across pages, a small mismatch is acceptable here.",
    ],
  ],
  [
    "alternative",
    "Could the basket live only in the browser?",
    [
      "It avoids server writes entirely, and works offline.",
      "But it's lost between devices, can't be seen by support, and can't drive 'you left something in your basket' emails.",
      "Many shops keep a browser copy and sync it to the server when they can.",
    ],
  ],
  [
    "alternative",
    "Why not a {sql-primary} with standbys, which keeps one true basket?",
    [
      "It can't take 4,500 writes a second.",
      "During a split, a consistent store refuses the minority side, which here means failed adds.",
      "It's the right home for orders, once a basket becomes a purchase.",
    ],
  ],
  [
    "scale",
    "Basket writes double on a sale day. What do you change?",
    [
      "Add capacity to the {nosql} store; baskets are keyed by basket ID, which spreads evenly.",
      "Add {app-server} instances to match.",
      "Nothing about the consistency choice changes: it's per data, not per traffic level.",
    ],
  ],
  [
    "scale",
    "The shop opens in a second region. Where do baskets live?",
    [
      "Each region keeps a copy and accepts writes, and they reconcile: the same merge, over a longer link.",
      "A shopper usually stays in one region, so conflicts stay rare.",
      "Checkout still needs one place that decides stock, which may mean a cross-region call at the end.",
    ],
  ],
  [
    "edge-case",
    "The same item is added twice, once on each side of a split. How many are in the basket afterwards?",
    [
      "It depends on what you store. 'Item is in the basket' merges to one; 'add one more' merges to two.",
      "Storing quantities per device and taking the maximum is one rule; summing is another.",
      "Choose the rule that matches what people meant, and test it.",
    ],
  ],
  [
    "resilience",
    "A copy is cut off for an hour, not a minute. What's different?",
    [
      "Many more writes to merge when it returns, so the merge must be efficient and safe to run in batches.",
      "Stores track which copy has seen which changes, so only the missing ones are sent.",
      "If a copy is gone for longer than the store keeps its change history, rebuild it from the others.",
    ],
  ],
  [
    "resilience",
    "A bug corrupts thousands of baskets. How do you recover?",
    [
      "Backups or point-in-time recovery restore the table as it was before the bug.",
      "Baskets are low-value and short-lived, so restoring a few hours old is usually acceptable.",
      "Copies spread the bug as fast as good data: they're not backups.",
    ],
  ],
  [
    "security",
    "How do you stop one shopper reading or editing another's basket?",
    [
      "The basket ID comes from the shopper's signed-in session, never from a value the browser can change.",
      "Guest basket IDs are long and random, so they can't be guessed.",
      "Check ownership on every write, including during a merge.",
    ],
  ],
  [
    "security",
    "Can a shopper set their own price by editing the basket?",
    [
      "The basket stores items and quantities, not prices.",
      "Prices and discounts are worked out at checkout from the catalogue.",
      "Never trust a total the browser sends.",
    ],
  ],
  [
    "observability",
    "How would you know merges are going wrong?",
    [
      "Count merges and the conflicts they resolved, per hour.",
      "Track support tickets about items reappearing or vanishing.",
      "Sample merged baskets and compare them with what each side had.",
    ],
  ],
])

export const TENANT_SPLIT = deck("tenant-split", [
  [
    "clarify",
    "Before choosing a partition key, what would you ask about the queries?",
    [
      "What are the top five queries, and which field does each one filter by?",
      "Do any queries cross companies, such as admin reports or a global search?",
      "Do tasks ever move between projects or companies?",
    ],
    "Why should the queries, not the data, choose the key?",
  ],
  [
    "clarify",
    "What would you ask about the size of the biggest customers?",
    [
      "How much of the traffic does the largest company make? Here it's about an eighth.",
      "Is that growing faster than everyone else?",
      "A company bigger than one shard can't be kept together, so its size sets the limit of this key.",
    ],
  ],
  [
    "clarify",
    "Is this sharding the same as the 'partition' in CAP?",
    [
      "No. Sharding (data partitioning) is choosing to split data across machines for scale.",
      "CAP's P is a network partition: a failure where machines can't reach each other.",
      "A sharded system still has to decide what happens when the network splits; the two questions are separate.",
    ],
  ],
  [
    "product",
    "A customer asks for their data to stay in one country. How does sharding by company help?",
    [
      "A company's data lives together, so its shard can sit in the region they require.",
      "With task or project keys, one company's data is spread across every shard and region.",
      "Data residency often decides the key as much as performance does.",
    ],
  ],
  [
    "product",
    "One noisy customer runs huge imports at lunchtime. Who feels it?",
    [
      "With company keys, only the companies on the same shard, which you can manage by moving the noisy one.",
      "With keys that spread every company, everyone feels it a bit.",
      "Per-company rate limits protect neighbours either way.",
    ],
  ],
  [
    "decision",
    "Which partition key, and why?",
    [
      "Company ID: almost every request names it, so it goes to one shard, and the biggest company (12%) fits in a shard.",
      "Created date puts every new task on the newest shard: one shard takes almost all the writes.",
      "Task ID spreads writes evenly, but opening a task list doesn't name a task, so those reads ask every shard.",
    ],
    "What happens when one company outgrows a shard?",
  ],
  [
    "decision",
    "How many shards?",
    [
      "Enough that the busiest is comfortably under capacity: four here, with the busiest at 50%.",
      "Three would run it at 67%, with p99 at 285ms against a 300ms target: it works today, with little room to grow.",
      "Many systems create far more logical shards than machines, so they can move shards between machines later without re-splitting.",
    ],
  ],
  [
    "decision",
    "How does the app know which shard holds a company?",
    [
      "A hash of the company ID decides, or a small lookup table maps each company to a shard.",
      "A lookup table lets you move one company without moving everyone; a hash needs no table.",
      "Either way the routing is in one place, so it can change without editing every query.",
    ],
  ],
  [
    "decision",
    "Each shard is a {sql-primary}. Does each need a standby?",
    [
      "Yes. A shard is the only home of its companies' data, so losing it without a standby takes them offline.",
      "Two instances in two zones per shard keeps each one available.",
      "It doubles the database cost, which is most of the budget here.",
    ],
  ],
  [
    "tradeoff",
    "What gets harder once data is sharded?",
    [
      "Queries across shards: they ask every shard and wait for the slowest.",
      "Transactions across shards need a distributed protocol, so you design to avoid them.",
      "Schema changes and backups now happen per shard.",
    ],
  ],
  [
    "tradeoff",
    "Company ID or project ID?",
    [
      "Project ID is more even: projects are small. But a company dashboard then asks several shards.",
      "Company ID keeps each customer together, which helps with joins, isolation and residency.",
      "The cost of company ID is the biggest customer: it must fit in one shard.",
    ],
  ],
  [
    "tradeoff",
    "A hashed key versus a range of keys?",
    [
      "Hashing spreads keys evenly but scatters ranges: 'the newest companies' are everywhere.",
      "Ranges keep neighbours together, which helps range queries, but new keys pile up at the end.",
      "That pile-up is exactly the created-date problem.",
    ],
  ],
  [
    "alternative",
    "Would a distributed SQL database avoid all this?",
    [
      "It shards automatically and runs transactions across shards for you.",
      "But you still choose a key, and the same hot-key and cross-shard costs apply.",
      "It trades operations work for a newer, more complex system and often higher latency per write.",
    ],
  ],
  [
    "alternative",
    "Could you keep one big primary and move reads to replicas?",
    [
      "Replicas help reads, but here the problem is writes: 6,000 a second against one primary's 3,000.",
      "Bigger hardware buys time, not a solution, and has a ceiling.",
      "Sharding is the step that raises the write ceiling.",
    ],
  ],
  [
    "scale",
    "The biggest company triples. What now?",
    [
      "Move it to a shard of its own, and others away from it.",
      "If it outgrows even that, shard its data by a second key (such as project) inside the company.",
      "Big customers often end up on dedicated shards, sometimes as a paid tier.",
    ],
  ],
  [
    "scale",
    "How do you add a fifth shard without downtime?",
    [
      "Copy chosen companies to the new shard while still writing to the old one, then switch their routing.",
      "With many small logical shards, you move whole logical shards instead of splitting.",
      "A lookup table of company to shard makes moving one company a routing change.",
    ],
  ],
  [
    "edge-case",
    "Two companies merge. What happens to their data?",
    [
      "If they're on different shards, one company's data moves to the other's shard.",
      "Until the move finishes, the app must know to read from both.",
      "Rare events like this are why a lookup table beats a fixed hash.",
    ],
  ],
  [
    "resilience",
    "One shard's primary fails. Who's affected?",
    [
      "Only the companies on that shard, and only until its standby takes over.",
      "That's a benefit of sharding: failures are partial, not total.",
      "The rest of the system must handle one shard being briefly unavailable without failing every request.",
    ],
  ],
  [
    "resilience",
    "A migration drops a column on every shard, and it was the wrong one. Now what?",
    [
      "Restore from each shard's backup to a point before the migration, then replay what you can.",
      "Roll out migrations shard by shard, starting with one, so a mistake hits a few companies, not all.",
      "Test restores regularly: with many shards, restoring is many jobs.",
    ],
  ],
  [
    "security",
    "Can one company ever see another's data?",
    [
      "Every query must include the company ID from the signed-in user's session, not from the request.",
      "Sharding by company isn't isolation by itself: shards hold many companies.",
      "Row-level checks in the database are a second line of defence.",
    ],
  ],
  [
    "security",
    "A customer asks for all their data to be deleted. How does sharding help?",
    [
      "With company keys, it's all on one shard: delete it in one place.",
      "With task or project keys, you'd hunt through every shard.",
      "Backups still hold it, so keep them short-lived or encrypted per customer.",
    ],
  ],
  [
    "observability",
    "What would you watch per shard?",
    [
      "Load, latency and storage per shard, so an uneven shard is spotted before it saturates.",
      "Traffic per company, so a growing one can be moved early.",
      "The share of queries that ask every shard.",
    ],
  ],
])

export const LIKE_STORM = deck("like-storm", [
  [
    "clarify",
    "What would you ask about how accurate a like count must be?",
    [
      "Does the count need to be exact, right now? Usually no: a few seconds stale is fine, and so is 1.2M rather than 1,203,457.",
      "Does anything depend on the count being exact, such as payouts to creators?",
      "Must a user see their own like immediately?",
    ],
    "If creators were paid per like, what would you change?",
  ],
  [
    "clarify",
    "What would you ask about how skewed the traffic is?",
    [
      "How much of the traffic can one post get? Here, four in ten likes.",
      "How quickly does a post go from quiet to hot?",
      "Can you tell in advance, such as a known celebrity posting?",
    ],
  ],
  [
    "clarify",
    "What else reads likes besides the count?",
    [
      "'Have I liked this?' for each post a user sees.",
      "'Who liked this?' lists, usually paginated.",
      "Each needs a different key, which may mean storing likes twice.",
    ],
  ],
  [
    "product",
    "Should two people looking at the same post see the same count?",
    [
      "Not necessarily: a few seconds of difference is normal and nobody notices.",
      "Rounded counts (1.2M) hide the difference anyway.",
      "The person who just liked should see their like counted, even if others don't yet.",
    ],
  ],
  [
    "product",
    "During a split, should likes be refused?",
    [
      "No: refusing a like is a visible failure for something people expect to just work.",
      "Accepting it on both sides and adding up later loses nothing.",
      "This is a clear case for availability over consistency.",
    ],
  ],
  [
    "decision",
    "Why doesn't adding shards fix the celebrity's post?",
    [
      "All likes for one post ID go to one shard, however many shards there are.",
      "40% of likes is 1,200 a second, more than one key can take, however much capacity the store has.",
      "The fix is to change the key, not the number of shards.",
    ],
    "How would you spot a hot key before it melts a shard?",
  ],
  [
    "decision",
    "How do you spread one post's likes?",
    [
      "Add a random suffix to the hot post's key, so its likes spread over several sub-keys on different shards.",
      "Reading the count then means adding up the sub-keys, so cache the total.",
      "Only hot posts need it: normal posts keep a single key.",
    ],
  ],
  [
    "decision",
    "During a split, why is it safe for both sides to accept likes?",
    [
      "Likes merge cleanly: the set of who liked a post is the union of both sides.",
      "Counting from that set gives the same answer whatever order the likes arrived in.",
      "A plain number that each side increments and overwrites would lose likes.",
    ],
  ],
  [
    "decision",
    "Where do count reads come from?",
    [
      "A {cache} holding each post's total for a few seconds.",
      "On a miss, the app sums the sub-keys and refreshes the cache.",
      "The cache takes 2,280 of the 3,000 count reads a second here.",
    ],
  ],
  [
    "tradeoff",
    "What does salting the key cost?",
    [
      "Reads must gather from every sub-key, which is slower and touches more shards.",
      "The app needs to know which posts are salted and how many ways.",
      "It's worth it only for keys that are actually hot.",
    ],
  ],
  [
    "tradeoff",
    "Keying likes by the user who liked: better or worse?",
    [
      "It spreads writes evenly, including the celebrity's likes.",
      "But a post's count then means scanning the whole table, every time it isn't cached.",
      "'Have I liked this?' becomes cheap, which is a real query too.",
    ],
  ],
  [
    "tradeoff",
    "Exact counts or approximate ones?",
    [
      "Approximate counts let you count in memory and write in batches, cutting writes a lot.",
      "Exact counts need every like recorded and summed.",
      "Many apps store every like (for 'have I liked this?') but show an approximate total.",
    ],
  ],
  [
    "alternative",
    "Could likes go through a {queue} instead of straight to the database?",
    [
      "Yes: a consumer adds them up and writes totals in batches, so the database sees far fewer writes.",
      "Counts then lag by the batch interval.",
      "The user's own like is shown immediately by the app, not read back.",
    ],
  ],
  [
    "alternative",
    "Could you keep counts in memory only?",
    [
      "It's very fast, but a restart loses counts unless the likes themselves are stored.",
      "Counts in memory, likes on disk, and a rebuild after restarts is a common split.",
      "A cache with no store behind it is fine only for data you can rebuild.",
    ],
  ],
  [
    "scale",
    "Two celebrities post at once. Does the design hold?",
    [
      "Each hot post is salted separately, so their likes spread independently.",
      "Shards hold many sub-keys, so two hot posts share the load across all of them.",
      "Watch the busiest shard: that's the number that must stay under capacity.",
    ],
  ],
  [
    "scale",
    "Likes grow tenfold over a year. What changes?",
    [
      "More shards; the salted key keeps spreading evenly as you add them.",
      "Batching writes through a queue becomes worth its complexity.",
      "Older likes can move to cheaper storage, keeping only recent ones hot.",
    ],
  ],
  [
    "edge-case",
    "Someone likes and then unlikes on different sides of a split. What's the result?",
    [
      "Store each user's latest choice with a version, not a running total.",
      "The merge keeps the latest choice per user, so the like and unlike don't both count.",
      "A plain increment and decrement would apply both and might double-count.",
    ],
  ],
  [
    "resilience",
    "The cache restarts during the storm. What happens?",
    [
      "Every count read misses and gathers from the shards at once.",
      "With two cache nodes, losing one only halves the hits.",
      "Let one request rebuild each missing count while others wait, so a miss doesn't become thousands.",
    ],
  ],
  [
    "resilience",
    "A shard's copies disagree after a long split. How do they converge?",
    [
      "Each copy sends the likes the other hasn't seen; the union is the answer.",
      "Because likes merge in any order, the result is the same whichever arrives first.",
      "Counts are then recomputed from the merged likes.",
    ],
  ],
  [
    "security",
    "How do you stop bots inflating like counts?",
    [
      "One like per signed-in account per post, enforced by storing who liked.",
      "Rate limits per account and per device.",
      "Detect and remove likes from accounts flagged as fake.",
    ],
  ],
  [
    "security",
    "Should the 'who liked this' list be public?",
    [
      "That's a privacy decision: some apps show it only to the poster.",
      "Private accounts' likes shouldn't appear to people who can't see the account.",
      "The check belongs on the server, not in the app's display logic.",
    ],
  ],
  [
    "observability",
    "What would you watch during the storm?",
    [
      "The busiest shard's load, not the average across shards.",
      "Keys with the most writes per second, to find new hot posts.",
      "Cache hit rate for counts, and how far counts lag behind the likes.",
    ],
  ],
])

export const CLAIM_YOUR_NAME = deck("claim-your-name", [
  [
    "clarify",
    "What would you ask about the usernames themselves?",
    [
      "Are they case-insensitive? Does 'Sam' block 'sam'? What about look-alike letters?",
      "Can names be changed later, and are old names freed or held?",
      "Are some names reserved, such as 'admin' or brand names?",
    ],
    "If look-alike names must be blocked, how does that change the uniqueness check?",
  ],
  [
    "clarify",
    "What would you ask about the launch?",
    [
      "How many sign-ups in the first hour? Here it's 6,000 writes a second, more than one SQL primary takes.",
      "Is there a waitlist to invite in batches?",
      "Will people rush for short, popular names at the same moment?",
    ],
  ],
  [
    "clarify",
    "Which data must be unique, and which can be eventually consistent?",
    [
      "Usernames and emails must be unique: one owner each.",
      "Profile details (bio, picture) can lag between copies.",
      "Only the unique parts need refuse-during-a-split.",
    ],
  ],
  [
    "product",
    "During a split, what does someone on the cut-off side see when they try to sign up?",
    [
      "A clear 'sign-ups are paused, try again in a minute', keeping what they typed.",
      "Checking availability can still show results, marked as unconfirmed.",
      "Never 'welcome, @sam' followed later by 'sorry, that name was taken'.",
    ],
  ],
  [
    "product",
    "Should a name be held while someone finishes signing up?",
    [
      "A short hold (a few minutes) stops someone else taking it mid-form.",
      "The hold must be in the same consistent store as the name itself.",
      "Expire holds, or abandoned sign-ups lock names forever.",
    ],
  ],
  [
    "decision",
    "During a split, should the name shard refuse or accept sign-ups?",
    [
      "Refuse unless it holds a majority of its copies. If both sides accept, two people can get the same name.",
      "That's consistency over availability, chosen for this data only.",
      "Undoing a duplicate means taking a name away from someone, which is far worse than a short pause.",
    ],
    "Is there any part of sign-up you'd let keep working during the split?",
  ],
  [
    "decision",
    "Which partition key, and why?",
    [
      "Username: a sign-up names it, so each check and claim goes to exactly one shard.",
      "Sign-up time sends everyone signing up right now to the newest shard.",
      "Email domain puts most people on one big mail provider's shard.",
    ],
  ],
  [
    "decision",
    "How many copies per shard?",
    [
      "Three in three zones: a split still leaves a majority on one side, so sign-ups carry on there.",
      "Two copies cost less but leave neither side with a majority, so every sign-up is refused during a split.",
      "Each shard decides on its own, so a split refuses only the cut-off side of each shard.",
    ],
  ],
  [
    "decision",
    "People also log in by email. How do you find their account?",
    [
      "Keep a second table keyed by email that points to the username.",
      "Writing both in one step needs care: if the shards differ, claim the email first, then the name.",
      "Without it, login by email asks every shard.",
    ],
  ],
  [
    "tradeoff",
    "What does refusing during a split cost on launch day?",
    [
      "A third of people (the cut-off zone) can't sign up until it heals.",
      "Every sign-up waits for a second zone to confirm, split or not.",
      "Both are small next to two people owning one name.",
    ],
  ],
  [
    "tradeoff",
    "A hashed username key versus alphabetical ranges?",
    [
      "Ranges let you list names in order, but popular prefixes pile up on one shard.",
      "Hashing spreads them evenly, but you can't scan names in order without asking every shard.",
      "Sign-up checks name one exact username, so hashing suits them.",
    ],
  ],
  [
    "tradeoff",
    "Should the availability check as you type be consistent too?",
    [
      "No: it's a hint. Serve it from a cache or a nearby copy.",
      "The claim on submit is the consistent step.",
      "Making every keystroke consistent would cost latency for no gain.",
    ],
  ],
  [
    "alternative",
    "Could both sides accept names and resolve duplicates afterwards?",
    [
      "Yes, by keeping the earliest claim and renaming the other person.",
      "It keeps sign-ups always open, at the cost of occasionally taking a name away.",
      "Some systems with rare conflicts do exactly this; for a launch rush, duplicates would be common.",
    ],
  ],
  [
    "alternative",
    "Could a {cache} reserve names faster than the database?",
    [
      "It's fast, but a cache can lose a reservation in a restart, and two cache nodes can disagree.",
      "The claim belongs in the system of record.",
      "A cache is fine for showing 'probably available'.",
    ],
  ],
  [
    "scale",
    "Sign-ups double on day two. What changes?",
    [
      "Add shards; username hashing keeps spreading evenly.",
      "Moving names between shards needs care: each name must be claimable in only one place during the move.",
      "Starting with more logical shards than machines makes this easier.",
    ],
  ],
  [
    "scale",
    "Should the name shards span continents?",
    [
      "A consistent claim across continents waits for a round trip across an ocean.",
      "Alternatively, keep the name registry in one region and accept the latency once per sign-up.",
      "Sign-up is rare per user, so a slower claim is often acceptable.",
    ],
  ],
  [
    "edge-case",
    "Two people submit the same name in the same millisecond. Who wins?",
    [
      "Both requests go to the same shard; it commits one insert and rejects the other as a duplicate.",
      "A unique constraint on the shard makes this the database's job, not the app's.",
      "The loser gets a clear 'just taken' and suggestions.",
    ],
  ],
  [
    "resilience",
    "A zone fails during the launch. Does sign-up stop?",
    [
      "No: each shard's other two copies are a majority, so sign-ups continue.",
      "Restore the third copy quickly; until then, one more failure would stop that shard.",
      "Watch for sign-up retries piling up from people who saw an error.",
    ],
  ],
  [
    "resilience",
    "A bug lets duplicate names through for an hour. How do you clean up?",
    [
      "Find the duplicates, keep the earliest claim, and contact the others with a free rename.",
      "Add the missing unique constraint so the database rejects duplicates itself.",
      "Point-in-time recovery helps only if you can replay the good sign-ups since.",
    ],
  ],
  [
    "security",
    "How do you stop bots grabbing every good name?",
    [
      "Rate limits per IP and per device, and a CAPTCHA when sign-ups look automated.",
      "Require a verified email or phone before a name is final.",
      "Reclaim names from accounts that are never activated.",
    ],
  ],
  [
    "security",
    "Can someone impersonate a brand or a person with a look-alike name?",
    [
      "Normalise names (case, accents, look-alike letters) before checking uniqueness.",
      "Reserve well-known names and verify claims to them.",
      "Make reporting impersonation easy.",
    ],
  ],
  [
    "observability",
    "What would you watch on launch day?",
    [
      "Sign-ups per second, and the share refused by each shard for want of a majority.",
      "The busiest shard's load, to catch an uneven key early.",
      "Duplicate-name errors: a sudden rise means a race the design didn't expect.",
    ],
  ],
])
