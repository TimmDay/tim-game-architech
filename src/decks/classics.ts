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
      "The cache answers about 16,760 of 19,600 clicks a second here, leaving the database about 2,840.",
      "Links rarely change, so cached copies can live a long time.",
    ],
  ],
  [
    "decision",
    "Why does the cache need two nodes when the database has room to spare?",
    [
      "The database is at 28% because the cache is there. Without it, it would face all 19,600 clicks: 196% of capacity.",
      "So the cache is no longer optional: losing it takes the site down.",
      "A second node in another zone costs $150. Replicas big enough to survive without any cache cost $800.",
    ],
  ],
  [
    "decision",
    "301 or 302?",
    [
      "301 (permanent): browsers and proxies may cache it, so repeat clicks never reach you.",
      "302 (temporary): every click comes back, so every click can be counted.",
      "Interviewers usually expect 302 when analytics matter. In practice, big shorteners often send 301 with cache headers that keep browsers from caching it for long, so clicks still come back. Know both.",
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
  [
    "resilience",
    "The database's zone goes down. What happens to clicks and to new links?",
    [
      "Popular clicks keep working from the {cache}, which is the point of running it in two zones.",
      "The standby in the other zone takes over within a minute or two; misses and creates fail briefly in between.",
      "Clients creating links should retry with the same request ID, so a retry doesn't create two links.",
    ],
  ],
  [
    "resilience",
    "Someone drops the links table by mistake. How do you restore it, and how much is lost?",
    [
      "Links on printed packaging can be clicked for years, so losing the mapping is permanent damage.",
      "Point-in-time backups let you restore to just before the mistake; anything created since is lost unless you can replay it.",
      "Practise the restore regularly: a backup you've never restored from is a hope, not a plan.",
    ],
    "What recovery point and recovery time would you promise customers?",
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
      "5,000 messages a second is well past the 3,000 or so one {sql-primary} can write.",
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
    "resilience",
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
  [
    "resilience",
    "The {event-stream} is down for five minutes. What happens to messages?",
    [
      "If storing and publishing are separate steps, a message can be stored but never delivered.",
      "Store the message with a 'pending delivery' flag, and publish from that record (an outbox) until it succeeds.",
      "Phones also ask for everything after their last message when they reconnect, which catches anything missed.",
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
      "Done inline, the app tier runs at 136% and p99 reaches 1.7 seconds.",
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
      "The cache answers 20,734 of 24,250 loads a second here.",
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
      "Here it overloads the store: 162% busy, p99 533ms, and 37% of requests fail before any spike.",
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
  [
    "resilience",
    "The timeline {cache} is wiped overnight. What happens at the morning peak?",
    [
      "Every load misses and goes to the {nosql} store, which here runs at 162% without the cache: a stampede.",
      "Warm the cache for the most active users before traffic arrives.",
      "Let one request rebuild a timeline while others wait for it, rather than all rebuilding it at once.",
    ],
  ],
  [
    "resilience",
    "Fan-out workers stop for an hour. What do users see, and how do you recover?",
    [
      "Timelines go stale: nothing new appears, but nothing fails.",
      "When workers return, the backlog drains. Process newest posts first, since an hour-old post matters more than a two-hour-old one.",
      "Meanwhile, merge recent posts in at read time for the accounts users follow most.",
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
      "The on-sale minute brings 6,000 holds a second; the {sql-primary} takes 3,000.",
      "Sent straight there, half fail, and failing fans retry, making it worse.",
      "In a line, everyone is served in turn at the rate the database can take.",
    ],
  ],
  [
    "decision",
    "How fast should the waiting room admit people?",
    [
      "At the rate the system of record can take: here 3,000 a second, from six workers at 500 each.",
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
  [
    "resilience",
    "The {sql-primary} fails over in the middle of the on-sale.",
    [
      "The waiting room pauses admitting fans; the line keeps everyone's place.",
      "Holds that were in flight are retried with the same idempotency key, so nobody gets two seats or loses one.",
      "With synchronous replication to the standby, no committed hold is lost, so no seat is sold twice after the switch.",
    ],
    "Why does it matter whether the standby is replicated synchronously?",
  ],
  [
    "resilience",
    "The waiting room itself fails. What happens?",
    [
      "If it fails open, everyone rushes the database at once: the outage you built it to prevent.",
      "Fail closed: serve a static 'please wait' page from the {cdn} and keep places in line.",
      "Keep its state somewhere that survives a restart, or fans lose their place.",
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
      "20,000 segment requests a second, and most are for popular videos.",
      "The edge serves 18,050 of them; only 1,950 reach the origin.",
      "Without it, even twenty app servers are swamped and the object store hits 364%.",
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
      "The origin and app tier see the misses: here they reach about 70%.",
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
    "resilience",
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
  [
    "resilience",
    "The region holding the original videos has an outage. What still works?",
    [
      "The {cdn} keeps serving popular segments it already has, so most viewers notice nothing.",
      "Uploads and transcoding stop, and rarely watched videos fail to play.",
      "Replicating renditions to a second region lets the edge fall back to it.",
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
      "21,250 pings a second is about seven times what one {sql-primary} can write.",
      "A durable write pays for safety a ping doesn't need: it's replaced in four seconds.",
      "Memory is built for this: the {cache} takes every ping at 11% busy.",
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
      "The app tier, which here runs at 56% normally.",
      "That city's cells, if they're partitioned by area: a hot spot.",
      "The cache barely notices; memory is rarely the bottleneck here.",
    ],
  ],
  [
    "resilience",
    "A zone goes dark at rush hour.",
    [
      "Drivers connected through it reconnect to servers in other zones and ping again.",
      "The servers left must carry the load: here thirty of forty-five, at 83%.",
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
  [
    "resilience",
    "The {event-stream} to the warehouse is down for an hour.",
    [
      "Matching keeps working: it only needs the {cache}.",
      "Don't let a failed publish fail the ping. Buffer briefly, then drop history if it's still down.",
      "A gap in location history is acceptable. A lost trip or fare is not, which is why trips are stored elsewhere.",
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
      "A search per keystroke adds about 75ms here; p99 reaches 232ms against a 200ms target.",
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
      "Popular prefixes are asked thousands of times a minute, and the edge answers them close to the user, which matters on a 200ms budget.",
      "The edge serves 9,025 of 9,500 keystrokes a second. It's billed per request, so it's the biggest line on the bill.",
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
      "Minutes is a common compromise, with explicit purges for removals. Browsers can't be purged, so keep their lifetime shorter.",
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
      "The app tier sees the misses: here 49% busy at double traffic.",
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
  [
    "resilience",
    "A bad rebuild publishes garbage suggestions everywhere.",
    [
      "Validate a new set before publishing: size, top entries for common prefixes, banned terms.",
      "Keep the previous set, so rolling back is a switch, not a rebuild.",
      "Purge the {cdn} after rolling back, or the edge keeps serving the bad set.",
    ],
  ],
  [
    "resilience",
    "A {cache} node holding suggestions is lost.",
    [
      "Common prefixes keep coming from the {cdn}.",
      "Reload the node from the last build; nothing is lost, because suggestions are rebuilt from the search log.",
      "Until then, return no suggestions for its prefixes: search itself still works.",
    ],
  ],
])

export const PUSH_ALERTS = deck("push-alerts", [
  [
    "clarify",
    "What would you ask about the notifications themselves?",
    [
      "Which channels: push only, or email and text messages too? Each has its own provider and limits.",
      "Which are urgent (a sign-in code, a driver arriving) and which can wait (a weekly digest)?",
      "Can users choose what they get, and when, with quiet hours?",
    ],
    "How does 'urgent or bulk' change the design?",
  ],
  [
    "clarify",
    "What would you ask about volume?",
    [
      "How many a day, and how spiky? Sports alerts arrive in bursts, when something happens.",
      "How many devices per user? A phone and a tablet are two sends.",
      "What's the provider's quota, and can it be raised? One major push service's default is 600,000 messages a minute per project.",
    ],
  ],
  [
    "clarify",
    "What does 'delivered' mean here?",
    [
      "Accepted by the provider, shown on the phone, or opened? You only control the first.",
      "Must every notification arrive, or is dropping a stale one fine?",
      "Should a notification an hour late still be sent? A goal alert from an hour ago is noise.",
    ],
  ],
  [
    "product",
    "Why does the app keep an inbox as well as sending pushes?",
    [
      "Pushes are best-effort: phones are off, notifications get swiped away or collapsed.",
      "An inbox kept on the server means nothing is truly missed.",
      "It's also where unread counts come from.",
    ],
  ],
  [
    "product",
    "How do you stop users turning notifications off?",
    [
      "Send fewer, better ones, and respect preferences and quiet hours.",
      "Cap how many one user gets in an hour, and bundle several into one: '3 goals in your matches'.",
      "Track the opt-out rate per kind of notification, and treat a rise as a bug.",
    ],
  ],
  [
    "decision",
    "Why put a queue between the app and the provider?",
    [
      "The provider is slow (hundreds of milliseconds) and refuses anything over quota. Neither should reach the user's request.",
      "The queue absorbs a burst, and workers send at the rate the provider accepts.",
      "If the provider is down for a while, notifications wait instead of failing.",
    ],
  ],
  [
    "decision",
    "How many workers, and why that number?",
    [
      "A call is mostly waiting, so one worker keeps about 100 in flight: roughly 667 sends a second.",
      "Size the pool to the provider's quota, not to the incoming rate. Here three workers send exactly 2,000 a second.",
      "Workers beyond the quota only collect more 'too many requests' refusals.",
    ],
  ],
  [
    "decision",
    "What's stored before the push goes out?",
    [
      "The notification, who it's for and its status, so the inbox can show it and a lost one can be found.",
      "Each user's preferences and device tokens, to decide whether and where to send.",
      "Writing it before enqueueing means a crash in between can't lose the record.",
    ],
  ],
  [
    "tradeoff",
    "A queue or an event stream for outgoing notifications?",
    [
      "A queue gives per-message retries and a dead-letter queue: right for 'send this, once'.",
      "A stream keeps history and lets several consumers read it, such as analytics and email digests.",
      "A common shape: services publish events to a stream, and the notification service turns them into sends on a queue.",
    ],
  ],
  [
    "tradeoff",
    "Urgent and bulk notifications in the same queue?",
    [
      "A million goal alerts would sit in front of someone's sign-in code.",
      "Separate queues or priorities, with workers and quota kept back for the urgent ones.",
      "Bulk sends can be spread out on purpose. Urgent ones can't wait.",
    ],
  ],
  [
    "alternative",
    "Could the provider's topics replace your own fan-out?",
    [
      "Some push services let a device subscribe to a topic, and one call reaches every subscriber.",
      "That's far fewer calls for 'everyone following this match'.",
      "You lose per-user control: preferences, quiet hours and language then have to be handled on the device, or with finer topics.",
    ],
  ],
  [
    "alternative",
    "Could you keep a connection open to every phone instead of using a provider?",
    [
      "Phones close background connections to save battery. The operating system's push service is the only reliable way to wake an app.",
      "While the app is open, a live connection (WebSockets) is fine for instant updates.",
      "Most apps do both: live updates in the app, pushes when it's closed.",
    ],
  ],
  [
    "scale",
    "A goal doubles traffic. What happens, minute by minute?",
    [
      "2,400 notifications a second arrive. 2,000 go out, and the line grows by 400 a second.",
      "When the burst passes, the 40% spare capacity drains the line.",
      "Each notification is late by however long it waited, and none is lost.",
    ],
  ],
  [
    "scale",
    "Ten times the users. What changes first?",
    [
      "The provider quota: ask for more early, since increases are usually granted on usage you've already shown.",
      "Topic sends for broadcasts, so a goal is one call per match rather than one per fan.",
      "Partition the notification log by user once one primary can't take the writes.",
    ],
  ],
  [
    "edge-case",
    "A worker sends a push, then crashes before marking it sent.",
    [
      "The queue hands it to another worker, which sends it again: at-least-once delivery.",
      "Check a notification ID before sending, and give the push a collapse key so the phone shows one.",
      "Exactly once isn't possible through a provider you don't control. Aim for duplicates that are rare and harmless.",
    ],
  ],
  [
    "edge-case",
    "The provider says a device token is no longer valid.",
    [
      "The app was uninstalled, or the token was replaced.",
      "Delete it, so you stop spending quota on a dead device.",
      "Dead tokens pile up over time. Cleaning them out is part of staying within quota.",
    ],
  ],
  [
    "edge-case",
    "A notification has waited ten minutes in the queue. Should it still go out?",
    [
      "Give each one an expiry. A goal alert ten minutes late is noise; a delivery update may still matter.",
      "Workers drop expired ones and record that in the log.",
      "Providers take an expiry too, for phones that are offline.",
    ],
  ],
  [
    "resilience",
    "The provider refuses calls with 'too many requests'. What do the workers do?",
    [
      "Back off, with jitter, and retry. Hammering it makes the refusals last longer.",
      "Leave the message on the queue: it isn't lost.",
      "Treat refusals as a signal to slow the whole pool, not just one worker.",
    ],
  ],
  [
    "resilience",
    "The provider is down for twenty minutes.",
    [
      "Notifications wait in the queue. Check it keeps messages that long.",
      "Expire the ones that won't matter by the time it's back.",
      "When it recovers, drain at the quota rate, not all at once, or you'll be refused again.",
    ],
  ],
  [
    "security",
    "What needs protecting in a notification service?",
    [
      "Device tokens and phone numbers are personal data: encrypt them at rest and limit who can read them.",
      "Only your own services may ask for a send. Authenticate them, so nobody can spam your users through you.",
      "Keep sensitive content (a balance, a test result) off the lock screen: say 'you have a new message' and show the detail in the app.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "The age of the oldest message in the queue: how late notifications are running.",
      "Provider refusals and errors per minute, against the quota.",
      "Sent, delivered and opened counts per kind of notification, and opt-outs.",
    ],
  ],
  [
    "observability",
    "A user says they never got an alert. How do you find out why?",
    [
      "Look the notification up by user and time: created, skipped by a preference, queued, sent or refused?",
      "A status on every notification makes this a lookup, not an investigation.",
      "Check when that device token last worked. Often it's dead.",
    ],
  ],
])

export const WEB_CRAWLER = deck("web-crawler", [
  [
    "clarify",
    "What would you ask about the crawl?",
    [
      "What's it for: a search index, an archive, price monitoring? That decides what to fetch and how fresh it must be.",
      "How many pages, and how often must each be revisited? News pages change hourly; most pages hardly ever.",
      "Which content: pages only, or images and documents too?",
    ],
    "How does 'how fresh' change the frontier?",
  ],
  [
    "clarify",
    "What would you ask about politeness?",
    [
      "How fast may you fetch from one site? A common rule is one request at a time per site, with a pause between.",
      "Do you obey each site's robots rules? Yes: they say what you may crawl, and sometimes how slowly.",
      "Who do site owners contact if the crawler causes trouble? Name it, with a contact address, in every request.",
    ],
  ],
  [
    "clarify",
    "What would you ask about duplicates?",
    [
      "How many links point at pages you already have? On the real web, most of them.",
      "Do the same pages turn up under many URLs: tracking parameters, session IDs, with and without 'www'?",
      "Do copied or mirrored pages count as duplicates?",
    ],
  ],
  [
    "product",
    "What makes a crawl good, from the product's point of view?",
    [
      "Covering the pages people actually search for, not the raw page count.",
      "Freshness where it matters: the news front page, not a forum post from 2009.",
      "Not getting the company blocked by site owners.",
    ],
  ],
  [
    "decision",
    "Why a queue between finding links and fetching them?",
    [
      "Finding links is fast; fetching is slow and limited by politeness. The queue lets each run at its own pace.",
      "Fetchers take work when they're free, so a slow site holds up one fetch, not the frontier.",
      "The queue outlives fetcher restarts, so no discovered URL is lost.",
    ],
  ],
  [
    "decision",
    "How do you know a URL has been seen before?",
    [
      "Normalise it first (lowercase the host, drop fragments and tracking parameters), then look up its hash.",
      "The seen set grows by 1,500 keys a second here, about 130 million a day: a partitioned key-value store keyed by that hash fits it.",
      "A Bloom filter in memory can answer 'definitely not seen' before the lookup, which saves most of the reads.",
    ],
  ],
  [
    "decision",
    "Why do fetchers need a timeout?",
    [
      "A fetch is mostly waiting. A site taking ten seconds holds a fetcher's slot ten times longer than normal.",
      "With a half-second cap, slow pages are abandoned and retried later, and the rest of the crawl carries on.",
      "Without it, the fetchers here fall 1,269 pages a second behind.",
    ],
  ],
  [
    "decision",
    "Where do fetched pages go?",
    [
      "The {object-store}: cheap, durable and effectively unlimited.",
      "Not a database: pages are large blobs nobody queries by column.",
      "Keep a small record per URL (when it was fetched, its status, a hash of its content) next to the seen set.",
    ],
  ],
  [
    "tradeoff",
    "One object per page, or many pages per file?",
    [
      "One object per page is simple, but writes are billed per request: about $5,900 a month here, the biggest line on the bill.",
      "Appending pages into large archive files cuts the request count a thousandfold or more.",
      "The cost: reading one page means finding where it sits in a file, so you keep an index of offsets.",
    ],
  ],
  [
    "tradeoff",
    "Crawl breadth-first, or by priority?",
    [
      "Breadth-first is simple, but spends fetches on low-value pages.",
      "Prioritise by importance (how many pages link to it) and by how often it changes.",
      "Keep several queues by priority, and have fetchers draw from them in proportion.",
    ],
  ],
  [
    "alternative",
    "Could the frontier service just fetch pages itself?",
    [
      "Then every link waits on a site: here p99 passes 13 seconds and most requests fail.",
      "Slow sites would tie up the service, and politeness would be impossible to enforce.",
      "Keep finding links and fetching pages apart.",
    ],
  ],
  [
    "alternative",
    "Could you skip re-downloading pages that haven't changed?",
    [
      "Ask with a conditional request ('only if changed since this date'): an unchanged page answers 'not modified', with no body.",
      "Track how often each page changes, and revisit it about that often.",
      "Sitemaps list pages with their last change, so you needn't fetch a page to find out.",
    ],
  ],
  [
    "scale",
    "How do 30 fetchers stay polite to every site?",
    [
      "Group the frontier by site, so all of one site's URLs pass through one place.",
      "That place hands out one URL at a time per site, with a pause between.",
      "Many sites at once give the throughput; each site sees a gentle trickle.",
    ],
  ],
  [
    "scale",
    "Ten times the pages. What changes first?",
    [
      "Politeness: you can't fetch one site faster, so you need far more sites in flight, not faster fetchers.",
      "The seen set: tens of billions of keys, so more partitions, and Bloom filters to save lookups.",
      "Storage cost: archive files instead of one object per page.",
    ],
  ],
  [
    "edge-case",
    "A site generates pages forever, like a calendar with an endless 'next month' link.",
    [
      "A crawler trap: the crawler follows it for ever and the frontier fills with junk.",
      "Limit depth and pages per site, and ignore URL patterns that never end.",
      "Watch for sites whose URL count keeps growing while their content doesn't.",
    ],
  ],
  [
    "edge-case",
    "The same article appears under many URLs. How do you store it once?",
    [
      "Normalise URLs, and follow the page's own 'canonical' link when it gives one.",
      "Hash the content: matching hashes mean a duplicate, whatever the URL.",
      "Near-duplicates (the same article with different adverts) need fuzzier fingerprints.",
    ],
  ],
  [
    "edge-case",
    "A fetch is retried after a timeout, and both attempts finish.",
    [
      "The page is stored twice, and the site was asked twice.",
      "Key storage by URL, so the second copy overwrites the first and the retry is harmless.",
      "Without that, about 180 pages a second are fetched twice here during the slowdown.",
    ],
  ],
  [
    "resilience",
    "A fetcher crashes mid-crawl.",
    [
      "Its URLs return to the queue when their time runs out, and another fetcher takes them.",
      "Fetches are idempotent by URL, so a repeat does no harm.",
      "Nothing that was discovered is lost.",
    ],
  ],
  [
    "resilience",
    "Some big sites slow to ten seconds a page.",
    [
      "Timeouts cut each attempt at half a second, and the page goes back for later, with backoff.",
      "Back off that site in particular: a slow site may be struggling, and politeness means asking less.",
      "Here the fetchers rise from 50% to 80% busy and keep up.",
    ],
  ],
  [
    "security",
    "What risks does a crawler bring?",
    [
      "It downloads untrusted content: never run it, parse it in a sandbox, and cap sizes.",
      "Links and redirects can point inside your own network. Block private addresses, or the crawler becomes a way in.",
      "Ignore robots rules or politeness and site owners will block your whole address range.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "Pages fetched per second, and the frontier's backlog and oldest URL.",
      "Errors and timeouts per site, to spot sites that are struggling or blocking you.",
      "How many fetches were duplicates, and how many came back 'not modified'.",
    ],
  ],
  [
    "observability",
    "A site owner complains about the crawler. How do you check?",
    [
      "Requests to their site per minute, against your politeness rules.",
      "Which URLs you fetched, and whether their robots rules allowed it.",
      "A contact address in every request means complaints come to you first, not to your hosting provider.",
    ],
  ],
])

export const PAY_BUTTON = deck("pay-button", [
  [
    "clarify",
    "What would you ask about the payments?",
    [
      "Which methods: cards, bank transfers, wallets? Each has its own provider and timing.",
      "One-off payments, subscriptions, or payouts to sellers as well?",
      "Which currencies and countries? Rules and providers differ.",
    ],
    "How do payouts to sellers change the ledger?",
  ],
  [
    "clarify",
    "What does 'done' mean for a payment?",
    [
      "Authorised (the bank has agreed), captured (the money is taken) or settled (it has actually moved)? They can be days apart.",
      "Can a payment be partly refunded, or disputed weeks later?",
      "What must the shopper see at each step?",
    ],
  ],
  [
    "clarify",
    "What would you ask about failures?",
    [
      "What's worse for the business: a lost payment, a double charge or a wrongly declined one?",
      "How long may a payment stay 'processing' before you tell the shopper?",
      "Who carries the loss if money goes missing in flight?",
    ],
  ],
  [
    "product",
    "Why show 'processing' rather than 'paid' straight away?",
    [
      "Saying 'paid' before the provider confirms risks telling people money moved when it didn't.",
      "Most charges confirm in under a second, so the wait is usually invisible.",
      "On a bad day, 'processing, we'll email you' is honest. A spinning button that times out makes people pay again.",
    ],
  ],
  [
    "decision",
    "Why record the payment before charging it?",
    [
      "If the charge goes through and you crash before writing it down, you've taken money you can't account for.",
      "Write 'pending', charge, then mark the result: every state is on record.",
      "A sweeper finds payments stuck in pending and asks the provider what happened.",
    ],
  ],
  [
    "decision",
    "Why charge in the background rather than in the request?",
    [
      "The provider can slow to seconds. In the request, that wait, and every failure, lands on the shopper.",
      "Here, charging inline fails every payment once the provider slows.",
      "Behind a queue, a slow provider means slower confirmations, not errors.",
    ],
  ],
  [
    "decision",
    "What's double-entry bookkeeping, and why use it?",
    [
      "Every movement is written as entries that sum to zero: the shopper's account down, the seller's up.",
      "Balances are derived from the entries, so they can always be checked by adding up.",
      "Money can't appear or vanish without a matching entry, which makes mistakes visible.",
    ],
  ],
  [
    "decision",
    "How do idempotency keys stop double charges?",
    [
      "The client makes one key per payment and sends it with every attempt.",
      "Your service and the provider store the key with the result, and a repeat gets the stored result instead of a new charge.",
      "Without them, retries here charge about 72 payments a second twice.",
    ],
  ],
  [
    "tradeoff",
    "Authorise while the shopper waits, or do everything in the background?",
    [
      "Authorising inline gives an instant yes or no, which helps checkout.",
      "But the request is then only as fast as the provider: give it a short timeout, and fall back to 'processing'.",
      "Taking the money, refunds and payouts belong in the background either way.",
    ],
  ],
  [
    "tradeoff",
    "Why a {sql-primary} for the ledger rather than {nosql}?",
    [
      "Double entry writes both sides of a movement together, which a relational transaction does well.",
      "Consistency matters more than write scale: 600 payments a second is well within one primary.",
      "Partition by merchant later, if writes outgrow it.",
    ],
  ],
  [
    "alternative",
    "Could you skip the queue and let the provider call you back?",
    [
      "Providers do send webhooks when a payment changes, and you should handle them.",
      "But you still need to make the charge request reliably, and webhooks can arrive late, twice or out of order.",
      "Treat webhooks as events to check against, not as your only record.",
    ],
  ],
  [
    "alternative",
    "How is reconciliation done?",
    [
      "Every day, match each ledger entry against the provider's settlement report, by payment ID and amount.",
      "Anything unmatched (charged but not recorded, or recorded but not charged) is investigated.",
      "It catches bugs no single request would reveal.",
    ],
  ],
  [
    "scale",
    "Payments grow tenfold. What changes?",
    [
      "The provider quota first: negotiate more, or spread payments across providers.",
      "Partition the ledger by merchant, so writes spread over several primaries.",
      "Keep each payment's entries on one partition, so a payment is still one transaction.",
    ],
  ],
  [
    "scale",
    "Why twelve workers when two would cover a normal day?",
    [
      "On a bad afternoon each call is held longer, retries add a fifth, and a lost zone takes a third of the workers.",
      "Here the eight that survive run at 67%.",
      "Size for the worst day you've promised to survive, not the average one.",
    ],
  ],
  [
    "edge-case",
    "The provider times out. Did the charge happen?",
    [
      "You can't tell: it may have succeeded just after you gave up.",
      "Retry with the same idempotency key, and the provider returns the original result if it did.",
      "If retries run out, keep the payment pending and ask the provider later. Never assume it failed.",
    ],
  ],
  [
    "edge-case",
    "A webhook says a payment succeeded, but your ledger says it failed.",
    [
      "Trust neither blindly: ask the provider's API for the payment's current state.",
      "Webhooks can arrive out of order, so check a timestamp or version before applying one.",
      "Write a correcting entry, with the reason, rather than editing history.",
    ],
  ],
  [
    "edge-case",
    "A shopper double-clicks Pay.",
    [
      "Both requests carry the same idempotency key, made when the checkout page loaded.",
      "The second finds the first one's record and returns its result.",
      "Disable the button too, but never rely on the button alone.",
    ],
  ],
  [
    "resilience",
    "A zone loses power in the middle of the afternoon.",
    [
      "The ledger's standby in another zone is promoted, after a short pause in writes.",
      "Payments already on the queue wait; nothing is lost.",
      "The surviving workers carry on: here eight of twelve, at 67%.",
    ],
  ],
  [
    "resilience",
    "The provider is down for an hour.",
    [
      "Payments wait as pending, and shoppers are told they're processing.",
      "Workers back off, so the provider isn't flooded when it returns.",
      "Some businesses switch to a second provider, which needs its own idempotency and reconciliation.",
    ],
  ],
  [
    "security",
    "What has to be protected?",
    [
      "Never store card numbers yourself. The provider gives you a token that stands in for the card, which keeps most of your system out of card-data rules.",
      "Encrypt the ledger at rest, and log every access to it.",
      "Rate-limit payment attempts per account and per card, to stop people testing stolen cards.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "Payments stuck in pending, by how long they've waited.",
      "Provider errors and latency, and the share of payments declined.",
      "Unmatched entries from reconciliation. The number should be zero.",
    ],
  ],
  [
    "observability",
    "Finance says yesterday's totals are $2,000 out. How do you find it?",
    [
      "Reconciliation lists the payments that don't match, by ID.",
      "Look up each one's history in the ledger and in the provider's records.",
      "Fix it with correcting entries, and add a check so the same bug is caught on the day.",
    ],
  ],
])

export const FAIR_SHARE = deck("fair-share", [
  [
    "clarify",
    "What would you ask about the limits?",
    [
      "Limited by what: API key, user, address, or endpoint? An address search costs far more than a map tile.",
      "What limit, over what window: 100 a second, or 5,000 an hour?",
      "Do paying tiers get more?",
    ],
    "How would you limit an expensive endpoint differently?",
  ],
  [
    "clarify",
    "What should a caller see when they hit the limit?",
    [
      "A clear '429 Too Many Requests', saying how long to wait before trying again.",
      "Headers on every response saying how much is left, so clients slow down before they're refused.",
      "Never a timeout or a 500: an error that looks like an outage makes clients retry harder.",
    ],
  ],
  [
    "clarify",
    "How exact must the limit be?",
    [
      "Is letting a caller through at 105 instead of 100 a problem? Usually not.",
      "Is it protecting the system, where approximate is fine, or billing, which must be exact and is better counted afterwards?",
      "That decides whether every request must touch a shared counter.",
    ],
  ],
  [
    "product",
    "Why does a paid API limit its customers at all?",
    [
      "To protect everyone else from one customer's bug or spike.",
      "To make capacity planning possible: limits bound the worst case.",
      "Limits are part of the product: higher tiers are something you can sell.",
    ],
  ],
  [
    "decision",
    "Where should the limit be enforced?",
    [
      "Where the API key is known: here, in the {app-server}, before any real work.",
      "A limit by address at the {load-balancer} still helps against simple floods, but this script uses hundreds of machines.",
      "Refuse as early as you can: a refused request should cost almost nothing.",
    ],
  ],
  [
    "decision",
    "Why must the counters be shared?",
    [
      "Each server sees only its share of a caller's requests: here, a 36th.",
      "Counting in each server's memory lets a caller spread across them all through 36 times over.",
      "A shared in-memory store, such as a {cache}, gives every server the same count.",
    ],
  ],
  [
    "decision",
    "How does a token bucket work?",
    [
      "Each key has a bucket that refills at its rate (100 tokens a second) up to a size (say 200).",
      "A request takes a token. With none left, it's refused.",
      "Short bursts up to the bucket's size get through, while the average is held to the rate.",
    ],
  ],
  [
    "tradeoff",
    "Fixed window, sliding window or token bucket?",
    [
      "Fixed window: count per clock second or minute. Cheapest, but a caller can send double across a boundary.",
      "Sliding window: weight the previous window's count by how much of it overlaps. Smoother, for a little more work.",
      "Token bucket: smooth as well, and kind to bursts. The usual choice for APIs.",
    ],
  ],
  [
    "tradeoff",
    "The counter store goes down. Let requests through, or refuse them?",
    [
      "Let them through (fail open) for a paid API: the limiter failing shouldn't take the product down with it.",
      "Refuse (fail closed) where abuse is the bigger risk, such as sign-ins.",
      "Either way, alert: running with no limit should be brief.",
    ],
  ],
  [
    "alternative",
    "Could a managed {api-gateway} do this for you?",
    [
      "Yes: per-key limits and usage tiers, with nothing to run.",
      "But it's billed per call: about $15,800 a month at this traffic, four times this budget.",
      "Good at low volume, or when you'd rather pay than build.",
    ],
  ],
  [
    "alternative",
    "Could each server count locally and sync now and then?",
    [
      "Yes: count in memory, and push totals to the shared store every second.",
      "Far fewer calls to the store, at the price of overshooting the limit briefly.",
      "Fine when the limit protects capacity; not when it's billing.",
    ],
  ],
  [
    "scale",
    "Every request now updates a counter. Can the cache take it?",
    [
      "Here that's 20,000 updates a second, a tenth of what two nodes can do.",
      "One key's counter lives on one node, so a single huge customer is a hot key. Split its counter across several keys if needed.",
      "Counters expire with their window, so the memory they need stays small.",
    ],
  ],
  [
    "scale",
    "The API runs in three regions. Is the limit global?",
    [
      "Sharing counters across regions puts a long round trip on every request.",
      "The usual answer: split the limit between regions, or sync counts every few seconds and accept a little overshoot.",
      "Choose by how exact the limit needs to be.",
    ],
  ],
  [
    "edge-case",
    "A customer's traffic is genuinely spiky: quiet for a minute, then 500 requests at once.",
    [
      "A token bucket with room for bursts lets that through while holding the average.",
      "A fixed per-second limit would refuse most of the burst.",
      "Ask whether it's their rate or their burst size that needs raising.",
    ],
  ],
  [
    "edge-case",
    "Two servers check the same counter at the same moment.",
    [
      "Read-then-write lets both through on the last token.",
      "Use the store's atomic increment, or a small script that checks and takes in one step.",
      "Then the count is right whichever server gets there first.",
    ],
  ],
  [
    "edge-case",
    "A refused client retries straight away, in a loop.",
    [
      "Tell it when to come back, and expect it not to listen.",
      "Refusing must stay cheap: no database work for a refused call.",
      "Repeat offenders can be blocked for longer, or at the edge.",
    ],
  ],
  [
    "resilience",
    "The {cache} holding the counters loses a node.",
    [
      "Counts on that node are gone, so some callers get a fresh allowance: harmless for a limit.",
      "Requests still flow if the limiter fails open.",
      "Two nodes in two zones keep it from being a single point of failure.",
    ],
  ],
  [
    "resilience",
    "The runaway script hits. What happens, step by step?",
    [
      "60,000 extra requests a second arrive, spread over every server.",
      "Each server checks the shared counter, sees the key is over its limit, and answers 429 at once.",
      "The servers stay at 56%, and every other customer carries on unaffected.",
    ],
  ],
  [
    "security",
    "Can a per-key limit be dodged?",
    [
      "By making many keys: limit sign-ups too, and tie keys to verified accounts.",
      "By stealing someone's key: let customers rotate keys, and watch for one key used from everywhere at once.",
      "Anonymous calls should get a much lower limit, by address.",
    ],
  ],
  [
    "security",
    "What should never count against a customer's limit?",
    [
      "Your own health checks and internal traffic.",
      "Requests you reject as malformed or unauthenticated, if they're cheap to reject.",
      "Be explicit about it: customers will compare your counts with theirs.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "Refused requests per key: a sudden jump is a runaway client or an attack.",
      "The counter store's latency, since it's on every request.",
      "The busiest keys, to spot hot keys and customers who need a higher tier.",
    ],
  ],
  [
    "observability",
    "A customer says they're refused below their limit. How do you check?",
    [
      "Look at their counter's history, and which servers answered them.",
      "Check the window: a per-second limit can refuse a burst that the per-minute average hides.",
      "Point them at the remaining-quota headers you send, so they can see it too.",
    ],
  ],
])

export const SAVE_GAME = deck("save-game", [
  [
    "clarify",
    "What would you ask about the data?",
    [
      "What's the key and what's the value: one blob per player, or many small items?",
      "How big is a save, and how fast does it grow?",
      "Is it ever looked up other than by player? A leaderboard belongs in a different store.",
    ],
    "How would a leaderboard change the design?",
  ],
  [
    "clarify",
    "What would you ask about consistency?",
    [
      "If a player loads straight after saving, must they see that save? On the same device, usually yes.",
      "Can two devices save the same player at once? That's where conflicts come from.",
      "Is losing a few seconds of progress ever acceptable?",
    ],
  ],
  [
    "clarify",
    "What would you ask about traffic?",
    [
      "Reads to writes: here, nine loads for every save.",
      "Is anything read by everyone? One shared key behaves very differently from millions of private ones.",
      "How spiky is it? A new event at 6pm brings everyone at once.",
    ],
  ],
  [
    "product",
    "What does a player notice when this goes wrong?",
    [
      "A failed save is the worst: lost progress makes people quit.",
      "An old save for a few seconds is mildly annoying, and usually goes unnoticed.",
      "Slow loading at launch is what reviews complain about.",
    ],
  ],
  [
    "decision",
    "Why partition by player ID?",
    [
      "Every load and save names the player, so each request goes to one partition.",
      "Millions of players spread evenly, so no partition is much busier than another.",
      "By region, the biggest region's partition overloads; by time, every new save lands on the newest one.",
    ],
  ],
  [
    "decision",
    "Why does today's event key need a cache?",
    [
      "Every player reads it: 15% of all reads, 4,050 a second, on one key.",
      "One key lives on one partition, which tops out around 3,000 reads a second however many blocks you buy.",
      "Cached, it's answered from memory, and the store hardly sees it.",
    ],
  ],
  [
    "decision",
    "Why keep accepting saves during a split?",
    [
      "A refused save loses progress, which players notice far more than a briefly stale load.",
      "Saves belong to one player, so conflicts are rare: only the same player saving on both sides at once.",
      "When it heals, keep the save with the higher version, or merge by the game's rules.",
    ],
  ],
  [
    "decision",
    "What do N, R and W mean in a quorum store?",
    [
      "Each key has N copies. A write waits for W of them to confirm; a read asks R of them.",
      "If R + W > N, every read overlaps the latest write: with N = 3, that's R = 2 and W = 2.",
      "Lower R or W for speed and availability; raise them for consistency.",
    ],
  ],
  [
    "tradeoff",
    "With three copies: R = 1 and W = 1, or R = 2 and W = 2?",
    [
      "R = 1, W = 1: fastest, and works with one copy reachable, but a read may miss the latest write.",
      "R = 2, W = 2: reads see the latest write, but two copies must be reachable.",
      "Many stores let you choose per request: strong for 'load my save', weak for 'show a friend's level'.",
    ],
  ],
  [
    "tradeoff",
    "Provisioned capacity, or pay per request?",
    [
      "Provisioned blocks are cheaper per request under steady load, but cost the same at 3am.",
      "Paying per request follows the traffic, at a higher price per request.",
      "Spiky games often provision for the base and let the peaks go on demand.",
    ],
  ],
  [
    "alternative",
    "Could today's event avoid the store entirely?",
    [
      "Ship it with the app update, or serve it from a {cdn}: it's the same for everyone.",
      "Then no player's read touches the store for it.",
      "The price is how quickly a change reaches players.",
    ],
  ],
  [
    "alternative",
    "Could you split the hot key instead of caching it?",
    [
      "Store copies under ten keys (event#1 to event#10) and read one at random.",
      "Reads spread over ten partitions, each well under the limit.",
      "Every write must update all ten, which is fine for something that changes once a day.",
    ],
  ],
  [
    "scale",
    "Players grow tenfold. What changes?",
    [
      "More blocks: data keyed by player spreads evenly, so capacity grows with them.",
      "The hot key doesn't grow with blocks. The cache, or copies of the key, must carry it.",
      "Saves grow too: cap their size, or split big ones into parts.",
    ],
  ],
  [
    "scale",
    "How does the store add capacity without moving everything?",
    [
      "Keys are placed by consistent hashing, so a new node takes a slice from its neighbours.",
      "That slice is copied across in the background, then requests switch over.",
      "Managed stores split busy partitions for you, but a single key never splits.",
    ],
  ],
  [
    "edge-case",
    "A copy is unreachable when a write arrives. What does a sloppy quorum do?",
    [
      "It writes to another healthy node instead, with a hint saying where the data really belongs.",
      "When the missing copy returns, the hint is handed back to it: hinted handoff.",
      "Writes stay available, at the cost that the key's real copies may not all have the write yet.",
    ],
  ],
  [
    "edge-case",
    "A read finds two copies disagreeing.",
    [
      "Return the newer one, by version, and write it back to the stale copy: read repair.",
      "Background anti-entropy compares copies with Merkle trees and fixes what reads don't touch.",
      "If neither version follows the other, they conflict: keep both and merge.",
    ],
  ],
  [
    "edge-case",
    "A player deletes their save. Why might it come back?",
    [
      "A copy that missed the delete still holds the old value, and could repair the others with it.",
      "So a delete writes a tombstone: a marker saying 'deleted' that beats older values.",
      "Tombstones are cleared by compaction once every copy has seen them.",
    ],
  ],
  [
    "resilience",
    "A zone is cut off. What happens to saves?",
    [
      "Here the cut-off zone keeps saving, about 1,000 a second, and nobody's save fails.",
      "When it heals, copies exchange what they missed, and conflicts are merged.",
      "Refusing instead would fail 16% of requests.",
    ],
  ],
  [
    "resilience",
    "One partition's node fails outright.",
    [
      "Its keys are served by the other copies while a replacement is built.",
      "The replacement is filled from those copies in the background.",
      "With three copies, losing one node loses neither data nor availability.",
    ],
  ],
  [
    "security",
    "Players try to cheat by sending fake saves.",
    [
      "Never trust the client's numbers: check each save on the server against what's possible.",
      "Tie saves to the signed-in player, so one player can't write another's save.",
      "Keep a history of saves, so a hacked account can be rolled back.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "Throttled requests per partition: the first sign of a hot key.",
      "The cache's hit rate on the hot keys.",
      "How long copies take to agree after a write, and how many conflicts are merged.",
    ],
  ],
  [
    "observability",
    "Loading is slow for some players and fine for others. Where do you look?",
    [
      "Latency per partition: one hot or overloaded partition explains a subset of players.",
      "Save sizes: a few huge saves are slow to load and to copy.",
      "Which zone those players are in, during or after a split.",
    ],
  ],
])

export const SYNC_FOLDER = deck("sync-folder", [
  [
    "clarify",
    "What would you ask about the files?",
    [
      "How big: mostly small documents, or videos and disk images? It decides the chunk size.",
      "How many devices per user, and how quickly must a change appear on the others?",
      "Are folders shared between people, and with what permissions?",
    ],
    "How does sharing change the metadata?",
  ],
  [
    "clarify",
    "What would you ask about edits?",
    [
      "Do people edit big files in small places (a line in a spreadsheet), or replace them whole?",
      "Can two devices edit the same file while offline?",
      "Must old versions be kept, and for how long?",
    ],
  ],
  [
    "clarify",
    "What would you ask about scale?",
    [
      "How many users, files and bytes? Storage cost grows with all three.",
      "How many changes a second at peak, and when? Here, Monday at 9am.",
      "How much is duplicated across users? The same installer or photo is often stored by thousands.",
    ],
  ],
  [
    "product",
    "What does a user notice when sync is working well?",
    [
      "A change on the laptop appears on the phone within seconds.",
      "A small edit to a big file syncs almost instantly.",
      "Nothing is ever lost, even when two devices disagree.",
    ],
  ],
  [
    "decision",
    "Why split files into chunks?",
    [
      "A small edit re-uploads only the chunks that changed, not the whole file.",
      "Chunks named by their hash are stored once, however many files or users contain them.",
      "A failed upload resumes from the last chunk, not from the start.",
    ],
  ],
  [
    "decision",
    "Why do chunks go straight to the {object-store}?",
    [
      "Relaying a 4 MB chunk costs an {app-server} about 25 ordinary requests' worth of its network.",
      "Here that would run the app tier at 883%, and even 60 servers can't take it.",
      "With signed URLs, the app only signs links and records versions: a few small requests per file.",
    ],
  ],
  [
    "decision",
    "What's stored in the database, and what in the {object-store}?",
    [
      "Database: each file's versions, the list of chunk hashes for each, folders and permissions.",
      "{object-store}: the chunks themselves, named by hash.",
      "Metadata is small and queried constantly; chunks are big and fetched by key. Each goes where it fits.",
    ],
  ],
  [
    "decision",
    "How does a device learn that something changed?",
    [
      "It asks the app 'what changed since version N?', and gets the list.",
      "Long polling or a live connection lets the app answer the moment a change lands, instead of on a timer.",
      "The answer is metadata only. The device then fetches just the chunks it lacks.",
    ],
  ],
  [
    "tradeoff",
    "Fixed-size chunks or content-defined chunks?",
    [
      "Fixed 4 MB chunks are simple and predictable.",
      "But inserting a byte at the start shifts every boundary, so every chunk looks new.",
      "Content-defined chunking finds boundaries in the data itself, so an edit only changes the chunks around it.",
    ],
  ],
  [
    "tradeoff",
    "Big chunks or small ones?",
    [
      "Big chunks mean fewer requests, which matters when each one is billed.",
      "Small chunks re-upload less after a small edit, and deduplicate better.",
      "Many services pick a few megabytes, and bundle tiny files together.",
    ],
  ],
  [
    "alternative",
    "Could a {cdn} serve the downloads?",
    [
      "For popular shared files, yes: the edge serves them close to users.",
      "Most chunks are private and read once or twice, so the hit rate would be low.",
      "Signed links work through a CDN too, if it checks the signature.",
    ],
  ],
  [
    "alternative",
    "Could the app tier just relay everything?",
    [
      "It's simpler: one place to check permissions, no signed links.",
      "But every byte crosses your servers twice, and here no number of servers is enough.",
      "It's reasonable only for small files and low volume.",
    ],
  ],
  [
    "scale",
    "Ten times the users. What changes?",
    [
      "Storage cost first: deduplication and cheaper storage tiers for old versions matter more than servers.",
      "The metadata database needs partitioning, by user or folder.",
      "Change notifications need many long-lived connections: a dedicated tier that holds them.",
    ],
  ],
  [
    "scale",
    "Why name chunks by their hash?",
    [
      "Identical chunks get the same name, so each is stored once.",
      "Hash-like names spread evenly across the store's key prefixes, so no prefix runs out of capacity.",
      "A downloaded chunk can be checked against its name, which catches corruption.",
    ],
  ],
  [
    "edge-case",
    "Two devices edit the same file while offline.",
    [
      "Each commits a new version based on the same old one; the second commit finds it's no longer the latest.",
      "Don't merge silently: keep both, as 'report (Sam's laptop conflicted copy)'.",
      "Version numbers on each commit are what make the conflict visible.",
    ],
  ],
  [
    "edge-case",
    "A device uploads chunks, then loses its connection before committing.",
    [
      "The chunks are in the store, but no version points to them, so nobody sees a half-uploaded file.",
      "When the device reconnects, it commits; chunks already uploaded aren't sent again.",
      "Chunks no version refers to are cleaned up after a while.",
    ],
  ],
  [
    "edge-case",
    "A user deletes a file that shares chunks with other files.",
    [
      "Deleting the file removes its metadata, not its chunks.",
      "A chunk is deleted only when nothing refers to it any more, which means counting references or sweeping periodically.",
      "Keep deleted versions for a while, so 'undo' and 'restore' work.",
    ],
  ],
  [
    "resilience",
    "The metadata database fails over to its standby.",
    [
      "Devices can't commit for a minute or two; their changes wait locally and retry.",
      "Chunks keep uploading to the store, which doesn't depend on the database.",
      "Nothing is lost, because a version only exists once it's committed.",
    ],
  ],
  [
    "resilience",
    "Monday at 9am: everyone's laptop syncs at once.",
    [
      "The app tier rises to 75% and the store to 86%: the spare capacity is for exactly this.",
      "Devices back off and spread their retries, so a burst doesn't become a stampede.",
      "Large uploads can wait a few minutes; small changes go first.",
    ],
  ],
  [
    "security",
    "What can go wrong with signed URLs?",
    [
      "Anyone holding a link can use it until it expires: keep them short-lived and limited to one key and one action.",
      "Sign only after checking the user may read or write that file.",
      "Never sign a link to a key the client chose freely, or one user could overwrite another's data.",
    ],
  ],
  [
    "security",
    "How do you protect files at rest?",
    [
      "Encrypt the store and the database, with keys you can rotate.",
      "Deduplicating across users leaks a little: someone can tell whether a file already exists. Some services only deduplicate within one account.",
      "Log every access to shared files.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "How long a change takes to reach a user's other devices.",
      "Upload and download failures by device and region, since networks fail far more than servers.",
      "Bytes stored per user, and the deduplication rate: the drivers of cost.",
    ],
  ],
])

export const CLICK_COUNTER = deck("click-counter", [
  [
    "clarify",
    "What would you ask about counting?",
    [
      "Exactly once for billing, or approximate for the dashboard? Often both, from different paths.",
      "How fresh must the dashboard be: seconds, or a minute?",
      "How long are raw clicks kept, and who reconciles them?",
    ],
    "Why might the two answers come from different systems?",
  ],
  [
    "clarify",
    "What would you ask about fraud?",
    [
      "Do bots and repeat clicks count? Advertisers won't pay for them.",
      "Is filtering done before counting, or afterwards with a refund?",
      "Who can see why a click was rejected?",
    ],
  ],
  [
    "clarify",
    "What would you ask about traffic?",
    [
      "Clicks a second at peak, and how spiky: a half-time ad doubles it.",
      "How skewed: one ad can take 5% of everything.",
      "How many ads, and how many advertisers watching dashboards?",
    ],
  ],
  [
    "product",
    "Why must the click itself be fast?",
    [
      "The click is a redirect to the advertiser's page: every millisecond is someone waiting.",
      "Slow redirects lose visitors, which costs the advertiser and you.",
      "So recording a click must never wait for counting it.",
    ],
  ],
  [
    "decision",
    "Why publish clicks to a stream instead of counting them in the request?",
    [
      "The redirect returns as soon as the event is published.",
      "Every consumer (counting, billing, fraud checks) reads every click at its own pace.",
      "Raw events can be replayed if a count turns out wrong.",
    ],
  ],
  [
    "decision",
    "How do workers count clicks per ad per minute?",
    [
      "Each keeps running counts in memory for the current minute, for the ads it owns.",
      "When a minute closes, it writes one count per ad: here about 15 writes a second instead of 15,000.",
      "That's a tumbling window: fixed minutes that don't overlap.",
    ],
  ],
  [
    "decision",
    "Why does aggregation solve the hot ad?",
    [
      "Written per click, the top ad's key gets 750 writes a second, and 1,500 in the ad break: over the 1,000 a key takes.",
      "Aggregated, it gets one write a minute.",
      "Partition the stream by ad, so one worker owns each ad's count.",
    ],
  ],
  [
    "tradeoff",
    "Exactly once: how close can you get?",
    [
      "The stream delivers at least once, so a worker can see a click twice after a restart.",
      "Write each minute's count by key, so rewriting it is harmless, and give every click an ID.",
      "Commit the stream position together with the counts, so a restart resumes exactly where it stopped.",
    ],
  ],
  [
    "tradeoff",
    "A fast path and a batch path, or only one?",
    [
      "Stream counts give dashboards numbers that are seconds old.",
      "The warehouse recounts raw clicks nightly for billing, catching anything the fast path got wrong.",
      "Two paths (the 'lambda' pattern) are more to run; one stream path with replay ('kappa') is simpler, if you trust it.",
    ],
  ],
  [
    "alternative",
    "Could you increment a counter in the database for each click?",
    [
      "15,000 increments a second is five times what one {sql-primary} writes.",
      "In {nosql}, the hot ad's key alone passes its limit in the ad break.",
      "Counting per click only works at small scale.",
    ],
  ],
  [
    "alternative",
    "Could the warehouse do all the counting?",
    [
      "Yes, in batches: load raw clicks and query them every few minutes.",
      "Dashboards would then be minutes behind.",
      "Writing to it inside the click request would put its seconds of latency on every redirect.",
    ],
  ],
  [
    "scale",
    "Clicks grow tenfold. What changes?",
    [
      "More stream shards and workers: both scale out by partition.",
      "The counts store barely notices: aggregation keeps its writes tiny.",
      "Raw storage grows fastest: compress it, and move old clicks to cheaper storage.",
    ],
  ],
  [
    "scale",
    "How do you find the top 100 ads this hour?",
    [
      "Each worker keeps a top list for the ads it owns.",
      "Merge those lists: since each ad belongs to one worker, the overall top 100 is somewhere in their lists.",
      "For approximate counts over a huge number of ads, a count-min sketch uses fixed memory.",
    ],
  ],
  [
    "edge-case",
    "A click arrives three minutes late. Which minute does it count in?",
    [
      "The minute it happened (event time), not the minute it arrived.",
      "Keep each window open a little longer (a watermark), then close it.",
      "Clicks later than that go to a correction the nightly recount picks up.",
    ],
  ],
  [
    "edge-case",
    "A bot clicks the same ad 1,000 times.",
    [
      "Filter repeats from one user, device or address within a short window.",
      "Count raw clicks and billable clicks separately.",
      "Refunds for fraud found later come from the nightly recount.",
    ],
  ],
  [
    "resilience",
    "A counting worker crashes in the middle of a minute.",
    [
      "Its counts in memory are lost, but the stream still holds the clicks.",
      "The replacement resumes from the last committed position and counts them again.",
      "Nothing is billed twice, because counts are written by key, not added.",
    ],
  ],
  [
    "resilience",
    "The warehouse is down for maintenance.",
    [
      "Raw clicks wait in the stream, which must keep them long enough.",
      "Counting and redirects carry on unaffected.",
      "When it's back, it catches up from where it stopped.",
    ],
  ],
  [
    "security",
    "What could an attacker do to a click service?",
    [
      "Click fraud: inflate a competitor's bill, or their own payouts.",
      "Forge click events directly, so only accept clicks carrying an ID signed by your ad server.",
      "Rate-limit by address and device, and keep raw evidence for disputes.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "Stream lag for each consumer: how far counting and billing are behind.",
      "The gap between the fast counts and the nightly recount.",
      "Clicks a second per ad, to spot fraud and hot ads.",
    ],
  ],
  [
    "observability",
    "An advertiser disputes their bill. How do you answer?",
    [
      "Recount their clicks from the raw events for that period.",
      "Show the filtered clicks separately, with the reason for each.",
      "Because raw events are kept, the answer is evidence, not a guess.",
    ],
  ],
])

export const SHARED_DOC = deck("shared-doc", [
  [
    "clarify",
    "What would you ask about editing?",
    [
      "How many people edit one document at once? Google Docs allows up to 100 in a file.",
      "Text only, or tables, images and comments too? Each needs its own merge rules.",
      "Must people be able to edit offline, then sync later?",
    ],
    "How does offline editing change the merge strategy?",
  ],
  [
    "clarify",
    "What would you ask about latency?",
    [
      "How quickly must someone's typing appear for others? Well under a second feels live.",
      "Must your own typing appear instantly, before the server confirms it? Yes, always.",
      "Are editors spread across the world, or in one region?",
    ],
  ],
  [
    "clarify",
    "What would you ask about history?",
    [
      "Must every version be kept, so people can see and restore old ones?",
      "Who made each change, and when?",
      "How long is history kept, and does deleting a document delete it?",
    ],
  ],
  [
    "product",
    "What does a good editing experience feel like?",
    [
      "Your own typing never waits on the network.",
      "Others' cursors and changes appear smoothly, without jumping.",
      "Nothing anyone typed is ever lost, even after a disconnection.",
    ],
  ],
  [
    "decision",
    "Why store a document as a log of edits rather than as one blob?",
    [
      "Saving the whole document on every keystroke means huge, conflicting writes.",
      "Small edits can be ordered, broadcast and merged, and they give you history for free.",
      "Snapshots now and then keep opening a document fast.",
    ],
  ],
  [
    "decision",
    "Why key the edit log by document?",
    [
      "Opening or catching up on a document reads one partition, in order.",
      "With up to 100 editors per file, the busiest document is a small share: here 480 edits a second.",
      "By who typed, opening a document becomes a scan; by time, every edit lands on one key.",
    ],
  ],
  [
    "decision",
    "Why keep accepting edits during a split?",
    [
      "Refusing means people's typing is thrown away or blocked, which they notice at once.",
      "Edits are built to merge, so the two sides can be combined when the network heals.",
      "Here, refusing would fail 27% of requests.",
    ],
  ],
  [
    "tradeoff",
    "Operational transforms or CRDTs?",
    [
      "Operational transforms rewrite each edit against the ones that came first. They need one place to order a document's edits.",
      "CRDTs give every character an identity, so edits merge in any order. Offline editing and splits just work.",
      "CRDTs carry more metadata per edit; transforms carry more server logic. Both are used in real editors.",
    ],
  ],
  [
    "tradeoff",
    "Route every editor of a document to the same server?",
    [
      "Yes for transforms: one server orders the document's edits and broadcasts them.",
      "That server is a hot spot for the busiest documents, and must hand over cleanly if it dies.",
      "Route by document ID with consistent hashing, so adding servers moves few documents.",
    ],
  ],
  [
    "alternative",
    "Could you lock the paragraph someone is typing in?",
    [
      "It's simple, and there's nothing to merge.",
      "But people wait on each other, and a dropped connection leaves a lock behind.",
      "Fine for forms, poor for documents.",
    ],
  ],
  [
    "alternative",
    "Could the last save win?",
    [
      "It's the easiest thing to build.",
      "It silently throws away everyone else's typing since your last save.",
      "That's the one outcome a shared editor must never have.",
    ],
  ],
  [
    "scale",
    "How do live updates reach every editor?",
    [
      "Each editor keeps a live connection (WebSockets) to the server holding the document.",
      "That server broadcasts each edit to the document's other connections.",
      "Millions of open connections need servers built to hold many idle ones cheaply.",
    ],
  ],
  [
    "scale",
    "A document has ten years of edits. How does it still open fast?",
    [
      "Write a snapshot every so often: the document as it stood at some version.",
      "Opening reads the latest snapshot and only the edits after it.",
      "Old edits can move to cheaper storage, kept for history.",
    ],
  ],
  [
    "edge-case",
    "Two people delete the same word at the same moment.",
    [
      "Both edits refer to the same characters, so the second finds them already gone.",
      "Transforms or CRDTs turn the second delete into nothing, not into deleting the next word.",
      "This is exactly the case naive merging gets wrong.",
    ],
  ],
  [
    "edge-case",
    "Someone edits for an hour on a train, offline.",
    [
      "Their edits queue locally, against the version they had.",
      "On reconnect they merge with everything that happened meanwhile.",
      "CRDTs handle this naturally; transforms need the whole hour transformed against the server's history.",
    ],
  ],
  [
    "resilience",
    "The server holding a busy document dies.",
    [
      "Editors reconnect and are routed to a new server for that document.",
      "It loads the latest snapshot and edits from the log, then carries on.",
      "Clients resend any edits the log hadn't confirmed, so nothing typed is lost.",
    ],
  ],
  [
    "resilience",
    "A zone is cut off during a meeting.",
    [
      "Here, the cut-off zone keeps taking about 2,000 edits a second, and nobody's typing is refused.",
      "When it heals, both sides' edits merge.",
      "Everyone sees the same document again within moments.",
    ],
  ],
  [
    "security",
    "Who can see and change a document?",
    [
      "Check permissions when a connection opens, and again on every edit: access can be revoked mid-session.",
      "A viewer's connection must never be able to send edits.",
      "Shared links need their own expiry and permissions.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "Time from an edit to it appearing for others: the number users feel.",
      "Open connections per server, and the busiest documents.",
      "Merge failures and client resyncs, which mean something went wrong.",
    ],
  ],
  [
    "observability",
    "A user says their paragraph vanished. How do you check?",
    [
      "Replay the document's edit log to the time it happened.",
      "See who deleted it, or whether a merge went wrong.",
      "History lets you restore it, which is the first thing to offer them.",
    ],
  ],
])

export const ON_SCHEDULE = deck("on-schedule", [
  [
    "clarify",
    "What would you ask about the jobs?",
    [
      "One-off ('at 9am tomorrow') or recurring ('every hour')? Recurring needs a next run time computed each time.",
      "How precise: to the second, or within a minute?",
      "What does a job do: call a webhook, run code, send an email?",
    ],
    "How does 'to the second' change the design?",
  ],
  [
    "clarify",
    "What would you ask about failures?",
    [
      "If a job fails, retry? How many times, and with what gaps?",
      "If the scheduler was down at 9am, should the 9am job run late, or be skipped?",
      "Must a job never run twice, or is twice acceptable if harmless?",
    ],
  ],
  [
    "clarify",
    "What would you ask about time?",
    [
      "Whose time zone is '9am'? The customer's, and it moves with daylight saving.",
      "What happens to a 2:30am job on the night clocks skip from 2am to 3am?",
      "How many jobs are due at the same moment, like midnight or the top of the hour?",
    ],
  ],
  [
    "product",
    "What do customers care about most?",
    [
      "Their job ran, on time, once.",
      "When it didn't, they can see why, and when it will be retried.",
      "They're told when a job keeps failing, instead of finding out weeks later.",
    ],
  ],
  [
    "decision",
    "How do you find the jobs that are due?",
    [
      "Store each job's next run time, and index it.",
      "Every few seconds, claim the jobs whose time has come: a range read on the index, not a scan.",
      "Claim with a lease, so two schedulers can't both take the same job.",
    ],
  ],
  [
    "decision",
    "Why queue jobs rather than run them in the scheduler?",
    [
      "Running a job means calling someone else's webhook, which can be slow or down.",
      "The queue lets workers run jobs at their own pace, and survives worker restarts.",
      "The scheduler only decides what's due; it never waits on a customer's server.",
    ],
  ],
  [
    "decision",
    "What does each worker need for the chaos round?",
    [
      "Timeouts, so a slow webhook holds a slot for half a second, not five.",
      "Backoff on retries, and a dead-letter queue, so a job that always fails stops coming back.",
      "Alerts on the queue's oldest message, so hung workers are noticed and replaced.",
    ],
  ],
  [
    "tradeoff",
    "Exactly once, or at least once?",
    [
      "A worker can call the webhook and crash before recording it, so the job runs again.",
      "Exactly once isn't possible across someone else's server. At least once, with an idempotency key, is the honest promise.",
      "The customer uses the key to ignore a repeat.",
    ],
  ],
  [
    "tradeoff",
    "Poll a database table, or keep timers in memory?",
    [
      "Polling a time-indexed table is simple, durable and easy to scale out with leases.",
      "A timer wheel in memory fires precisely and cheaply, but must be rebuilt from the table after every restart.",
      "Many schedulers do both: the table is the truth, memory holds the next few minutes.",
    ],
  ],
  [
    "alternative",
    "Could you use the queue's delayed delivery instead?",
    [
      "For one-off jobs a few minutes away, yes: enqueue with a delay.",
      "Queues cap how long a delay can be, and recurring jobs still need their next time computed.",
      "So the table stays the source of truth.",
    ],
  ],
  [
    "alternative",
    "Could one cron process run everything?",
    [
      "For a handful of internal jobs, it's the simplest answer.",
      "For a service, it's a single point of failure, and it can't scale past one machine.",
      "Leases on the job table let many schedulers share the work safely.",
    ],
  ],
  [
    "scale",
    "Half the customers schedule their daily job for midnight.",
    [
      "A huge burst arrives at 00:00, and the queue absorbs it, so jobs run late rather than fail.",
      "Spread it: add jitter to 'daily', or let customers choose a window.",
      "Show customers the expected delay, so 'midnight' doesn't surprise them.",
    ],
  ],
  [
    "scale",
    "A hundred million jobs. What changes?",
    [
      "Partition the job table by next run time and customer, so claiming due jobs spreads across shards.",
      "Each scheduler owns a set of partitions, by lease.",
      "Run history grows fastest: keep recent runs hot, archive the rest.",
    ],
  ],
  [
    "edge-case",
    "The scheduler was down from 8:55 to 9:05. What about the 9:00 jobs?",
    [
      "It's the misfire question, and customers should choose: run late, or skip.",
      "By default most systems run them as soon as they can.",
      "A recurring job shouldn't then run twice to 'catch up' unless asked to.",
    ],
  ],
  [
    "edge-case",
    "A job is set for 2:30am, and tonight the clocks jump from 2am to 3am.",
    [
      "2:30am doesn't exist tonight, so decide: run at 3am, or skip.",
      "In autumn the hour repeats, and a 1:30am job could run twice.",
      "Store schedules in the customer's time zone, and compute each run time in universal time.",
    ],
  ],
  [
    "resilience",
    "A job fails every time it runs.",
    [
      "Retry a few times with backoff, then move it to the dead-letter queue.",
      "Tell the customer, and pause the job's schedule.",
      "Without that, it comes back forever and takes workers away from everyone else's jobs.",
    ],
  ],
  [
    "resilience",
    "Workers hang without crashing.",
    [
      "Health checks pass, so nothing restarts them.",
      "An alert on the age of the queue's oldest message notices the backlog building.",
      "Leases on running jobs let another worker take over when one goes quiet.",
    ],
  ],
  [
    "security",
    "What could go wrong with calling customers' webhooks?",
    [
      "A customer could point a webhook at your own internal addresses: block private networks.",
      "Sign each call, so the customer can check it came from you.",
      "Cap how many calls one customer's jobs make, so one can't swamp the workers.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "How late jobs run compared with their scheduled time: the measure customers feel.",
      "The dead-letter queue's size, and failures by customer.",
      "The age of the queue's oldest message.",
    ],
  ],
  [
    "observability",
    "A customer says their 9am job didn't run. How do you check?",
    [
      "Look up the job's run history: claimed, queued, run, failed, retried?",
      "Check whether it was paused, or set aside in the dead-letter queue.",
      "Check their webhook's responses: often it ran, and their server refused it.",
    ],
  ],
])

export const NEAR_ME = deck("near-me", [
  [
    "clarify",
    "What would you ask about searches?",
    [
      "A fixed radius, or 'the nearest ten'? They need different queries.",
      "Filtered by what: category, rating, open now, price?",
      "Ranked by distance alone, or by a mix of distance and quality?",
    ],
    "How does 'open now' change what you can cache?",
  ],
  [
    "clarify",
    "What would you ask about the places?",
    [
      "How many, and how often do they change? Places change rarely; reviews arrive constantly.",
      "Must an owner's update appear at once, or within minutes?",
      "How dense is the data: a city centre has thousands of places in a few streets.",
    ],
  ],
  [
    "clarify",
    "What would you ask about traffic?",
    [
      "Searches a second at peak, and when: dinner time on Friday.",
      "How concentrated: most searches are in a few hundred city-centre cells.",
      "Is everyone in one country, or spread worldwide?",
    ],
  ],
  [
    "product",
    "What makes nearby search feel good?",
    [
      "Results in well under a second, even on a phone network.",
      "The places shown are actually open and actually close.",
      "Moving the map updates the results smoothly.",
    ],
  ],
  [
    "decision",
    "Why search by map cell rather than by latitude and longitude ranges?",
    [
      "A range on two columns can't use one ordinary index well: here SQL ranges run the primary at 298%.",
      "A geohash turns a location into a short string, and nearby places share a prefix.",
      "A search becomes 'these few cells', which can be indexed and cached.",
    ],
  ],
  [
    "decision",
    "Why also search the neighbouring cells?",
    [
      "A point near a cell's edge is close to places in the next cell.",
      "Searching the cell and its eight neighbours covers the radius.",
      "Then filter by the real distance before ranking.",
    ],
  ],
  [
    "decision",
    "Why cache results per cell?",
    [
      "City centres are a few hundred cells that everyone asks about.",
      "Here the cache answers 22,686 of 30,000 searches a second.",
      "Without it, even ten {search-index} nodes would run at 149%.",
    ],
  ],
  [
    "tradeoff",
    "Geohash cells or a quadtree?",
    [
      "Geohash cells are fixed sizes: simple to compute, store and cache.",
      "A quadtree splits busy areas into smaller cells, so no cell holds too many places.",
      "Many systems use fixed cells for caching and an index that adapts for querying.",
    ],
  ],
  [
    "tradeoff",
    "How long can a cell's results be cached?",
    [
      "Places change rarely, so minutes is usually fine.",
      "But 'open now' changes on the hour: cache opening hours, and check them when ranking.",
      "Purge a cell when one of its places changes, if freshness matters.",
    ],
  ],
  [
    "alternative",
    "Could a database with spatial indexes do this?",
    [
      "Yes, at lower volume: spatial indexes answer 'within this radius' well.",
      "At 30,000 searches a second, a dedicated index and a cache scale further.",
      "Start with the database; move when the numbers demand it.",
    ],
  ],
  [
    "alternative",
    "Could you precompute results for every cell?",
    [
      "For popular cells and common filters, yes: that's the cache, filled ahead of time.",
      "Every cell times every filter is far too many combinations.",
      "Precompute the hot ones; compute the rest on demand.",
    ],
  ],
  [
    "scale",
    "Users worldwide. What changes?",
    [
      "Partition the index by region, so a search in Tokyo never touches Europe's data.",
      "Serve each region from nearby, so users don't wait on an ocean crossing.",
      "Places rarely cross regions, which makes this split clean.",
    ],
  ],
  [
    "scale",
    "One cell in a city centre holds 20,000 places.",
    [
      "Fixed cells are uneven: busy areas need smaller cells.",
      "Use a finer geohash there, or a quadtree that splits until each cell is small.",
      "Ranking still trims the results to the best few.",
    ],
  ],
  [
    "edge-case",
    "Someone searches right on the line where two cells meet.",
    [
      "The nearest place may be in the neighbouring cell, a few metres away.",
      "Always include the neighbours, then sort by true distance.",
      "Geohash prefixes break at some cell boundaries, so check distances, not prefixes.",
    ],
  ],
  [
    "edge-case",
    "A restaurant closes for good. How quickly does it disappear?",
    [
      "The owner's update reaches the index through the stream in seconds.",
      "Cached cells may show it until they expire or are purged.",
      "Purge the affected cell on changes like this.",
    ],
  ],
  [
    "resilience",
    "A cache node restarts on Friday evening.",
    [
      "Its cells fall through to the {search-index} until they're cached again.",
      "With two nodes, only half the cells go cold at once.",
      "Spare index capacity is what absorbs a cold cache at peak.",
    ],
  ],
  [
    "resilience",
    "The search index falls behind on updates.",
    [
      "Searches still work, from slightly older data.",
      "Updates wait in the stream until the index catches up.",
      "Rebuild the index from the database if it's ever lost.",
    ],
  ],
  [
    "security",
    "What could go wrong with a public nearby-search API?",
    [
      "Scrapers walking every cell to copy your whole database: rate-limit and watch for systematic sweeps.",
      "Fake reviews pushing a place up the rankings: tie reviews to verified accounts and look for patterns.",
      "Users' own locations are personal data: don't log precise coordinates longer than needed.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "Search latency at p99, by region.",
      "Cache hit rate, overall and for the busiest cells.",
      "How far the index trails the database.",
    ],
  ],
  [
    "observability",
    "Users in one city say search is slow. Where do you look?",
    [
      "That city's cells: are they cold in the cache, or too crowded?",
      "Index latency for queries in that area.",
      "Whether a recent change made its cells too large.",
    ],
  ],
])

export const TOP_PLAYERS = deck("top-players", [
  [
    "clarify",
    "What would you ask about the leaderboard?",
    [
      "Global, per region, per friends list, or all of them?",
      "A player's best score, latest, or total over the season?",
      "When does the season reset, and what happens to old boards?",
    ],
    "How do friends lists change the design?",
  ],
  [
    "clarify",
    "What would you ask about reads?",
    [
      "Top 100 only, or 'my rank' and the players around me too?",
      "How fresh must ranks be: instant, or within a minute?",
      "How many players are ranked: thousands, or tens of millions?",
    ],
  ],
  [
    "clarify",
    "What would you ask about cheating?",
    [
      "Can the client be trusted to report its own score? Never fully.",
      "Is every game verified, or only scores near the top?",
      "What happens to a cheater's past scores once they're caught?",
    ],
  ],
  [
    "product",
    "What keeps players coming back to the leaderboard?",
    [
      "Seeing their rank move after every game.",
      "Boards they can actually climb: friends and regions, not only the world.",
      "Trust that the top isn't full of cheaters.",
    ],
  ],
  [
    "decision",
    "Why keep the ranking in sorted sets in memory?",
    [
      "A sorted set keeps every entry in order as scores change, and answers 'top 100' or 'my rank' in microseconds.",
      "A database would sort millions of rows for every rank check.",
      "Here two cache nodes take every score and rank check at about 8% busy.",
    ],
  ],
  [
    "decision",
    "If the ranking is in memory, where's the truth?",
    [
      "Each player's best score, stored durably in {nosql}, keyed by player.",
      "If the cache loses its data, the ranking is rebuilt from those bests.",
      "Scores reach the store through a stream, so a slow store never slows a game.",
    ],
  ],
  [
    "decision",
    "Why write only new bests to the store?",
    [
      "Only about one submission in five beats a player's best.",
      "That cuts the store's writes from 15,000 a second to 3,000.",
      "Keep every submission somewhere cheap if anti-cheat needs history.",
    ],
  ],
  [
    "tradeoff",
    "One global sorted set, or many smaller ones?",
    [
      "One set is simplest, and exact.",
      "But it lives on one node, so at tens of millions of players it becomes a hot spot.",
      "Split by score range or region, and merge the tops of each when asked.",
    ],
  ],
  [
    "tradeoff",
    "Exact ranks for everyone, or approximate below the top?",
    [
      "Exact ranks at the top matter, and are cheap.",
      "Far down the board, '1,204,331th' changes every second and means little.",
      "Show a percentile there, like 'top 12%', computed less often.",
    ],
  ],
  [
    "alternative",
    "Could the database just sort scores when asked?",
    [
      "'Order by score, take 100' on millions of rows, for every request, is far too much work.",
      "Here a {sql-primary} would also need to take 15,000 writes a second: five times its limit.",
      "Recomputing every minute works, with ranks a minute stale.",
    ],
  ],
  [
    "alternative",
    "Could you store the ranking under one key in {nosql}?",
    [
      "Then the whole board is one key, on one partition.",
      "It would take 3,000 writes a second, three times what a key allows.",
      "Spread writes by player, and keep the ordering in memory.",
    ],
  ],
  [
    "scale",
    "Ten times the players. What changes?",
    [
      "Split the global set across nodes by score range, and merge the tops.",
      "Stream shards and workers scale out by partition.",
      "Per-region and friends boards stay small however big the game gets.",
    ],
  ],
  [
    "scale",
    "How do you show a friends leaderboard?",
    [
      "Look up the player's friends' best scores and sort that small list.",
      "With a few hundred friends, it's quick on demand.",
      "Cache it briefly; it changes only when a friend plays.",
    ],
  ],
  [
    "edge-case",
    "Two players have exactly the same score.",
    [
      "Decide the tie-break: earlier score first is the usual rule.",
      "Fold it into the sorted value, for example the score plus a fraction for time.",
      "Otherwise ranks flicker between them.",
    ],
  ],
  [
    "edge-case",
    "The season ends at midnight. A game finishes at 00:00:03.",
    [
      "Decide by when the game ended, not when the score arrived.",
      "Freeze the board at the deadline, then accept late scores for a short grace period.",
      "Publish final ranks only after the grace period.",
    ],
  ],
  [
    "resilience",
    "A cache node holding the ranking dies.",
    [
      "Its replica takes over, so ranks keep working.",
      "If both are lost, rebuild the sorted set from every player's stored best.",
      "Rebuilding millions of entries takes minutes: show the last snapshot until it's done.",
    ],
  ],
  [
    "resilience",
    "The season's last hour brings 1.5 times the traffic.",
    [
      "App servers and stream shards have the headroom: they rise to 75%.",
      "The store falls a little behind on bests and catches up after, since it's behind the stream.",
      "Ranks stay instant, because they come from memory.",
    ],
  ],
  [
    "security",
    "How do you keep cheaters off the board?",
    [
      "Never trust the client's score: verify games on the server, or check replays for scores near the top.",
      "Flag impossible scores and sudden jumps for review.",
      "Rate-limit submissions per player, so nobody can submit thousands of games a minute.",
    ],
  ],
  [
    "observability",
    "What do you watch?",
    [
      "Rank-check latency, and the cache's memory as the board grows.",
      "How far the stored bests trail the ranking.",
      "Scores flagged as suspicious, per hour.",
    ],
  ],
  [
    "observability",
    "A player says their rank didn't change after a high score. How do you check?",
    [
      "Look up their score in the sorted set, and their stored best.",
      "Check whether the score was flagged and held for review.",
      "Check the stream's lag, in case it was just late.",
    ],
  ],
])
