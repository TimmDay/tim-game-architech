import { deck } from "./build"

/**
 * Decks for the interview classics. Each follows the same shape (clarify,
 * product, decisions, trade-offs, alternatives, scale, edge cases, security,
 * observability), so quiz questions can cite cards by position.
 */

export const SHORT_LINKS = deck("short-links", [
  [
    "clarify",
    "What would you ask about the links themselves?",
    [
      "How short must the code be? Seven base-62 characters give about 3.5 trillion codes.",
      "Can users choose a custom alias? Then codes need a uniqueness check.",
      "Do links expire, and can they be edited or deleted after they're shared?",
    ],
    "If a user asks for the same long URL twice, should they get the same short code?",
  ],
  [
    "clarify",
    "What would you ask about traffic?",
    [
      "How many new links a day, and how many clicks? The ratio sets the design: here it's about fifty clicks per link.",
      "How skewed are clicks? A few viral links take most of them, which is what makes caching work.",
      "Is there a peak, such as a campaign that's sent to millions of inboxes at once?",
    ],
  ],
  [
    "clarify",
    "What would you ask about analytics?",
    [
      "Do customers need click counts? Per link, per country, per referrer, in real time or daily?",
      "That decides between a 301 redirect (cacheable, uncounted) and a 302 (counted every time).",
      "How long is click history kept, and who can see it?",
    ],
  ],
  [
    "clarify",
    "What would you ask about how long links must keep working?",
    [
      "Printed links on packaging can be clicked for years: losing the mapping breaks them for good.",
      "That makes durability non-negotiable, and availability of redirects the top priority.",
      "What's acceptable while a redirect fails: an error page, or a fallback?",
    ],
  ],
  [
    "product",
    "What would a business customer pay for on top of free short links?",
    [
      "Their own branded domain for links.",
      "Click analytics and campaign tracking.",
      "Editable destinations, so a printed code can be repointed later.",
    ],
  ],
  [
    "product",
    "A link turns out to point to a phishing page. What happens?",
    [
      "Check destinations against known-bad lists when a link is created and again later.",
      "A disabled link shows a warning page instead of redirecting.",
      "Clear the cached entry the moment it's disabled, or the cache keeps redirecting.",
    ],
  ],
  [
    "decision",
    "How do you generate the short code?",
    [
      "Hash the long URL and take seven characters: same URL, same code, but collisions must be checked.",
      "Encode a counter in base 62: unique with no check, but sequential and guessable.",
      "Give each server a range of counter values in advance, so no request waits on a shared counter.",
    ],
    "How would you stop people walking the counter to discover private links?",
  ],
  [
    "decision",
    "Why put a cache in front of the database?",
    [
      "Clicks outnumber creates fifty to one, and a few links take most of the clicks.",
      "The cache answers 3,352 of 3,920 clicks a second here, leaving the database 568.",
      "Links rarely change, so cached copies can live a long time.",
    ],
  ],
  [
    "decision",
    "Why does the cache need two nodes when the database has room to spare?",
    [
      "The database is at 28% because the cache is there. Without it, it would face all 3,920 clicks: 196% of capacity.",
      "So the cache is no longer optional: losing it takes the site down.",
      "A second node in another zone costs $25. Replicas big enough to survive without any cache cost $240.",
    ],
  ],
  [
    "decision",
    "301 or 302?",
    [
      "301 (permanent): browsers and proxies may cache it, so repeat clicks never reach you.",
      "302 (temporary): every click comes back, so every click can be counted.",
      "If analytics is part of the product, choose 302 and handle the load.",
    ],
  ],
  [
    "tradeoff",
    "Relational database or key-value store for the mapping?",
    [
      "The access pattern is a pure key lookup, which a key-value store does very well and scales easily.",
      "At this size a relational database copes, and it's simpler for things like per-customer listings.",
      "Either way, the cache does most of the work.",
    ],
  ],
  [
    "tradeoff",
    "How long should cache entries live?",
    [
      "Long expiries mean more hits and a calmer database.",
      "But an edited or disabled link keeps redirecting until its entry expires, unless you delete it explicitly.",
      "Do both: a long expiry, plus deletion on every edit.",
    ],
  ],
  [
    "tradeoff",
    "Count clicks synchronously or asynchronously?",
    [
      "Writing a counter row on every redirect puts a write on the hottest path.",
      "Publishing a click event and counting it later keeps redirects fast.",
      "The cost is that counts lag by seconds or minutes, which customers usually accept.",
    ],
  ],
  [
    "alternative",
    "Could the CDN do the redirects?",
    [
      "Yes: edge redirects are the fastest possible, and very cheap.",
      "But each one served at the edge is a click you don't see, unless the edge logs and ships them.",
      "Good for links that don't need analytics, such as your own marketing.",
    ],
  ],
  [
    "alternative",
    "Could you avoid storing anything, by encoding the URL into the code?",
    [
      "Compression can't make arbitrary URLs short: long URLs give long codes.",
      "And you lose the ability to edit, disable or count the link.",
      "Storage is cheap; the mapping is the product.",
    ],
  ],
  [
    "scale",
    "Clicks grow ten times. What changes?",
    [
      "More app servers, which are stateless and easy to add.",
      "More cache nodes, so losing one is a smaller share.",
      "The database still sees mostly misses, so it may need replicas or partitioning by short code before anything else.",
    ],
  ],
  [
    "scale",
    "How much storage do you need for ten years?",
    [
      "Estimate: 100 million new links a month × 120 months × roughly 500 bytes ≈ 6 terabytes.",
      "Large for one machine's cache, small for a database: cache only the hot links.",
      "Partition by short code when one database can't hold it all.",
    ],
  ],
  [
    "edge-case",
    "One link is clicked a million times in a minute. What breaks?",
    [
      "That key lives on one cache node, which may become the hot spot.",
      "If its entry expires mid-surge, thousands of requests miss at once and hit the database together: a stampede.",
      "Let one request refresh the entry while the others keep using the old value.",
    ],
  ],
  [
    "edge-case",
    "Someone asks for a custom alias that's already taken, at the same moment as someone else.",
    [
      "A uniqueness constraint in the database decides the winner.",
      "The loser gets a clear 'taken' message and suggestions.",
      "Generated codes and custom aliases must share one namespace, or a generated code can collide with an alias.",
    ],
  ],
  [
    "security",
    "How do you stop spammers using your shortener to hide malicious links?",
    [
      "Rate limit link creation per account and per IP address.",
      "Scan destinations at creation and periodically afterwards.",
      "Show an interstitial warning for links from new or untrusted accounts.",
    ],
  ],
  [
    "security",
    "Can someone discover private links by guessing codes?",
    [
      "With sequential codes, yes: try the next number.",
      "Random codes in a huge space make guessing impractical; rate limiting failed lookups makes it slower still.",
      "Truly private links need more than an unguessable code: require sign-in.",
    ],
  ],
  [
    "observability",
    "What would you put on the dashboard?",
    [
      "Redirect p99 and error rate: the user-facing promise.",
      "Cache hit rate, and database load if a cache node is lost.",
      "Clicks on disabled links, and creations per account, which reveal abuse.",
    ],
  ],
])

export const GROUP_CHAT = deck("group-chat", [
  [
    "clarify",
    "What would you ask about the kinds of chat?",
    [
      "One-to-one only, or groups? How big can a group get: 10, 1,000, 100,000?",
      "Text only, or photos, video and voice notes too?",
      "Does it need to work on several devices per user at once?",
    ],
    "How does a 1,000-person group change your fan-out?",
  ],
  [
    "clarify",
    "What does 'delivered' have to mean?",
    [
      "Stored on the server (one tick), delivered to the device (two ticks), read (blue ticks)?",
      "Is losing a message ever acceptable? Usually not.",
      "Must messages appear in the same order for everyone in a group?",
    ],
  ],
  [
    "clarify",
    "What would you ask about history and storage?",
    [
      "Are messages kept on the server forever, or only until delivered?",
      "Is it end-to-end encrypted? Then the server stores what it can't read.",
      "Can a new device fetch old history?",
    ],
  ],
  [
    "clarify",
    "What's the traffic shape?",
    [
      "How many messages a day, and how many users online at once?",
      "Peaks are real: New Year's Eve has set daily records.",
      "What's the read/write split? Here half of all requests are sends.",
    ],
  ],
  [
    "product",
    "What does the sender need to see, and when?",
    [
      "The message appears instantly in their own chat, marked as sending.",
      "One tick once the server has stored it, two once it reaches a device.",
      "A clear failure state with a retry if it couldn't be sent.",
    ],
  ],
  [
    "product",
    "Should you show 'online' and 'typing…'?",
    [
      "Users like them, but they're very chatty: every keystroke and every app open is an event.",
      "They're ephemeral: losing one costs nothing, so keep them in memory and never store them.",
      "Privacy settings must be able to turn them off.",
    ],
  ],
  [
    "decision",
    "Why not a relational database for messages?",
    [
      "2,000 messages a second is four times what one {sql-primary} can write.",
      "More instances are standbys: they add availability, not write capacity.",
      "A partitioned store adds write capacity with each partition.",
    ],
  ],
  [
    "decision",
    "What's the partition key, and the sort key?",
    [
      "Partition by conversation ID, so a chat's messages live together.",
      "Sort by time (or a per-conversation sequence number) so history is one range read.",
      "Partitioning by user would scatter a conversation across machines.",
    ],
  ],
  [
    "decision",
    "How do messages reach a phone that's online?",
    [
      "The phone keeps a long-lived connection open to one app server.",
      "A message-sent event tells whichever server holds the recipient's connection.",
      "That server pushes it down the open connection, with no polling.",
    ],
    "How does the sender's server know which server holds the recipient?",
  ],
  [
    "decision",
    "Why an event stream between sending and delivering?",
    [
      "The connection servers and the push senders both need every message.",
      "A {queue} gives each message to one consumer only; a stream gives it to every consumer group.",
      "And delivery can retry without the sender waiting.",
    ],
  ],
  [
    "tradeoff",
    "At-least-once or at-most-once delivery?",
    [
      "At-most-once is simpler, but loses messages when a connection drops mid-send.",
      "At-least-once retries until acknowledged, so a message can arrive twice.",
      "Give every message a client-generated ID and drop duplicates on the device.",
    ],
  ],
  [
    "tradeoff",
    "Order: per conversation or global?",
    [
      "Global order across all chats is expensive and nobody needs it.",
      "Per-conversation order is what users see, and partitioning by conversation gives it cheaply.",
      "In groups, two people can send at the same instant: the server's sequence number decides.",
    ],
  ],
  [
    "tradeoff",
    "End-to-end encryption: what does it cost the design?",
    [
      "The server can't read messages: no server-side search, spam filtering or previews.",
      "Each recipient device needs its own encrypted copy, so groups and multiple devices multiply the writes.",
      "Key management (new phones, lost phones) becomes a product problem.",
    ],
  ],
  [
    "alternative",
    "Could phones just poll for new messages?",
    [
      "Polling every few seconds is simple and works through any network.",
      "But it's slower to deliver and multiplies requests, most of which return nothing.",
      "Long-lived connections are the norm; polling is a fallback.",
    ],
  ],
  [
    "alternative",
    "Could you delete messages from the server once delivered?",
    [
      "That's how some apps work: the server is a mailbox, not an archive.",
      "Storage drops a lot, and there's less to protect.",
      "But new devices can't fetch history, so backup moves to the user.",
    ],
  ],
  [
    "scale",
    "Ten times more messages. What changes?",
    [
      "More partitions in the store, and more connection servers: both scale out.",
      "The stream's partitions must grow too, or it becomes the ceiling.",
      "Watch for hot partitions: big groups concentrate writes.",
    ],
  ],
  [
    "scale",
    "How many open connections can you hold?",
    [
      "Each connection is mostly idle memory, so a server can hold many thousands.",
      "Millions of users online means hundreds of connection servers.",
      "Losing one disconnects all its users at once: they must reconnect smoothly, with jitter, not all in the same second.",
    ],
  ],
  [
    "edge-case",
    "A zone goes dark. What do users notice?",
    [
      "Phones connected to servers in that zone drop and reconnect elsewhere.",
      "The survivors need room for them: here twelve servers take the load of eighteen at 83%.",
      "Messages already stored aren't lost; any in flight are retried by the sender.",
    ],
  ],
  [
    "edge-case",
    "A message is sent while the recipient's phone is off for a week.",
    [
      "It waits in storage, marked undelivered.",
      "A push notification wakes the phone or tells the user.",
      "When the phone reconnects, it asks for everything after the last message it has.",
    ],
  ],
  [
    "security",
    "How do you stop spam in a system where you can't read messages?",
    [
      "Use signals you can see: account age, sending rate, how many strangers they message, reports.",
      "Rate limit new accounts and messages to people who don't have you as a contact.",
      "Let users report a message, which shares it with you voluntarily.",
    ],
  ],
  [
    "security",
    "What does an attacker gain from compromising one connection server?",
    [
      "With end-to-end encryption, only ciphertext and metadata (who talks to whom, when).",
      "Without it, every message passing through.",
      "Metadata is sensitive too: keep as little of it as you can, for as short a time as you can.",
    ],
  ],
  [
    "observability",
    "What would you measure?",
    [
      "Time from send to delivered, at p50 and p99: the number users feel.",
      "Undelivered messages older than a minute, which point to a broken path.",
      "Reconnect rate by server and zone, which spots a failing machine early.",
    ],
  ],
])

export const HOME_TIMELINE = deck("home-timeline", [
  [
    "clarify",
    "What would you ask about the timeline itself?",
    [
      "Reverse chronological, or ranked by a model?",
      "Only people you follow, or recommendations too?",
      "How far back can someone scroll?",
    ],
    "How does ranking change what you can precompute?",
  ],
  [
    "clarify",
    "What would you ask about the follow graph?",
    [
      "What's the average number of followers, and the largest? One account with 100 million followers changes everything.",
      "Can people follow without being followed back?",
      "How often do follows change?",
    ],
  ],
  [
    "clarify",
    "What's the ratio of reads to posts?",
    [
      "Twitter's engineers described 300,000 timeline reads a second against about 6,000 writes.",
      "That ratio is what justifies doing work at write time.",
      "Ask about peaks: big live events multiply posts and reads at the same moment.",
    ],
  ],
  [
    "clarify",
    "How fresh must a timeline be?",
    [
      "Should a post appear for followers within a second, or are a few seconds fine?",
      "Does the author see their own post at once? They must.",
      "Freshness decides how much fan-out delay you can tolerate.",
    ],
  ],
  [
    "product",
    "Someone posts and refreshes. Their post isn't there. What went wrong?",
    [
      "Fan-out is asynchronous, so the author's timeline may not have it yet.",
      "Always add the author's own post to their timeline immediately, on the request path.",
      "Read-your-own-writes matters more to users than global consistency.",
    ],
  ],
  [
    "product",
    "What should a brand-new user see before they follow anyone?",
    [
      "An empty timeline is a lost user.",
      "Popular posts, topics they picked at sign-up, or accounts their contacts follow.",
      "That timeline isn't precomputed per user: it's a shared one, which caches well.",
    ],
  ],
  [
    "decision",
    "Fan-out on write or fan-out on read?",
    [
      "On read: every timeline load queries everyone you follow and merges. Cheap posts, expensive reads.",
      "On write: each post is copied into every follower's timeline. Expensive posts, cheap reads.",
      "With 32 reads per post here, precomputing wins.",
    ],
  ],
  [
    "decision",
    "Why does fan-out happen in workers, not in the request?",
    [
      "A post with thousands of followers means thousands of timeline writes.",
      "Done inline, the app tier runs at 98% and p99 reaches 3.4 seconds.",
      "Workers do it off the critical path; the author's request returns at once.",
    ],
  ],
  [
    "decision",
    "What does a stored timeline contain?",
    [
      "Post IDs, newest first, not copies of the posts.",
      "Capped at the latest few hundred, since few people scroll further.",
      "Loading a page fetches the posts by ID, which caches well because popular posts are shared.",
    ],
  ],
  [
    "decision",
    "Why keep timelines in a cache?",
    [
      "Active users open the app many times a day; their timeline should be in memory.",
      "The cache answers 4,147 of 4,850 loads a second here.",
      "Inactive users' timelines can be rebuilt from storage when they return.",
    ],
  ],
  [
    "tradeoff",
    "What does fan-out on write cost?",
    [
      "Storage: one entry per follower per post.",
      "Wasted work: writing to timelines of people who never open the app.",
      "Delay: a post takes seconds to reach every follower.",
    ],
  ],
  [
    "tradeoff",
    "Chronological or ranked?",
    [
      "Chronological is easy to precompute and easy to explain.",
      "Ranked keeps people engaged, but ranking at read time costs compute on every load.",
      "Common compromise: precompute candidates, rank a few hundred at read time.",
    ],
  ],
  [
    "tradeoff",
    "What happens when someone unfollows or deletes a post?",
    [
      "With fan-out on write, the post is already in thousands of timelines.",
      "Removing it everywhere is another fan-out, so filter at read time instead: skip deleted posts and unfollowed authors.",
      "Clean up stored timelines lazily.",
    ],
  ],
  [
    "alternative",
    "What's the hybrid approach, and when does it apply?",
    [
      "Fan out on write for normal accounts; pull celebrity posts at read time.",
      "A post from an account with 50 million followers would otherwise be 50 million writes.",
      "The read merges your precomputed timeline with recent posts from the few celebrities you follow.",
    ],
  ],
  [
    "alternative",
    "Is pure fan-out on read ever right?",
    [
      "Yes, for small apps, or where reads and posts are similar in number.",
      "It's simpler: no fan-out pipeline, no stored timelines.",
      "Here it overloads the store: 97% busy, p99 528ms, and 30% of requests fail on the spike.",
    ],
  ],
  [
    "scale",
    "A huge live event: posts and reads both spike. What breaks first?",
    [
      "Fan-out falls behind first; posts land late but nothing fails.",
      "The app tier is next: here it reaches 94% on the spike.",
      "Shed load gracefully: show a slightly older timeline rather than an error.",
    ],
  ],
  [
    "scale",
    "How much storage do precomputed timelines need?",
    [
      "Users × timeline length × bytes per entry: 100 million × 800 × 8 bytes ≈ 640 GB.",
      "Fits in a partitioned cache, especially if only active users are kept.",
      "Inactive users' timelines are rebuilt on demand.",
    ],
  ],
  [
    "edge-case",
    "A celebrity with 50 million followers posts. Walk through what happens.",
    [
      "With pure fan-out on write: 50 million timeline writes, taking minutes.",
      "With the hybrid: no fan-out, and followers pull the post when they load their timeline.",
      "The celebrity's recent posts become very hot keys: cache them in many places.",
    ],
  ],
  [
    "edge-case",
    "Someone follows a new account. When do its posts appear?",
    [
      "Future posts will fan out to them.",
      "Older posts aren't in their timeline: backfill the latest few as part of the follow.",
      "Or merge them in at read time until the timeline catches up.",
    ],
  ],
  [
    "security",
    "A private account's post must only reach approved followers. Where's that enforced?",
    [
      "At fan-out: only write to approved followers' timelines.",
      "And at read time: re-check visibility, because approvals and blocks change.",
      "Never trust a stored timeline alone for access control.",
    ],
  ],
  [
    "security",
    "How do bots abuse a timeline system, and how do you limit it?",
    [
      "Fake accounts following millions of people, multiplying fan-out work.",
      "Posting floods that fan out to everyone who followed the bot.",
      "Rate limit follows and posts per account, and skip fan-out for suspicious accounts.",
    ],
  ],
  [
    "observability",
    "What would you measure?",
    [
      "Fan-out lag: time from post to its appearance in a follower's timeline.",
      "Timeline load p99, and cache hit rate.",
      "Fan-out queue depth during big events, so you see it falling behind before users do.",
    ],
  ],
])

export const TICKET_DROP = deck("ticket-drop", [
  [
    "clarify",
    "What would you ask about the inventory?",
    [
      "Assigned seats, or general admission? Named seats are far more contended.",
      "How many tickets per buyer?",
      "Is there a presale, and how are buyers verified?",
    ],
    "How does general admission change your design?",
  ],
  [
    "clarify",
    "What would you ask about demand?",
    [
      "How many people for how many seats? Millions for tens of thousands is normal for a big tour.",
      "Does everyone arrive in the first minute? Yes: the on-sale is a cliff, not a curve.",
      "How much of it is bots? For the 2022 Eras Tour presale, Ticketmaster blamed bots and fans without codes for traffic four times its previous peak.",
    ],
  ],
  [
    "clarify",
    "What's worse: an error, a wait, or a double-sold seat?",
    [
      "A double-sold seat is the one outcome you can never allow.",
      "An error loses trust and makes people refresh, adding load.",
      "A wait in a fair, visible line is the least bad.",
    ],
  ],
  [
    "clarify",
    "How long does a buyer have to pay?",
    [
      "Holds decide how long a seat is unavailable to others.",
      "Too long and abandoned carts block seats; too short and people lose seats while typing card numbers.",
      "Ask what happens if payment fails after the hold.",
    ],
  ],
  [
    "product",
    "What should a fan in the waiting room see?",
    [
      "Their place in line and an estimated wait.",
      "A promise that refreshing won't lose their place.",
      "A warning when tickets are running out, so they're not waiting for nothing.",
    ],
  ],
  [
    "product",
    "How do you make the sale feel fair?",
    [
      "Randomise the line for everyone who arrived before the on-sale time, so being a few milliseconds faster doesn't matter.",
      "Verified presales to filter bots before the day.",
      "Per-buyer ticket limits, enforced at checkout.",
    ],
  ],
  [
    "decision",
    "Why do seat holds go to one SQL primary?",
    [
      "No seat may be sold twice, which needs one place that decides.",
      "A conditional update (hold this seat only if it's free) in a transaction is exactly that.",
      "Caches and replicas can be stale, so they can't decide.",
    ],
  ],
  [
    "decision",
    "Why a waiting room in front of the database?",
    [
      "The on-sale minute brings 1,200 holds a second; the {sql-primary} takes 500.",
      "Sent straight there, 58% fail, and failing fans retry, making it worse.",
      "In a line, everyone is served in turn at the rate the database can take.",
    ],
  ],
  [
    "decision",
    "How fast should the waiting room admit people?",
    [
      "At the rate the system of record can take: here 500 a second, from ten workers at 50 each.",
      "Admitting faster just moves the failure downstream.",
      "Measure it and adjust it on the day, rather than guessing.",
    ],
  ],
  [
    "decision",
    "How can the seat map show availability without hitting the database?",
    [
      "Cache it at the {cdn} for a second or two: most refreshes never reach you.",
      "Misses read from {sql-replica} instances, which can lag slightly.",
      "A slightly stale map is fine because the hold checks the primary.",
    ],
  ],
  [
    "tradeoff",
    "What does a stale seat map cost?",
    [
      "A fan picks a seat that someone took a second ago.",
      "Their hold fails, and they pick again.",
      "Annoying but safe, and far cheaper than serving the map from the primary.",
    ],
  ],
  [
    "tradeoff",
    "Let fans choose seats, or assign the best available?",
    [
      "Choosing is what fans want, but everyone wants the same seats, so holds fail constantly.",
      "Best available spreads demand and makes each hold succeed.",
      "Many sites offer both: best available by default, a map for those who want it.",
    ],
  ],
  [
    "tradeoff",
    "Pessimistic locks or optimistic checks for holds?",
    [
      "Locking a seat row while a buyer decides blocks everyone else from it.",
      "Optimistic: update only if the seat is still free; if not, the fan picks again.",
      "Under heavy contention optimistic retries pile up, which is another reason to admit people gradually.",
    ],
  ],
  [
    "alternative",
    "Could you keep seat holds in an in-memory store?",
    [
      "Much faster, and it would take the load easily.",
      "But it must never lose a hold or disagree with the database, which is hard to guarantee.",
      "Some systems do this with great care; the safe default is the system of record.",
    ],
  ],
  [
    "alternative",
    "Could you avoid the rush entirely?",
    [
      "A lottery: register over a week, then winners get a time to buy.",
      "Staggered on-sales by region or by presale group.",
      "Both turn a cliff into a curve, at the cost of the excitement of the drop.",
    ],
  ],
  [
    "scale",
    "Demand is ten times what you planned for. What happens?",
    [
      "The line grows ten times longer, but nothing fails.",
      "The edge and the app tier must still accept everyone into the line: those need headroom.",
      "Tell people early when demand far exceeds seats, so they can stop waiting.",
    ],
  ],
  [
    "scale",
    "Several big on-sales at once. Do they compete?",
    [
      "They share the same database and workers unless you separate them.",
      "Partition inventory by event, so one tour doesn't slow another.",
      "Give each on-sale its own line with its own admission rate.",
    ],
  ],
  [
    "edge-case",
    "A fan holds a seat, then their payment fails.",
    [
      "The hold expires after a few minutes and the seat returns to the pool.",
      "Released seats go to people still in line, not to whoever refreshes fastest.",
      "Retrying payment shouldn't create a second order: use an idempotency key.",
    ],
  ],
  [
    "edge-case",
    "A fan opens five tabs to get five places in line.",
    [
      "Tie the place in line to the account, not the tab.",
      "Then extra tabs share one place.",
      "Unverified buyers can be queued behind verified ones.",
    ],
  ],
  [
    "security",
    "How do you keep bots out?",
    [
      "Verified presales, where fans register days ahead.",
      "CAPTCHA or proof-of-work at the waiting room entrance, not at checkout when it's too late.",
      "Rate limits per account, card and device; cancel orders from flagged accounts.",
    ],
  ],
  [
    "security",
    "What stops someone skipping the line by calling the hold API directly?",
    [
      "The waiting room issues a signed, expiring token when it's your turn.",
      "The hold API rejects any request without a valid token.",
      "Each token is single-use, so it can't be shared.",
    ],
  ],
  [
    "observability",
    "What would you watch during the on-sale?",
    [
      "Line length and admission rate: how long until everyone is served?",
      "Hold success rate: if most fail, people are fighting over the same seats.",
      "Seats left, so you can close the line honestly before it's empty.",
    ],
  ],
])

export const VIDEO_NIGHT = deck("video-night", [
  [
    "clarify",
    "What would you ask about uploads?",
    [
      "How many hours uploaded per minute? YouTube has said more than 500.",
      "How large can a file be, and how long a video?",
      "How soon after upload must it be watchable?",
    ],
    "What could you do to make a new upload watchable sooner?",
  ],
  [
    "clarify",
    "What would you ask about viewers?",
    [
      "Phones on mobile data, TVs on fibre, or both? That decides which resolutions to produce.",
      "Where are they? Global viewers need a global edge.",
      "How skewed is viewing? Most watching is of a small share of videos.",
    ],
  ],
  [
    "clarify",
    "Is it on-demand, live, or both?",
    [
      "On-demand can be transcoded at leisure and cached for days.",
      "Live must be transcoded in seconds, and every viewer wants the same newest segment at once.",
      "Ask which, because they're quite different systems.",
    ],
  ],
  [
    "clarify",
    "What does the business need from viewing?",
    [
      "View counts, watch time, ads, recommendations?",
      "Rights restrictions by country?",
      "Each of those adds events to collect and rules to enforce at the edge.",
    ],
  ],
  [
    "product",
    "What should a creator see after uploading?",
    [
      "Upload progress, then 'processing' with an estimate.",
      "A lower resolution available first, higher ones as they finish.",
      "A clear notice if processing fails, with the reason.",
    ],
  ],
  [
    "product",
    "What makes playback feel good?",
    [
      "Starting fast: the first segment at a low bitrate, then stepping up.",
      "Never stalling: dropping quality briefly beats buffering.",
      "Seeking works instantly, because segments are small and independently fetchable.",
    ],
  ],
  [
    "decision",
    "Why cut videos into segments?",
    [
      "The player can switch quality between segments as bandwidth changes.",
      "Each segment is a small file that a {cdn} caches like any image.",
      "Seeking means fetching a different segment, not reading through a huge file.",
    ],
  ],
  [
    "decision",
    "Why does transcoding go through a queue?",
    [
      "It takes minutes per video, far too long for a request.",
      "Uploads are bursty; a queue lets workers keep a steady pace.",
      "A failed transcode can be retried without the creator re-uploading.",
    ],
  ],
  [
    "decision",
    "Why is the CDN essential here?",
    [
      "19,900 segment requests a second, and most are for popular videos.",
      "The edge serves 17,960 of them; only 1,940 reach the origin.",
      "Without it, even twenty app servers are swamped and the object store hits 398%.",
    ],
  ],
  [
    "decision",
    "Where do videos and segments live?",
    [
      "In an {object-store}: durable, practically unlimited and cheap per gigabyte.",
      "Metadata (titles, owners, renditions) lives in a database.",
      "The {cdn} pulls segments from the object store on a miss.",
    ],
  ],
  [
    "tradeoff",
    "Transcode every resolution, or only some?",
    [
      "All of them up front: every viewer gets every option, but most videos are barely watched.",
      "Common ones first, rare ones on demand: much less compute, slightly slower for the first viewer of a rare one.",
      "Popular videos can be re-encoded later with better, slower settings.",
    ],
  ],
  [
    "tradeoff",
    "Short segments or long?",
    [
      "Short (2 seconds): fast quality switches and fast starts, but more requests and files.",
      "Long (10 seconds): fewer requests, but slower to adapt and to start.",
      "Live streaming leans short for low delay; on-demand can go longer.",
    ],
  ],
  [
    "tradeoff",
    "How long should the CDN keep segments?",
    [
      "Segments never change once written, so they can be cached for a long time.",
      "The limit is edge storage: rarely watched videos get evicted.",
      "The playlist can change (a new rendition finished), so it gets a short expiry.",
    ],
  ],
  [
    "alternative",
    "Could uploads skip the app servers?",
    [
      "Yes: the app hands out a signed upload URL and the client sends the file straight to the {object-store}.",
      "Big files never touch your servers.",
      "A storage event then triggers the transcode job.",
    ],
  ],
  [
    "alternative",
    "Build it, or use a video platform?",
    [
      "A managed video service handles transcoding, packaging and delivery for a fee per minute.",
      "Below a certain scale that's cheaper than engineers.",
      "At very large scale, owning the pipeline and the edge pays off.",
    ],
  ],
  [
    "scale",
    "A premiere doubles traffic in one minute. What strains?",
    [
      "The {cdn} absorbs most of it if the segments are already at the edge.",
      "Warm the edge by pre-fetching the first segments before the premiere starts.",
      "The origin and app tier see the misses: here they reach 85%.",
    ],
  ],
  [
    "scale",
    "How much storage does 500 hours a minute need?",
    [
      "500 hours × 60 minutes × 24 hours ≈ 720,000 hours of new video a day.",
      "At roughly 1 GB per hour per rendition, with five renditions: about 3.6 petabytes a day.",
      "Storage cost, not compute, dominates: move old, rarely watched video to colder storage tiers.",
    ],
  ],
  [
    "edge-case",
    "A transcode worker crashes halfway through a video.",
    [
      "The queue makes the job visible again after a timeout, and another worker retries it.",
      "Make each job idempotent: writing the same segments twice must be harmless.",
      "After a few failures, move it to a dead-letter queue and tell the creator.",
    ],
  ],
  [
    "edge-case",
    "A video goes viral an hour after upload, before the edge has it.",
    [
      "Thousands of edge locations miss at once and all ask the origin for the same segments.",
      "A shield layer (one mid-tier cache in front of the origin) collapses those into one fetch.",
      "Otherwise the origin sees a stampede for one file.",
    ],
  ],
  [
    "security",
    "How do you stop people hotlinking or downloading paid videos?",
    [
      "Signed, expiring segment URLs, so a copied link stops working.",
      "DRM for premium content, at the cost of compatibility.",
      "Accept that anything a screen can show can be recorded: protection raises the effort, nothing more.",
    ],
  ],
  [
    "security",
    "What must happen before an upload is published?",
    [
      "Scan for malware in the file itself, since it's processed by your workers.",
      "Check for known illegal content and copyright matches.",
      "Run transcoders in isolated sandboxes: malformed video files are a classic attack.",
    ],
  ],
  [
    "observability",
    "What would you measure?",
    [
      "Time to first frame and rebuffering rate: what viewers feel.",
      "Edge hit rate, and origin load.",
      "Transcode queue depth and time from upload to watchable.",
    ],
  ],
])

export const RIDE_HAILING = deck("ride-hailing", [
  [
    "clarify",
    "What would you ask about location updates?",
    [
      "How often do drivers report location? Every few seconds is typical.",
      "How many drivers are online at peak?",
      "Is location history needed, and for what: pricing, ETAs, disputes?",
    ],
    "What would halving the update rate cost the product?",
  ],
  [
    "clarify",
    "What would you ask about matching?",
    [
      "Nearest driver, or best ETA by road?",
      "Offer to one driver at a time, or several at once?",
      "How long can a rider wait for a match before you give up?",
    ],
  ],
  [
    "clarify",
    "What would you ask about the geography?",
    [
      "One city or hundreds? Each city's traffic is mostly independent.",
      "Dense centres and empty suburbs: how uneven is it?",
      "Do airports have special queues?",
    ],
  ],
  [
    "clarify",
    "What must never be lost?",
    [
      "Trips, fares and payments: always.",
      "A single location ping: never matters, the next one replaces it.",
      "Separate the two early: they want completely different storage.",
    ],
  ],
  [
    "product",
    "What does the rider need to see after requesting?",
    [
      "That a driver accepted, who they are, and their car.",
      "The car moving smoothly towards them, with an updating ETA.",
      "Animate between pings so the car doesn't jump every four seconds.",
    ],
  ],
  [
    "product",
    "Demand outstrips drivers in one area. What does the product do?",
    [
      "Surge pricing raises prices to bring drivers in and reduce demand.",
      "Show the expected wait honestly.",
      "Suggest a pickup point a short walk away where drivers are available.",
    ],
  ],
  [
    "decision",
    "Why not write every ping to a database?",
    [
      "4,250 pings a second is more than eight times what one {sql-primary} can write.",
      "A durable write pays for safety a ping doesn't need: it's replaced in four seconds.",
      "Memory is built for this: the {cache} takes every ping at 4% busy.",
    ],
  ],
  [
    "decision",
    "How do you find the drivers near a rider quickly?",
    [
      "Bucket drivers by geographic cell (a geohash or a hexagon grid).",
      "A lookup reads the rider's cell and its neighbours.",
      "Each ping moves the driver to their new cell if they've crossed a boundary.",
    ],
  ],
  [
    "decision",
    "Why send pings to an event stream as well?",
    [
      "History feeds ETA models, pricing and dispute handling.",
      "The {data-warehouse} reads it at its own pace, off the critical path.",
      "If it slows down, history arrives late but riders notice nothing.",
    ],
  ],
  [
    "decision",
    "Where do trips live?",
    [
      "In a durable, transactional database: a trip involves money.",
      "Written a handful of times per trip (requested, accepted, started, finished), not per ping.",
      "That load is small; the pings were the problem.",
    ],
  ],
  [
    "tradeoff",
    "What do you lose by keeping locations only in memory?",
    [
      "A lost cache node drops its drivers from the map until their next ping, about four seconds.",
      "That's the whole cost, because the data is replaced constantly.",
      "Run two nodes in two zones so a loss affects only some drivers.",
    ],
  ],
  [
    "tradeoff",
    "How often should drivers ping?",
    [
      "More often: smoother maps and better matching, but more load and battery.",
      "Less often: cheaper, but cars jump and matching uses stale positions.",
      "Adaptive: ping more often when on a trip or moving fast, less when parked.",
    ],
  ],
  [
    "tradeoff",
    "How big should a geo cell be?",
    [
      "Big cells: one lookup, but thousands of drivers to sort through in a city centre.",
      "Small cells: few drivers each, but a lookup may need many cells.",
      "Hierarchical cells let you start small and widen until you find enough drivers.",
    ],
  ],
  [
    "alternative",
    "Why not a search index with geo queries?",
    [
      "It answers rich questions (drivers near here with a big car) elegantly.",
      "But it's built for data that's read far more than written; thousands of updates a second overwhelm it.",
      "It suits places (restaurants, chargers); moving drivers need memory.",
    ],
  ],
  [
    "alternative",
    "Could you match riders and drivers in batches?",
    [
      "Collect requests for a second or two, then solve the best matching for everyone at once.",
      "Better overall than greedily matching each rider to the nearest driver.",
      "At the cost of a short delay, which riders rarely notice.",
    ],
  ],
  [
    "scale",
    "How would you scale to a hundred cities?",
    [
      "Partition by city or region: a driver in Sydney never matches a rider in London.",
      "Each region can run its own cache, matching and stream partitions.",
      "Only accounts, payments and the warehouse need to be global.",
    ],
  ],
  [
    "scale",
    "Rush hour in one city doubles its pings. What strains?",
    [
      "The app tier, which here runs at 63% normally.",
      "That city's cells, if they're partitioned by area: a hot spot.",
      "The cache barely notices; memory is rarely the bottleneck here.",
    ],
  ],
  [
    "edge-case",
    "A zone goes dark at rush hour.",
    [
      "Drivers connected through it reconnect to servers in other zones and ping again.",
      "The servers left must carry the load: here thirteen of twenty, at 96%.",
      "Trips in progress continue, because trip state is durable.",
    ],
  ],
  [
    "edge-case",
    "A driver drives into a tunnel and stops pinging.",
    [
      "Their last position goes stale; after a few missed pings, stop offering them trips.",
      "On a trip, keep showing the car on the route and estimate its position.",
      "When pings resume, catch up without sending a burst of history.",
    ],
  ],
  [
    "security",
    "Driver locations are sensitive. Who can see them?",
    [
      "Riders see only their assigned driver, and only during the trip.",
      "Nearby cars on the map can be approximate, so nobody can track one driver.",
      "History in the warehouse is access-controlled and kept only as long as needed.",
    ],
  ],
  [
    "security",
    "How would someone cheat with fake locations?",
    [
      "Drivers spoofing GPS to appear near airports or in surge areas.",
      "Detect impossible jumps and speeds, and compare with the network's own location signals.",
      "Accounts with repeated anomalies lose priority or get reviewed.",
    ],
  ],
  [
    "observability",
    "What would you measure?",
    [
      "Time from request to match, and how often no driver is found.",
      "Ping lag: how old is the location data used for matching?",
      "ETA accuracy: predicted against actual pickup time.",
    ],
  ],
])

export const TYPEAHEAD = deck("typeahead", [
  [
    "clarify",
    "What would you ask about the suggestions?",
    [
      "How many suggestions, and ranked by what: popularity, recency, personal history?",
      "Are they personalised? That decides whether the edge can cache them.",
      "Do suggestions differ by language or country?",
    ],
    "How does personalisation change your caching?",
  ],
  [
    "clarify",
    "How fast must suggestions appear?",
    [
      "Before the next keystroke: around 100 to 200 milliseconds.",
      "That budget covers the network, the edge, the server and the lookup.",
      "A slower answer arrives for a prefix the user has already typed past.",
    ],
  ],
  [
    "clarify",
    "How fresh must suggestions be?",
    [
      "Rebuilt daily from yesterday's searches is enough for most queries.",
      "Breaking news needs trending queries within minutes.",
      "Ask which, because they're two different pipelines.",
    ],
  ],
  [
    "clarify",
    "What's the traffic?",
    [
      "Every keystroke is a request, so suggestions get several times the traffic of searches.",
      "Short prefixes ('a', 'th') are the most requested and the most cacheable.",
      "Peaks follow news events: everyone types the same thing at once.",
    ],
  ],
  [
    "product",
    "Should suggestions appear on the first keystroke?",
    [
      "One letter has a huge set of completions and the suggestions are rarely useful.",
      "Waiting for two or three characters cuts load a lot.",
      "Some products show recent personal searches before any typing at all.",
    ],
  ],
  [
    "product",
    "A suggestion is offensive or defamatory. What happens?",
    [
      "Suggestions are published content: filter harmful completions before they go live.",
      "Let users report a suggestion.",
      "Have a fast path to remove one suggestion everywhere, including edge caches.",
    ],
  ],
  [
    "decision",
    "Why precompute suggestions rather than search on every keystroke?",
    [
      "A search per keystroke adds about 70ms here; p99 reaches 238ms against a 200ms target.",
      "The top ten for a prefix barely changes from minute to minute.",
      "So work it out once, in the background, and look it up in memory.",
    ],
  ],
  [
    "decision",
    "What's stored, and how is it keyed?",
    [
      "For each prefix, the top ten completions with their scores.",
      "Keyed by prefix (and language or region).",
      "A trie is the classic structure; a key-value lookup by prefix works just as well at serving time.",
    ],
  ],
  [
    "decision",
    "Why can the CDN cache suggestions?",
    [
      "They aren't personalised here, so everyone typing 'pizz' gets the same answer.",
      "Popular prefixes are asked thousands of times a minute.",
      "The edge serves 7,220 of 7,600 keystrokes a second.",
    ],
  ],
  [
    "decision",
    "How are suggestions rebuilt?",
    [
      "Completed searches are logged to the {event-stream}.",
      "The {data-warehouse} counts them by query, with more weight on recent days.",
      "A job builds the top ten for every prefix and loads the new set into the {cache}.",
    ],
  ],
  [
    "tradeoff",
    "Personalised or shared suggestions?",
    [
      "Personalised suggestions are more useful, but can't be cached at the edge.",
      "Shared ones cache beautifully, but ignore what the user cares about.",
      "Blend them: a few personal ones from the device, the rest shared from the edge.",
    ],
  ],
  [
    "tradeoff",
    "How long should the CDN cache a prefix?",
    [
      "Longer: more hits and less load.",
      "Shorter: trending topics appear faster, and removed suggestions disappear sooner.",
      "Minutes is a common compromise, with explicit purges for removals.",
    ],
  ],
  [
    "tradeoff",
    "Should the client wait before asking?",
    [
      "Waiting until typing pauses (debouncing) skips requests for prefixes typed past.",
      "But too long a wait makes suggestions feel laggy.",
      "Cancel in-flight requests when a newer keystroke arrives.",
    ],
  ],
  [
    "alternative",
    "Could each app server hold the whole trie in memory?",
    [
      "The fastest possible lookup: no network hop at all.",
      "But every server needs a copy, and memory limits how many prefixes you can hold.",
      "Updating means building a new copy and swapping it in on every server.",
    ],
  ],
  [
    "alternative",
    "When is a search index the right tool?",
    [
      "When suggestions need full-text matching (any word, not just the prefix), or typo tolerance.",
      "For small catalogues where the index is fast enough.",
      "At high volume, precomputed top-k answers the common case and the index handles the rest.",
    ],
  ],
  [
    "scale",
    "How many prefixes are there?",
    [
      "Every distinct query of up to, say, 20 characters contributes up to 20 prefixes.",
      "Keep only prefixes with enough searches to matter: the long tail is huge and rarely typed.",
      "Ten suggestions per prefix at about 50 bytes each: compact enough for memory.",
    ],
  ],
  [
    "scale",
    "Breaking news doubles traffic, and everyone types the same thing.",
    [
      "Good news: identical prefixes are exactly what the edge caches best.",
      "The app tier sees the misses: here 65% busy at double traffic.",
      "But the news itself isn't in yesterday's suggestions: that's the freshness problem.",
    ],
  ],
  [
    "edge-case",
    "A trending topic appears in the last ten minutes. How does it get suggested?",
    [
      "The daily rebuild won't have it.",
      "A second, fast pipeline counts the last hour's searches and finds sudden risers.",
      "Merge its results into the daily list at serving time.",
    ],
  ],
  [
    "edge-case",
    "Someone types a prefix nobody has ever searched.",
    [
      "There's no precomputed entry, so return nothing or fall back to a slower search.",
      "Returning nothing quickly beats returning something slowly.",
      "Shorter prefixes of what they typed may still have useful suggestions.",
    ],
  ],
  [
    "security",
    "How could someone manipulate suggestions?",
    [
      "Bots searching a phrase over and over to push it into suggestions.",
      "Count unique users rather than raw searches, and discount suspicious traffic.",
      "Review sudden risers before they're shown widely.",
    ],
  ],
  [
    "security",
    "What privacy risk do suggestions carry?",
    [
      "A rare query typed by one person could surface their private information to others.",
      "Only suggest queries searched by many distinct users.",
      "Never mix one user's personal history into shared suggestions.",
    ],
  ],
  [
    "observability",
    "What would you measure?",
    [
      "Suggestion latency at p99, measured on the client, where the user feels it.",
      "How often a suggestion is picked, and at which keystroke: that's the product's success rate.",
      "Edge hit rate, and the age of the current suggestion set.",
    ],
  ],
])
