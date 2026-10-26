/**
 * Schema and API questions: what the tables, keys and endpoints should look
 * like, for the scenarios where that's part of the answer. Interviewers ask
 * "what's the key?" and "what does the endpoint return?" as often as "draw
 * it", and the board never asks either.
 *
 * Multiple choice, a point each the first time it's right, and outside the
 * check that unlocks a solution. Wrong options are the mistakes people make,
 * at the same level of detail as the right one, and the options are
 * shuffled on screen.
 */
export type SchemaQuestion = {
  prompt: string
  correct: string
  wrong: [string, string, string]
  why: string
}

type Row = [
  prompt: string,
  correct: string,
  wrong: [string, string, string],
  why: string,
]

const s = (rows: Row[]): SchemaQuestion[] =>
  rows.map(([prompt, correct, wrong, why]) => ({ prompt, correct, wrong, why }))

export const SCHEMA: Record<string, SchemaQuestion[]> = {
  "fleet-tracker": s([
    [
      "What's the shard key on a van's position update?",
      "The courier's ID, plus the van's ID for the few big couriers",
      [
        "The van's ID alone, for every courier",
        "The time the update was sent",
        "An ID generated for each update, so no two updates ever collide",
      ],
      "Small couriers stay on one shard; the giants spread out by van. A key generated per update would scatter every read.",
    ],
    [
      "What does the lookup table that routes the giants hold?",
      "One row per big courier: its ID, and that it's split by van",
      [
        "Every van's ID across all couriers, and the shard each one lives on",
        "Every delivery's ID and its shard",
        "A copy of each courier's dispatch board",
      ],
      "Only the exceptions are listed, so it stays tiny and every {app-server} can keep it in memory.",
    ],
    [
      "Which request does a dispatch board make?",
      "GET /couriers/me/vans?updatedSince=…, scoped by the signed-in session",
      [
        "GET /vans?courier=:id, with the courier taken from the request",
        "GET /vans, filtered on the dispatcher's screen",
        "POST /vans/search with every van's ID and the courier's ID in the body",
      ],
      "The session decides the courier, so nobody can ask for a competitor's vans. updatedSince keeps each refresh small.",
    ],
  ]),
  "feed-the-analysts": s([
    [
      "What does an order-placed event carry?",
      "The order's ID, its items and totals, and when it was placed",
      [
        "Only the order's ID, so each consumer looks up the rest",
        "The whole customer record and every order they've made",
        "The SQL statement checkout ran, for consumers to replay",
      ],
      "Enough for the search index and the warehouse to do their job without calling back into the {sql-primary} 1,600 times a second each.",
    ],
    [
      "How should the warehouse hold orders for finance's reports?",
      "One wide row per order line, with the date to filter on",
      [
        "The same tables as checkout, joined when a report runs",
        "One document per customer, with their orders inside",
        "One row per page view, with the order added later",
      ],
      "Reports scan millions of lines by date and add them up. Wide rows with everything a report needs, stored by column, make that fast without joins.",
    ],
    [
      "After a retry, the warehouse gets the same event twice. What stops a double count?",
      "Keying each row by the event's ID, so a repeat overwrites it",
      [
        "Trusting the stream to deliver each event exactly once",
        "Adding the time it arrived to each row as it lands",
        "A monthly job that removes duplicates by hand",
      ],
      "Streams deliver at least once. A row keyed by the event's ID makes the second delivery a no-op.",
    ],
  ]),
  "plug-finder": s([
    [
      "How are chargers found near the driver?",
      "A geospatial index on each station's coordinates",
      [
        "A table scan for stations within a few miles",
        "A text search on the name of the nearest town",
        "Stations sorted by latitude, then filtered",
      ],
      "A geospatial index answers 'what's inside this box' without touching the other quarter-million stations.",
    ],
    [
      "Where does a charger's live 'in use' status live?",
      "In the {nosql} store, keyed by station and port",
      [
        "In the {search-index}, rewritten on every map view",
        "In the {data-warehouse}, on each station's row",
        "On the phone of whoever marked it in use",
      ],
      "Status changes every few minutes and is read by key. The search index gets a status-changed event to stay roughly in step.",
    ],
    [
      "Which request does the map make as the driver pans?",
      "GET /stations?bbox=… with the corners rounded to a grid",
      [
        "POST /stations/search with the driver's whole route",
        "GET /stations, then filter on the phone",
        "GET /stations/:id once for every pin on the screen",
      ],
      "Rounded corners mean nearby drivers ask the exact same question, so the {cdn} can answer from its cache. A POST is never cached.",
    ],
  ]),
  "first-customers": s([
    [
      "Agents open a list of a team's open tickets, newest activity first. What makes that fast?",
      "An index on team, status and last update",
      [
        "A separate table for each status",
        "A full-text index on every reply",
        "Sorting all tickets in the app server",
      ],
      "With that index the database reads just the open tickets, already in order. A table per status means moving rows every time one changes.",
    ],
    [
      "Where do a ticket's replies go?",
      "A replies table, each row holding its ticket's ID",
      [
        "A text column on the ticket, appended to each time",
        "A new table created for each ticket",
        "A list stored on the customer's account row",
      ],
      "One row per reply keeps each one small, ordered by time and easy to page through. A column that grows forever gets slower to read and write.",
    ],
    [
      "An agent closes a ticket. Which request?",
      "PATCH /tickets/:id with the new status",
      [
        "POST /tickets with the whole ticket again",
        "GET /tickets/:id?status=closed",
        "DELETE /tickets/:id, then create it again",
      ],
      "PATCH changes just the fields it sends. A GET must never change anything: caches and link previews send GET requests freely.",
    ],
  ]),
  "bad-migration": s([
    [
      "You need to rename a column of results. What's the safe order?",
      "Add the new one, copy across, switch reads, then drop the old",
      [
        "Rename it in place, during a quiet hour",
        "Drop it, then add it back under the new name",
        "Rename it on the standby first, then fail over",
      ],
      "Each step can be undone, and old and new code both work in between. A rename in place breaks every running server that still uses the old name.",
    ],
    [
      "A migration will drop a column. What has to exist first, for a 15-minute promise?",
      "Point-in-time recovery, so a restore stops just before it",
      [
        "A second standby in another zone",
        "A read replica the migration skips",
        "Last night's daily backup",
      ],
      "Standbys and replicas copy the drop straight away. Last night's backup loses a day. Point-in-time recovery replays the log up to the minute before.",
    ],
    [
      "The code stops using a column. When is it dropped?",
      "In a later release, once nothing reads or writes it",
      [
        "In the same release that stops using it",
        "Before the release that stops using it",
        "Never: dropping columns is too risky",
      ],
      "In a rolling deploy, old servers still run for a while. Dropping in the same release breaks them mid-deploy; dropping first breaks them all.",
    ],
  ]),
  "top-players": s([
    [
      "What's the durable store's key?",
      "Player ID, holding their best score and when",
      [
        "The leaderboard's name, holding every score",
        "The score, holding the player's ID",
        "The game's ID, holding its result",
      ],
      "Keyed by player, writes spread evenly. The ordering lives in memory.",
    ],
    [
      "What does the sorted set's value need, besides the score?",
      "A tie-break folded in, such as when it was set",
      [
        "The player's full profile",
        "Every game the player has played",
        "Nothing: equal scores share a rank",
      ],
      "With the time folded in, equal scores always come out in the same order.",
    ],
    [
      "Which request gives a player their rank and neighbours?",
      "GET /boards/:season/me?around=5",
      [
        "GET /boards/:season, then search the list",
        "POST /boards/:season with every score",
        "GET /players/:id/scores, sorted on the phone",
      ],
      "The server reads a small range around the player's position in the sorted set.",
    ],
  ]),
  "near-me": s([
    [
      "How should a place's location be indexed for nearby search?",
      "By its geohash, so nearby places share a prefix",
      [
        "By latitude, with longitude in a second index",
        "By the place's street address",
        "By the place's name, then its city",
      ],
      "A prefix match finds a cell's places in one index range; then filter by real distance.",
    ],
    [
      "What's the cache key for a cell's results?",
      "The cell's geohash, plus the category filter",
      [
        "The user's exact coordinates",
        "The user's ID and the time",
        "A hash of the whole request",
      ],
      "Exact coordinates make every search unique. Cells plus common filters are shared by thousands of users.",
    ],
    [
      "What should the search request look like?",
      "GET /places?lat=…&lng=…&radius=1km&type=pizza",
      [
        "POST /places with every visible place's ID",
        "GET /places/:city with every place in the city",
        "GET /places?cell=… with the client choosing the cell",
      ],
      "The server maps the point to cells, so it can change cell sizes without breaking clients.",
    ],
  ]),
  "on-schedule": s([
    [
      "What does the scheduler index to find due jobs?",
      "Each job's next run time",
      [
        "Each job's creation time",
        "The customer's ID alone",
        "The webhook's address",
      ],
      "'Due now' becomes a range read on the index, not a scan of every job.",
    ],
    [
      "How does a scheduler claim a job so no other scheduler takes it?",
      "Set an owner and a lease expiry, only if unclaimed",
      [
        "Read it, then mark it if it looked free",
        "Delete it from the table while it runs",
        "Lock the whole table for each claim",
      ],
      "A conditional update makes the claim atomic; the expiry lets another scheduler take over if this one dies.",
    ],
    [
      "How are a job's runs recorded?",
      "One row per run, keyed by job and scheduled time",
      [
        "Only the latest run, overwritten each time",
        "A counter of how many times it ran",
        "Nothing: the webhook's response is enough",
      ],
      "The key doubles as the idempotency key, and history answers 'did my 9am job run?'.",
    ],
  ]),
  "shared-doc": s([
    [
      "What's the key of an edit in the log?",
      "Document ID, then its sequence number",
      [
        "The editor's user ID, then the time",
        "The time alone, across all documents",
        "A random ID, with the document inside",
      ],
      "Opening reads one document's edits in order; the sequence number makes 'edits since N' a range read.",
    ],
    [
      "What does each edit need to carry?",
      "The version it was made against, and who made it",
      [
        "The whole document after the change",
        "Only the new text, with nothing else",
        "Every other editor's cursor position",
      ],
      "The base version lets the server transform or merge it; the author gives history and permissions.",
    ],
    [
      "Where should cursor positions and 'who's here' live?",
      "In memory, with a short expiry, never in the log",
      [
        "In the edit log, alongside every edit",
        "In the snapshot, saved every few minutes",
        "In a database row updated on each keystroke",
      ],
      "Presence changes constantly and is worthless seconds later: keep it ephemeral.",
    ],
  ]),
  "click-counter": s([
    [
      "What's the key of the counts table?",
      "Ad ID, then the minute",
      [
        "The minute alone, holding every ad's count",
        "The click's own ID",
        "The advertiser's ID alone",
      ],
      "Dashboards read one ad's minutes, and keying by ad spreads the writes across ads.",
    ],
    [
      "What does a raw click event need?",
      "A click ID, the ad, when it happened, and who clicked",
      [
        "Only the ad's ID, to keep events small",
        "The advertiser's running total so far",
        "The page the visitor came from, and nothing else",
      ],
      "The ID removes duplicates, the time puts it in a window, and the clicker lets fraud filters work.",
    ],
    [
      "What should the click link look like?",
      "GET /c/:id with a signed ID, redirecting at once",
      [
        "POST /clicks with the ad in the body, then a page",
        "GET /c?ad=…&price=… so it's easy to read",
        "A script that records the click, then navigates",
      ],
      "A short signed ID can't be forged or edited, and a redirect works anywhere a link does.",
    ],
  ]),
  "short-links": s([
    [
      "What's the key of the links table?",
      "The short code, pointing at the long URL",
      [
        "The long URL, pointing at the short code",
        "A numeric ID, with the code in another table",
        "The creator's user ID, with their codes in a list",
      ],
      "Every click looks a link up by its code, so the code is the key. Keep the long URL, owner and creation time alongside it.",
    ],
    [
      "How do you make short codes so two servers never hand out the same one?",
      "Each server takes a range of IDs and writes them in base 62",
      [
        "Pick seven random characters each time, and simply hope they never collide",
        "Hash the long URL and keep its first seven characters",
        "Ask the database for the highest code and add one",
      ],
      "A range needs no coordination per link. A truncated hash collides, random codes need a uniqueness check, and 'highest plus one' races.",
    ],
    [
      "What should a click on a short link return?",
      "A redirect, with the long URL in its Location header",
      [
        "A small document containing the long URL, which the app then opens itself",
        "The long page itself, fetched by your server",
        "A normal page whose script sends the browser on",
      ],
      "301 lets browsers cache it, so later clicks skip you; 302 sends every click through you, so you can count them.",
    ],
    [
      "Which endpoint should create a link?",
      "POST /links with the long URL, answering with the code",
      [
        "GET /links?url=… so the answer can be cached",
        "PUT /links/:url with the long URL as the path, returning a new code",
        "POST /redirect with a code the client invented",
      ],
      "Creating something is a POST. It isn't safe to repeat, so accept an idempotency key if clients retry.",
    ],
  ]),
  "group-chat": s([
    [
      "How should messages be keyed?",
      "By conversation, then by a sequence number",
      [
        "By sender, then by the time they sent it",
        "By message ID alone, sorted by the client when it loads a chat",
        "By recipient, with one copy per member",
      ],
      "Opening a chat reads its latest messages in order: one partition, one range. A copy per recipient multiplies every write by the group's size.",
    ],
    [
      "A phone reconnects after an hour. How does it fetch what it missed?",
      "Ask for messages after the last sequence number it has",
      [
        "Download every message from the last 24 hours",
        "Wait for the server to push whatever it buffered",
        "Fetch the whole conversation again, then remove any duplicates on the phone",
      ],
      "A sequence number per conversation makes 'since N' an exact, cheap range read.",
    ],
    [
      "How do you store how far each member has read?",
      "One row per member and chat, with the last sequence read",
      [
        "A read flag stored on every message, one for every member of the chat",
        "A list of readers kept on each message",
        "Recomputed from delivery receipts on every load",
      ],
      "One small row per member, updated as they read, instead of a write per message per member.",
    ],
  ]),
  "home-timeline": s([
    [
      "How is the follow graph stored, so fan-out can find a post's readers?",
      "Followers listed by author, one row per follower",
      [
        "Followed accounts listed by follower, only",
        "One row per pair, with no index at all",
        "Inside each user's profile document, as a list of the accounts they follow",
      ],
      "Fan-out asks 'who follows this author?'. Keep the other direction too, for 'who do I follow?'.",
    ],
    [
      "Which request loads the timeline's next page?",
      "GET /timeline?cursor=<last post ID>",
      [
        "GET /timeline?page=3",
        "GET /timeline?offset=60",
        "POST /timeline with every post ID already seen",
      ],
      "A cursor stays right while new posts arrive at the top. Page numbers and offsets shift, so posts repeat or get skipped.",
    ],
    [
      "Where does a post's text live?",
      "Once, in a posts store keyed by post ID",
      [
        "Copied in full into every follower's stored timeline",
        "In the author's own timeline only",
        "In the cache, with nothing behind it",
      ],
      "Timelines hold IDs and text is fetched by ID, so an edit or a delete changes one row.",
    ],
  ]),
  "ticket-drop": s([
    [
      "How do you make a seat impossible to sell twice?",
      "One conditional update: hold it only where it's still free",
      [
        "Read the seat first, then write the hold if it looked free when read",
        "Lock the event's whole table for the sale",
        "Let the cache decide, then copy the result across",
      ],
      "The check and the write happen in one statement, so two fans can't both win. Read-then-write races.",
    ],
    [
      "What does a hold need to record, besides the seat?",
      "Who holds it, and when the hold expires",
      [
        "The fan's full card details",
        "A copy of the whole seat map at the moment the hold was made",
        "How many fans were waiting at the time",
      ],
      "The expiry returns abandoned seats to sale; the holder lets payment confirm the right person.",
    ],
    [
      "How does the waiting room tell a fan where they are in line?",
      "A signed token with their place, checked as they poll",
      [
        "A request held open by the server until a seat becomes theirs",
        "A new account created for each fan in line",
        "A page that reloads itself every second",
      ],
      "A token survives refreshes and is cheap to check. Requests held open tie up servers by the thousand.",
    ],
  ]),
  "ride-hailing": s([
    [
      "How are drivers' latest positions stored for 'nearest drivers'?",
      "By map cell, each listing the drivers inside it",
      [
        "By driver ID only, with every driver scanned for each new request",
        "By the time of each driver's last ping",
        "In the warehouse, queried for each rider",
      ],
      "A lookup reads the rider's cell and its neighbours. A grid or geohash turns each cell into a key.",
    ],
    [
      "A driver pings every four seconds. What gets written?",
      "Their one current position, overwritten",
      [
        "A new row appended to the trip table",
        "An update to every nearby rider's screen",
        "A row inserted straight into the warehouse",
      ],
      "Only the latest position matters for matching. The history goes through the stream to the warehouse.",
    ],
    [
      "How should a trip's progress be modelled?",
      "One trip row whose status only moves forward",
      [
        "A status on the driver, overwritten each trip",
        "A separate table for each stage of the trip",
        "A status kept only on the rider's phone",
      ],
      "Requested, accepted, arrived, finished. A conditional update stops two drivers accepting the same trip.",
    ],
  ]),
  typeahead: s([
    [
      "How are suggestions keyed?",
      "By prefix and language, holding the top ten",
      [
        "By full query, holding how often it's searched",
        "By user, holding their search history",
        "By first letter, holding every query",
      ],
      "Serving is one lookup per keystroke. The counts live in the warehouse and are rebuilt into this.",
    ],
    [
      "What should the suggestions request look like?",
      "GET /suggest?q=piz, cacheable for a minute",
      [
        "POST /suggest with the prefix in the body",
        "GET /suggest?q=piz&user=42 on every call",
        "A live connection streaming every keystroke",
      ],
      "A GET carrying only the prefix can be cached at the edge and in browsers. A user parameter makes every answer unique.",
    ],
  ]),
  "push-alerts": s([
    [
      "What should a device-token row hold?",
      "The user, token, platform and when it last worked",
      [
        "Just the token, with nothing else",
        "The user's whole notification history, newest first, for the inbox",
        "The phone's model and screen size",
      ],
      "The platform picks the provider, and 'last worked' lets you clear out dead tokens.",
    ],
    [
      "How do you stop a retried send from notifying someone twice?",
      "Check a notification ID before sending, mark it after",
      [
        "Put the current time on each send",
        "Never retry a send that failed",
        "Delete the message from the queue before sending, so nobody else takes it",
      ],
      "A redelivered message finds the ID already marked sent and stops. A collapse key lets the phone show one if two slip through.",
    ],
    [
      "Other services want a notification sent. What do they call?",
      "POST /notifications with user, kind and an idempotency key",
      [
        "GET /notify?user=…&text=…",
        "The push provider directly, from each service that wants to notify someone",
        "PUT /users/:id/phone with the message",
      ],
      "One endpoint owns preferences, quiet hours and retries, and the key makes a retried request safe.",
    ],
  ]),
  "web-crawler": s([
    [
      "What's the key of the seen set?",
      "A hash of the normalised URL",
      [
        "The URL exactly as found",
        "The page's title",
        "The domain of the site it came from",
      ],
      "Normalising first makes variants match, and a fixed-size hash keeps keys small and evenly spread.",
    ],
    [
      "What does each URL's record hold?",
      "When it was fetched, its status, a content hash and the next visit",
      [
        "The page's full text and every image on it, so it can be served again later",
        "Every link on the web that points to it",
        "Only whether it has been seen before",
      ],
      "Enough to schedule revisits and skip unchanged pages. The pages themselves live in object storage.",
    ],
    [
      "How is the frontier partitioned?",
      "By site, so one place paces each site",
      [
        "By URL hash, spread at random",
        "By the time each URL was first found on a page",
        "By the expected size of the page",
      ],
      "Politeness is per site. Grouping a site's URLs lets one place hand them out slowly.",
    ],
  ]),
  "pay-button": s([
    [
      "How is a payment stored in double entry?",
      "A payment row, plus entries that sum to zero",
      [
        "A balance column updated in place",
        "One row per payment, with a positive or negative amount on it",
        "Entries for the shopper's side only",
      ],
      "Each movement takes from one account and adds to another. Balances are sums of entries, so they can always be checked.",
    ],
    [
      "Where is a payment's idempotency key kept?",
      "On the payment, unique, alongside its result",
      [
        "In the shopper's browser only",
        "In a cache that forgets it after a minute, to keep lookups fast",
        "In the payment provider's dashboard",
      ],
      "A unique constraint means a repeat finds the original. Keep it as long as clients might retry.",
    ],
    [
      "How should the client create a payment?",
      "POST /payments with an Idempotency-Key header",
      [
        "GET /pay?amount=…&card=…",
        "POST /payments, with a fresh key on each retry",
        "PUT /balances/:id with the new balance",
      ],
      "The same key on every retry returns the first result. Never put card details in a URL: URLs end up in logs.",
    ],
    [
      "What type should a payment's amount be?",
      "Whole minor units (cents), plus a currency",
      [
        "A floating-point number of dollars, rounded to two places",
        "A string, parsed when it's needed",
        "A float, rounded when it's displayed",
      ],
      "Floating point can't hold most decimal amounts exactly, so totals drift. Store cents as integers, with the currency code.",
    ],
  ]),
  "fair-share": s([
    [
      "What does the cache hold for each key's token bucket?",
      "Tokens left, and when it was last refilled",
      [
        "The time of every request it has ever made, kept forever",
        "A database row for every request",
        "One counter shared by every key",
      ],
      "Two small values per key: refill from the time since, take a token, all in one atomic step.",
    ],
    [
      "What should a refused request get back?",
      "429, with how long to wait and what's left",
      [
        "403, with no explanation",
        "200, with an empty body",
        "503, as if the service were down, so the client backs off",
      ],
      "429 Too Many Requests, a Retry-After header and remaining-quota headers tell a client exactly what to do.",
    ],
    [
      "Where should each customer's limit be stored?",
      "With their API key's plan, cached on the servers",
      [
        "Written into every server's code",
        "Inside the customer's own app",
        "Sent by the client in a header on every request it makes",
      ],
      "Plans change without a deploy, and caching them keeps the check off the database.",
    ],
  ]),
  "save-game": s([
    [
      "What's the key of a player's save?",
      "Player ID, with a version number on the save",
      [
        "The device's ID",
        "The player's name",
        "The time the save was made, to the second",
      ],
      "Every request names the player, and the version decides which save wins when copies meet.",
    ],
    [
      "How do you stop an old phone overwriting a newer save?",
      "Write only if the save's version is newer",
      [
        "Always overwrite: whichever write arrives last simply wins",
        "Merge every field from both saves",
        "Refuse saves from older app versions",
      ],
      "A conditional write on the version turns away stale saves.",
    ],
    [
      "Where should today's event settings live?",
      "One key, cached, with the date in its version",
      [
        "Copied into every player's save",
        "In the app's code, changed with each release",
        "One key per player, rewritten for everyone at midnight each day",
      ],
      "It's the same for everyone: one key, served from the cache.",
    ],
  ]),
  "sync-folder": s([
    [
      "What is a file version made of?",
      "An ordered list of its chunk hashes, by position",
      [
        "The file's bytes, stored in the database",
        "Its path and size, and nothing else",
        "A diff against the previous version",
      ],
      "Chunks live in the object store by hash, and a version just lists them, so unchanged chunks are shared.",
    ],
    [
      "What does a device send before uploading a changed file?",
      "Its chunk hashes, to learn which are missing",
      [
        "The whole file first, so the server can compare it byte by byte",
        "A full listing of its folder",
        "Nothing: it uploads every chunk",
      ],
      "The server answers with signed links for the missing chunks only, so duplicates never upload.",
    ],
    [
      "How does a commit avoid overwriting someone else's change?",
      "It names the version it was based on",
      [
        "It carries the latest timestamp",
        "It locks the folder for everyone else while it's uploading",
        "It deletes the old version first",
      ],
      "If that base isn't the latest any more, the commit is a conflict, and both copies are kept.",
    ],
  ]),
  "step-counter": s([
    [
      "What's the key for one day's steps?",
      "User ID first, then the date",
      [
        "The date alone, holding every user",
        "A random ID for each sync",
        "The wristband's serial number",
      ],
      "Every read is 'this user, these days': one partition, a range of dates.",
    ],
    [
      "A wristband re-sends a sync after a timeout. What keeps the count right?",
      "Writing the day's total, not an increment",
      [
        "Adding the synced steps to the stored total",
        "Ignoring every sync after the day's first",
        "Locking the user's row for the whole day",
      ],
      "Writing the same total twice changes nothing. An increment applied twice counts double.",
    ],
    [
      "Which question does this key make expensive?",
      "Everyone's steps on one day",
      [
        "One user's steps this week",
        "One user's steps today",
        "One user's best day this month",
      ],
      "Keyed by user, a whole-day report touches every partition. Build reports like that in the warehouse.",
    ],
  ]),
  "balance-sheet": s([
    [
      "A transfer moves money between two accounts. How is it written?",
      "Both entries, inside a single transaction",
      [
        "The debit now, the credit in a background job",
        "The credit first, then the debit if it worked",
        "A single entry on the sender's account",
      ],
      "Atomic: neither half can happen alone, and the two entries sum to zero.",
    ],
    [
      "How do you stop a balance going negative when transfers run at once?",
      "Check and debit in one conditional statement",
      [
        "Read the balance first, then debit it if there's enough money",
        "Allow it, and fix overdrafts every night",
        "Keep balances in a cache and check there",
      ],
      "A conditional update, or a row lock, makes the check and the debit one step. Read-then-write races.",
    ],
  ]),
  worldwide: s([
    [
      "What does each record need so two regions' edits can be merged?",
      "A version, and the region and time it was written",
      [
        "Nothing: the later arrival wins",
        "A lock held by the writing region",
        "The full history of every edit",
      ],
      "Copies compare versions when they sync, and apply one rule everywhere, so both end up the same.",
    ],
    [
      "Where should a username's uniqueness be checked?",
      "In one place for the world, strongly consistent",
      [
        "In each region's own copy",
        "In the user's browser before sending",
        "In whichever region is fastest",
      ],
      "Local writes would hand one name to two people. Claims are rare enough to pay the ocean once.",
    ],
  ]),
  "claim-your-name": s([
    [
      "How is a username kept unique across shards?",
      "Shard by the name itself, with a unique key",
      [
        "Shard by user ID, and check every shard for the name before inserting",
        "Check the cache first, then insert",
        "Lowercase it, but only on display",
      ],
      "Each name then lives on exactly one shard, and that shard's unique constraint is enough.",
    ],
    [
      "Which form of the name should the unique key use?",
      "A normalised form: lowercased, look-alikes folded",
      [
        "Exactly what the user typed",
        "The name with its spaces removed",
        "Only its first eight characters, lowercased and trimmed",
      ],
      "Otherwise 'Tim' and 'tim', or a look-alike letter from another alphabet, become two people.",
    ],
  ]),
  "like-storm": s([
    [
      "How do you store likes so 'have I liked this?' is cheap?",
      "One row per user and post, keyed by both",
      [
        "A list of likers inside each post",
        "A count only, with no record of who",
        "One row per like, keyed by the time it happened, nothing more",
      ],
      "A lookup by user and post answers it directly and stops double likes. Counts are kept separately.",
    ],
    [
      "How is the hot post's like count stored?",
      "Ten counters under suffixed keys, summed and cached",
      [
        "One counter row that every like updates",
        "Recounted from every like on each view",
        "Kept in each app server's own memory, and added up every minute",
      ],
      "Salting spreads the writes, and a cached total keeps reads cheap.",
    ],
  ]),
  "tenant-split": s([
    [
      "Which column must every table carry?",
      "The company ID, in every query",
      [
        "The created date",
        "The task's title",
        "The email address of whoever created the row",
      ],
      "It's the partition key and a safety net: a query without it could read another company's data.",
    ],
    [
      "Where does 'open this company's task list' go?",
      "To the one shard its company ID names",
      [
        "To every shard at once, with the results merged",
        "To the newest shard",
        "To a replica of every shard",
      ],
      "Every request names the company, so routing is a lookup.",
    ],
  ]),
  "full-basket": s([
    [
      "How should a basket be stored so two sides of a split merge cleanly?",
      "Adds and removals per item, merged item by item",
      [
        "One list of items, overwritten on every change by whichever device saves",
        "The basket's total price only",
        "Only the most recent action",
      ],
      "Per-item changes merge without losing either side's adds. A removal needs a marker, so the item doesn't come back.",
    ],
    [
      "How should 'add to basket' be called?",
      "POST /basket/items with the item and quantity",
      [
        "PUT /basket with the whole basket, sent again after each change",
        "GET /basket/add?item=…",
        "DELETE /basket, then add everything back",
      ],
      "Sending one change rather than the whole basket merges cleanly when two devices edit at once.",
    ],
  ]),
  "video-night": s([
    [
      "How is a video stored for streaming?",
      "Short segments per resolution, plus a playlist",
      [
        "One file per video, sent whole to each viewer who presses play",
        "One database row per frame",
        "Only the original upload",
      ],
      "Players fetch the playlist, then a few seconds of the right resolution at a time, switching as bandwidth changes.",
    ],
    [
      "What's in a video's metadata row?",
      "Title, owner, status and where each resolution lives",
      [
        "The video's bytes, compressed",
        "Every viewer's position in it, updated every few seconds while they watch",
        "Just the original file's name",
      ],
      "Status (uploading, transcoding, live) decides whether it can play. The bytes stay in the object store.",
    ],
  ]),
  "shoebox-receipts": s([
    [
      "What's stored for a photographed receipt before it's been read?",
      "A row with status 'reading' and the photo's key",
      [
        "Nothing, until reading finishes",
        "The photo itself, stored as a column in the database",
        "A guessed total, corrected later",
      ],
      "The user sees it straight away as pending, and the worker fills in the fields when the provider answers.",
    ],
    [
      "How do you avoid paying to read the same photo twice?",
      "Hash the image, and skip hashes already read",
      [
        "Retry each photo at most once a day",
        "Shrink every photo to a smaller size before sending it off",
        "Ask the user to confirm every upload",
      ],
      "At a cent a page, duplicate uploads add up. The image's hash finds them.",
    ],
  ]),
}
