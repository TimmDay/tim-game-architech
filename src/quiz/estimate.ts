/**
 * Estimation: the back-of-envelope step an interview opens with. Business
 * numbers in, requests a second, storage and machines out, worked through
 * before anything is drawn. A few cards per interview classic, mixing
 * multiple choice with prompts to work out loud.
 *
 * The inputs are round, made-up figures chosen so the answers land on each
 * level's own numbers: a peak worked out here is the peak its brief gives.
 * Rules of thumb match the Fundamentals estimation deck: about 86,400
 * seconds a day, peak a few times the average.
 *
 * A point each, the first time: a choice answered right, or a prompt's
 * working revealed. Wrong options are the usual slips (forgetting the peak,
 * dividing by an hour instead of a day, bits for bytes), and the options
 * are shuffled on screen.
 */
export type EstimateCard =
  | {
      kind: "mc"
      prompt: string
      correct: string
      wrong: [string, string, string]
      why: string
    }
  | { kind: "talk"; prompt: string; points: string[]; followUp?: string }

const mc = (
  prompt: string,
  correct: string,
  wrong: [string, string, string],
  why: string,
): EstimateCard => ({ kind: "mc", prompt, correct, wrong, why })

const talk = (
  prompt: string,
  points: string[],
  followUp?: string,
): EstimateCard => ({ kind: "talk", prompt, points, followUp })

export const ESTIMATES: Record<string, EstimateCard[]> = {
  "short-links": [
    mc(
      "Say links are clicked 600 million times a day, and peak is about three times the average. What peak should you design for?",
      "About 20,000 clicks a second",
      [
        "About 7,000 clicks a second",
        "About 500,000 clicks a second",
        "About 2,000 clicks a second",
      ],
      "600 million ÷ 86,400 seconds is about 7,000 a second on average; three times that is about 21,000. That's this level's 20,000. Dividing by 3,600 (an hour) instead gives 500,000.",
    ),
    mc(
      "New links arrive at 400 a second at peak, about a third of that on average, and each is about 500 bytes. How much storage a year?",
      "About 2 TB a year",
      ["About 6 TB a year", "About 20 GB a year", "About 200 TB a year"],
      "About 130 a second × 86,400 × 365 is about 4 billion links; × 500 bytes is about 2 TB. Using the peak rate all day long gives 6 TB. Either way, it fits one database.",
    ),
    talk(
      "How long do the short codes need to be?",
      [
        "About 4 billion new links a year; plan for ten years, so about 40 billion.",
        "With a-z, A-Z and 0-9 (base 62), six characters give about 57 billion codes and seven give 3.5 trillion.",
        "Seven characters leaves room to grow, and makes random codes hard to guess.",
      ],
      "How do you hand out codes without two servers picking the same one?",
    ),
  ],
  "group-chat": [
    mc(
      "Say 15 million daily users each send 10 messages a day, and peak is about three times the average. How many messages a second at peak?",
      "About 5,000 a second",
      [
        "About 1,700 a second",
        "About 125,000 a second",
        "About 50,000 a second",
      ],
      "150 million ÷ 86,400 is about 1,700 a second on average; three times that is about 5,200. That's this level's 5,000 writes, well past the 3,000 a {sql-primary} takes.",
    ),
    mc(
      "Each stored message is about 200 bytes with its IDs and timestamp. At an average of 1,700 messages a second, how much storage a year?",
      "About 10 TB a year",
      ["About 30 TB a year", "About 100 GB a year", "About 1 PB a year"],
      "1,700 × 86,400 is about 150 million a day, or 54 billion a year; × 200 bytes is about 11 TB. Using the peak rate all day gives about 30 TB.",
    ),
    talk(
      "5,000 writes a second, and a {sql-primary} takes about 3,000. What does that tell you before you draw anything?",
      [
        "It's past what one primary can write, and more instances only add standbys: you need a store that partitions writes, like {nosql}.",
        "At about 1,000 writes a second per block, seven blocks take 5,000 at about 71%.",
        "Ask about growth too: if it doubles, capacity must grow without moving data by hand.",
      ],
      "What key would you partition messages by, and why?",
    ),
  ],
  "home-timeline": [
    mc(
      "Say 100 million daily users each open their timeline 7 times a day, and peak is about three times the average. How many timeline loads a second at peak?",
      "About 25,000 a second",
      [
        "About 8,000 a second",
        "About 600,000 a second",
        "About 2,500 a second",
      ],
      "700 million ÷ 86,400 is about 8,100 a second on average; three times that is about 24,000. That's this level's 24,250 loads.",
    ),
    mc(
      "750 posts a second, and the average poster has 200 followers. How many timeline writes a second does copying each post to followers create?",
      "About 150,000 a second",
      [
        "About 750 a second",
        "About 1.5 million a second",
        "About 15,000 a second",
      ],
      "Each post is written once per follower: 750 × 200 is 150,000 writes a second. That's why fan-out runs in workers, off the request.",
    ),
    talk(
      "An account with 50 million followers posts. What does your fan-out estimate say?",
      [
        "One post becomes 50 million timeline writes: at 150,000 a second, over five minutes of work for one post.",
        "So treat big accounts differently: don't copy their posts out; merge them in when a follower reads.",
        "Pick the threshold from the numbers: copy below, say, 100,000 followers, merge at read time above it.",
      ],
      "How do you merge the two lists without making the read slow?",
    ),
  ],
  "ticket-drop": [
    mc(
      "In the on-sale minute, 6,000 holds a second arrive and 3,000 are admitted. How many fans are waiting when the minute ends?",
      "About 180,000 fans",
      ["About 6,000 fans", "About 360,000 fans", "About 3,000 fans"],
      "The line grows by 3,000 a second for 60 seconds: 180,000. Counting every arrival, not just the excess, gives 360,000.",
    ),
    mc(
      "After the minute, holds fall back to 2,000 a second and 3,000 are still admitted. How long until the 180,000 in line are through?",
      "About 3 minutes",
      ["About 1 minute", "About 30 minutes", "Never: it keeps growing"],
      "Only the spare capacity drains the line: 1,000 a second, so 180 seconds. Dividing by the full 3,000 forgets that new fans keep arriving.",
    ),
    talk(
      "Why estimate the seat-map views and the holds separately?",
      [
        "18,000 views a second are reads of the same page: cacheable at the edge, so the origin barely sees them.",
        "2,000 holds a second are writes that must be exact, into one store that takes about 3,000.",
        "Two numbers, two designs: a {cdn} for one, a waiting room for the other.",
      ],
      "When the on-sale minute triples traffic, which number breaks first?",
    ),
  ],
  "video-night": [
    mc(
      "One upload arrives every two seconds, and transcoding takes two minutes of one CPU core. How many cores are busy transcoding at any moment?",
      "About 60 cores",
      ["About 2 cores", "About 120 cores", "About 7,200 cores"],
      "Arrivals × time each: 0.5 a second × 120 seconds is 60 at once (Little's law). Add headroom for a premiere.",
    ),
    mc(
      "20,000 segment requests a second, each segment about 2 MB. What bandwidth leaves the {cdn}?",
      "About 40 GB a second, or 320 Gbit/s",
      [
        "About 40 Gbit/s, or 5 GB a second",
        "About 4 GB a second, or 32 Gbit/s",
        "About 40 MB a second, or 320 Mbit/s",
      ],
      "20,000 × 2 MB is 40 GB a second; network links are sold in bits, so × 8 is 320 Gbit/s. Bandwidth, not requests, is a video service's real bill.",
    ),
    talk(
      "500 hours of video are uploaded a minute. How would you estimate storage per day?",
      [
        "500 hours a minute × 1,440 minutes is 720,000 hours a day.",
        "Every upload is kept in several renditions: at about 3 GB an hour for all of them, that's about 2 PB a day.",
        "Numbers like that are why storage tiers matter: videos nobody watches move to cheaper, slower storage.",
      ],
      "Which renditions would you not keep for a video nobody watches?",
    ),
  ],
  "ride-hailing": [
    mc(
      "Drivers send their location every 4 seconds, and that's 21,250 pings a second. How many drivers are online?",
      "About 85,000 drivers",
      [
        "About 5,300 drivers",
        "About 21,000 drivers",
        "About 5 million drivers",
      ],
      "Each driver sends a quarter of a ping a second, so 21,250 × 4 is 85,000. Dividing by 4 instead of multiplying is the usual slip.",
    ),
    mc(
      "Matching needs only each driver's latest position: an ID, a location and a time, about 100 bytes with overhead. How much memory for 85,000 drivers?",
      "About 10 MB",
      ["About 10 GB", "About 1 TB", "About 100 KB"],
      "85,000 × 100 bytes is 8.5 MB. It fits in memory many times over: the write rate, not the size, picks the store.",
    ),
    talk(
      "How much location history do you collect a day, and where should it go?",
      [
        "At peak, 21,250 pings a second × 86,400 is about 1.8 billion a day; at an average of a third, about 600 million.",
        "At about 100 bytes each, that's 60 to 180 GB a day: far too many writes for the request path's store.",
        "Stream it behind an {event-stream} to a {data-warehouse}, which loads it in bulk for pricing and ETA models.",
      ],
      "How long would you keep raw pings, and who would ask for them?",
    ),
  ],
  typeahead: [
    mc(
      "Say 35 million searches a day, about 8 keystrokes each, and peak is about three times the average. How many requests a second at peak?",
      "About 10,000 a second",
      [
        "About 1,200 a second",
        "About 3,200 a second",
        "About 230,000 a second",
      ],
      "280 million keystrokes ÷ 86,400 is about 3,200 a second; three times that is about 9,700. Counting searches instead of keystrokes gives 1,200.",
    ),
    mc(
      "Keep the top ten suggestions for 10 million popular prefixes, each suggestion about 30 bytes. How much memory?",
      "About 3 GB: it fits in memory",
      [
        "About 3 MB: it fits on the phone",
        "About 3 TB: it needs disks",
        "About 300 GB: it needs a cluster",
      ],
      "10 million × 10 × 30 bytes is 3 GB. That's small enough to hold in a {cache}, which is why suggestions are worked out in advance.",
    ),
    talk(
      "The p99 target is 200ms. How would you spend it?",
      [
        "People press a key every 100 to 200ms, so a slower answer arrives after the next keystroke.",
        "Budget it hop by hop: a few ms for {dns}, about 35 at the edge, about 8 at the balancer, and the app and {cache} the rest.",
        "Logging a completed search adds 33ms, and the slowest request lands at 187ms: there's no room for a {search-index} on every keystroke.",
      ],
      "Where would you cut first if the target dropped to 100ms?",
    ),
  ],
  "push-alerts": [
    mc(
      "A provider call takes about 150ms, and a worker keeps 100 calls in flight. How many sends a second can one worker make?",
      "About 670 a second",
      ["About 100 a second", "About 15 a second", "About 7 a second"],
      "Each slot finishes a call every 0.15 seconds, so 100 slots make about 667 a second. Three workers send the provider's whole quota of 2,000.",
    ),
    mc(
      "A goal brings 2,400 notifications a second for 90 seconds, against a quota of 2,000. How big does the backlog get?",
      "About 36,000 notifications",
      [
        "About 400 notifications",
        "About 216,000 notifications",
        "About 180,000 notifications",
      ],
      "Only the excess piles up: 400 a second × 90 seconds is 36,000. After the burst, the spare quota drains it.",
    ),
    talk(
      "Sign-in codes share this pipe with goal alerts. How late could a code be during a goal?",
      [
        "With 36,000 in line and 2,000 going out a second, a new message waits about 18 seconds.",
        "For a goal alert that's fine; for a sign-in code it's a failed sign-in.",
        "So time-critical messages get their own queue, with quota kept back for them.",
      ],
      "How much quota would you keep back, and how would you decide?",
    ),
  ],
  "web-crawler": [
    mc(
      "Common Crawl gathers about 2.4 billion pages in two weeks. Roughly how many pages a second is that?",
      "About 2,000 a second",
      ["About 28,000 a second", "About 200 a second", "About 120,000 a second"],
      "Two weeks is about 1.2 million seconds; 2.4 billion ÷ 1.2 million is 2,000. Dividing by one day's seconds gives 28,000.",
    ),
    mc(
      "1,500 new pages a second are fetched and stored, each about 100 KB compressed. How much storage a day?",
      "About 13 TB a day",
      ["About 130 GB a day", "About 1.3 PB a day", "About 150 MB a day"],
      "1,500 × 86,400 is about 130 million pages; × 100 KB is about 13 TB. That's why pages go to an {object-store}, not a database.",
    ),
    talk(
      "A fetch takes about a second, and a fetcher keeps 100 in flight. How many fetchers do you need, and what else caps the rate?",
      [
        "1,500 fetches a second at 100 a second each is 15 fetchers flat out; at a comfortable 50%, 30.",
        "Politeness caps it too: 2,000 pages a second in all, so this uses 75% of it.",
        "A slow site holds a slot longer: at ten seconds a fetch, a slot does a tenth of the work, which is why the timeout matters.",
      ],
      "How would you stop one huge site from using the whole politeness budget?",
    ),
  ],
  "pay-button": [
    mc(
      "A charge takes about 300ms, and a worker keeps 100 calls in flight. How many workers to charge 600 payments a second at about 50% busy?",
      "About 4 workers",
      ["About 2 workers", "About 6 workers", "About 180 workers"],
      "One worker makes about 333 charges a second, so 600 needs two flat out, or four at half busy. This level runs twelve, because the bad afternoon brings slow calls, retries and a lost zone.",
    ),
    mc(
      "Finance reconciles every payment daily. At an average of a third of the 600-a-second peak, how many payments a day?",
      "About 17 million a day",
      [
        "About 52 million a day",
        "About 720,000 a day",
        "About 1.7 million a day",
      ],
      "200 a second × 86,400 is about 17 million. Using the peak all day gives 52 million; multiplying by an hour's seconds gives 720,000.",
    ),
    talk(
      "Why is the double-charge risk a number and not just a worry?",
      [
        "Retries happen when calls time out. Here, without idempotency keys, about 72 payments a second are charged twice.",
        "That's over 250,000 an hour, each one a refund, a support ticket and a gap in the books.",
        "An idempotency key per payment makes a retry safe, so retrying stays cheap.",
      ],
      "Where does the key come from, and how long does the provider keep it?",
    ),
  ],
  "fair-share": [
    mc(
      "GitHub allows a signed-in user 5,000 requests an hour. What's that per second?",
      "About 1.4 a second",
      ["About 83 a second", "About 0.06 a second", "About 14 a second"],
      "An hour is 3,600 seconds: 5,000 ÷ 3,600 is about 1.4. Dividing by 60 gives the per-minute rate, 83.",
    ),
    mc(
      "Each API key may make 100 requests a second, and peak is 20,000. If every customer ran at their limit, how many would fill the peak?",
      "200 customers",
      ["20 customers", "2,000 customers", "20,000 customers"],
      "20,000 ÷ 100 is 200. So the limit stops one customer taking everything, but it doesn't size the system: plan capacity from real usage.",
    ),
    talk(
      "The limits are counts per API key, kept in the {cache}. What does that cost?",
      [
        "Every request bumps a counter: 20,000 cache writes a second at peak, and 60,000 more when the script runs away.",
        "Say 100,000 keys with a counter of about 100 bytes each: about 10 MB. The size is trivial; check the rate.",
        "Counting in each server's memory instead splits the count 36 ways, so the script gets through.",
      ],
      "What should happen to the limit if the {cache} can't be reached?",
    ),
  ],
  "save-game": [
    mc(
      "Today's event key takes 15% of the 27,000 loads a second. How many reads a second hit that one key?",
      "About 4,050 a second",
      ["About 405 a second", "About 4,500 a second", "About 23,000 a second"],
      "15% of 27,000 is 4,050, past the 3,000 one {nosql} key takes. More blocks don't help, since one key lives in one place; a {cache} does. Taking 15% of all 30,000 requests gives 4,500.",
    ),
    mc(
      "Say 50 million players, each save about 20 KB. How much does the store hold?",
      "About 1 TB",
      ["About 1 GB", "About 1 PB", "About 100 GB"],
      "50 million × 20 KB is 1 TB. Size is easy here; spreading 3,000 saves a second evenly is the design problem.",
    ),
    talk(
      "3,000 saves a second. How many {nosql} blocks, and what could spoil the estimate?",
      [
        "At about 1,000 writes a second per block, three is the minimum, flat out. Five run at 60%, with room.",
        "That only holds if saves spread evenly, which keying by player gives you.",
        "Keyed by region, the biggest region puts 40% of the traffic on one partition, and it overloads.",
      ],
      "How would you spot a hot key in production?",
    ),
  ],
  "sync-folder": [
    mc(
      "2,000 chunk uploads a second, each 4 MB. What's the upload bandwidth?",
      "About 8 GB a second, or 64 Gbit/s",
      [
        "About 8 Gbit/s, or 1 GB a second",
        "About 800 MB a second, or 6.4 Gbit/s",
        "About 80 GB a second, or 640 Gbit/s",
      ],
      "2,000 × 4 MB is 8 GB a second; × 8 is 64 Gbit/s. That's why devices send chunks straight to the {object-store}.",
    ),
    mc(
      "Relaying a chunk costs an {app-server} about 25 ordinary requests' worth. If all 4,000 chunk transfers went through the app tier, what would it carry?",
      "About 106,000 requests' worth: 18 times today",
      [
        "About 10,000 requests' worth: under 2 times today",
        "About 4,000 requests' worth: the same as today",
        "About 1 million requests' worth: 170 times today",
      ],
      "4,000 × 25 is 100,000, plus the 6,000 it already handles: about 18 times its load. Here it would run at 883%.",
    ),
    talk(
      "How much could naming chunks by their hash save?",
      [
        "A chunk named by its hash is stored once, however many devices or files contain it.",
        "If, say, a third of uploads are chunks already stored (the same files across a team), that skips about 670 of the 2,000 uploads a second.",
        "The {object-store} bills per request, and that's most of this bill, so the saving is real money.",
      ],
      "What does a device send so the server can say 'already have it'?",
    ),
  ],
  "click-counter": [
    mc(
      "One ad can take 5% of 15,000 clicks a second, and the ad break doubles everything. How many writes would its counter take?",
      "750 a second, and 1,500 in the ad break",
      [
        "75 a second, and 150 in the ad break",
        "7,500 a second, and 15,000 in the ad break",
        "750 a second, and still 750 in the ad break",
      ],
      "5% of 15,000 is 750, doubled to 1,500, past the 1,000 one {nosql} key takes. One counter per ad is a hot key.",
    ),
    mc(
      "Workers add clicks into one count per ad per minute and write about 15 counts a second. How many fewer writes is that than one per click?",
      "About 1,000 times fewer",
      ["About 15 times fewer", "About 60 times fewer", "About 100 times fewer"],
      "15,000 clicks ÷ 15 counts is 1,000. Adding up before writing is what makes the counts cheap.",
    ),
    talk(
      "Every raw click is kept so finance can check the bill. How much is that?",
      [
        "At an average of a third of peak, 5,000 a second × 86,400 is about 430 million clicks a day.",
        "At about 200 bytes each, about 90 GB a day, or 30 TB a year.",
        "That's a {data-warehouse}'s job, loaded in bulk from the {event-stream}, not one write per click.",
      ],
      "How would you prove a bill is right if an advertiser disputes it?",
    ),
  ],
  "shared-doc": [
    mc(
      "Up to 100 people edit one document, and each sends a batch of edits every 200ms while typing. How many writes a second does the busiest document take?",
      "About 500 a second",
      ["About 20 a second", "About 20,000 a second", "About 100 a second"],
      "Five batches a second each × 100 people is 500, under the 1,000 one {nosql} key takes. So keying the log by document is safe.",
    ),
    mc(
      "6,000 batches a second at peak, a third of that on average, each about 100 bytes. How fast does the edit log grow?",
      "About 17 GB a day",
      ["About 52 GB a day", "About 170 MB a day", "About 1.7 TB a day"],
      "2,000 × 86,400 × 100 bytes is about 17 GB a day. Snapshots let you open a document without replaying every edit since it was made.",
    ),
    talk(
      "Why send keystrokes in batches rather than one at a time?",
      [
        "A fast typist makes 5 to 10 keystrokes a second; with 100 editors, that's up to 1,000 writes a second into one key.",
        "Batching every 200ms caps each person at 5 writes a second, however fast they type.",
        "The cost is a delay: others see your typing up to 200ms later, inside the under-a-second target.",
      ],
      "What happens to a batch sent during the split?",
    ),
  ],
  "on-schedule": [
    mc(
      "1,000 jobs come due a second, each a webhook call of about 300ms, and a worker keeps 100 in flight. How many workers to run them flat out?",
      "3 workers",
      ["10 workers", "300 workers", "1 worker"],
      "One worker makes about 333 calls a second, so 1,000 needs three. This level runs twelve at 25%, because slow webhooks, retries and hung workers need the room.",
    ),
    mc(
      "With no timeout, a slow webhook holds its slot for five seconds. How many calls a second can a worker make then?",
      "About 20, so 1,000 jobs need 50 workers",
      [
        "About 333, so 3 workers still do",
        "About 100, so 10 workers do",
        "About 2, so 500 workers are needed",
      ],
      "100 slots ÷ 5 seconds is 20 calls a second. A timeout of half a second keeps it at 200, which is why timeouts are a capacity setting.",
    ),
    talk(
      "Is 1,000 jobs a second spread through the hour?",
      [
        "No: 'every hour' and '9am' all land on the hour, so the peak is a spike at :00.",
        "The average could be a tenth of the peak, with the workers idle most of the hour.",
        "Spread it: give each hourly job its own minute, picked once, and the spike flattens.",
      ],
      "Which customers would object to a job that runs at a random minute?",
    ),
  ],
  "near-me": [
    mc(
      "One {search-index} node answers about 2,000 queries a second, and you can run ten. Can they take 30,000 searches a second alone?",
      "No: ten take 20,000, so 150% without a cache",
      [
        "Yes: ten nodes take exactly 30,000",
        "Yes: two nodes would be at 75%",
        "No: it would take 150 nodes to keep up",
      ],
      "10 × 2,000 is 20,000, so 30,000 is 150%. The {cache} has to answer most searches, and city-centre cells make that easy.",
    ),
    mc(
      "A city of 100 km² is covered in 6-character geohash cells of about 1.2 km by 0.6 km. Roughly how many cells?",
      "About 140 cells",
      ["About 14 cells", "About 1,400 cells", "About 80 cells"],
      "Each cell is about 0.72 km², so 100 ÷ 0.72 is about 140. A few hundred cells are what everyone asks about: very cacheable.",
    ),
    talk(
      "30,000 searches and 150 updates a second. What does that 200 to 1 ratio tell you?",
      [
        "Results barely change, so cache them hard: a cell's results can be reused for minutes.",
        "Writes are so few that feeding the index through an {event-stream} costs almost nothing.",
        "Spend on the read path: the {cache} and search nodes, not the store.",
      ],
      "How stale may a café's opening hours be?",
    ),
  ],
  "top-players": [
    mc(
      "15,000 scores a second, and one in five beats that player's best. How many writes reach the durable store?",
      "3,000 a second",
      ["15,000 a second", "750 a second", "300 a second"],
      "One in five of 15,000 is 3,000. Checking against the best first cuts writes five times.",
    ),
    mc(
      "The ranking holds 50 million players, about 50 bytes each with overhead. How much memory does the sorted set need?",
      "About 2.5 GB: one node holds it",
      [
        "About 2.5 MB: it fits in a phone",
        "About 2.5 TB: it needs disks",
        "About 250 GB: it needs a cluster",
      ],
      "50 million × 50 bytes is 2.5 GB, so the whole ranking fits in one {cache} node's memory.",
    ),
    talk(
      "The season's last hour brings 1.5 times the traffic. Which number breaks first?",
      [
        "The app tier goes from 50% to 75%: fine.",
        "The workers go from 63% to 94%: close to the edge.",
        "The store's 3,000 writes become 4,500, against four blocks of about 1,000: it falls a little behind, then catches up.",
      ],
      "Would you add blocks for one hour a season, or let it lag?",
    ),
  ],
}
