/**
 * Estimation: the back-of-envelope step an interview opens with. Business
 * numbers in, requests a second, storage and machines out, worked through
 * before anything is drawn. A few cards per interview classic, and per
 * level elsewhere where the numbers are the lesson, mixing multiple choice
 * with prompts to work out loud.
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
  "ask-the-docs": [
    mc(
      "200,000 help articles, each split into about 30 passages. How many vectors does the {vector-db} hold?",
      "About 6 million",
      ["About 200,000", "About 600,000", "About 60 million"],
      "One vector per passage: 200,000 × 30. Counting articles instead of passages gives 200,000.",
    ),
    mc(
      "Each vector is 1,024 numbers of 4 bytes. Roughly how much memory do 6 million take?",
      "About 25 GB",
      ["About 2.5 GB", "About 250 GB", "About 25 MB"],
      "1,024 × 4 is about 4 KB a vector, and 6 million × 4 KB is about 25 GB, before the index's own overhead.",
    ),
    mc(
      "1,960 questions a second. 40% repeat a popular one, and the {cache} answers 95% of those. How many reach the {vector-db}?",
      "About 1,215 a second",
      ["About 1,176 a second", "About 784 a second", "About 1,960 a second"],
      "1,960 × 0.4 × 0.95 is about 745 answered, leaving 1,215. Forgetting the 95% gives 1,176; 784 is the share that repeats.",
    ),
    talk(
      "You switch embedding models. How long does embedding all 200,000 articles again take?",
      [
        "One batched call per article: 200,000 calls.",
        "At the model's quota of 100 calls a second, about 2,000 seconds: half an hour, if nothing else needs the quota.",
        "New edits share the quota, so run it at a lower rate over a few hours, into a new index.",
      ],
      "What does it cost, if the model is billed per word?",
    ),
  ],
  "order-placed": [
    mc(
      "The shop takes 9 million orders on a busy day, and peak is about three times the average. How many orders a second at peak?",
      "About 300 a second",
      ["About 100 a second", "About 2,500 a second", "About 900 a second"],
      "9 million ÷ 86,400 is about 104 a second on average; three times that is about 300. Dividing by an hour's seconds instead gives 2,500.",
    ),
    mc(
      "Each email takes a quarter of a second, mostly waiting, and a {worker} keeps about 100 in flight. How many emails a second does one send?",
      "About 400",
      ["About 4", "About 100", "About 25"],
      "100 at a time, each done in 0.25 seconds: 100 ÷ 0.25 is 400. One at a time would be 4.",
    ),
    mc(
      "Three teams each get every order through their own {queue}. At 300 orders a second, how many messages a second do the queues carry in all?",
      "About 900",
      ["About 300", "About 100", "About 2,700"],
      "Each team gets every order: 3 × 300. One shared queue would carry 300, a third to each.",
    ),
    talk(
      "The email provider is down for 20 minutes at peak. How big does the email queue get, and how long does it take to drain?",
      [
        "300 a second for 1,200 seconds: about 360,000 emails waiting.",
        "Two workers send 800 a second, 500 more than arrive, so about 12 minutes to catch up, if the provider's quota allows 800.",
        "Here it's 400 a second, only 100 spare: an hour. Ask for more quota, or accept the delay.",
      ],
      "Does anyone need an alert before the 20 minutes are up?",
    ),
  ],
  "server-metrics": [
    mc(
      "5,000 servers each send 40 metrics every 10 seconds. How many points a second?",
      "20,000",
      ["200,000", "2,000", "500"],
      "5,000 × 40 is 200,000 series; one point each every 10 seconds is 20,000 a second. 200,000 is the series count; 500 is the batches.",
    ),
    mc(
      "About how many points is that a day?",
      "About 1.7 billion",
      ["About 72 million", "About 17 million", "About 170 billion"],
      "20,000 × 86,400 is about 1.73 billion. Multiplying by 3,600 instead gives 72 million: an hour, not a day.",
    ),
    mc(
      "Compressed, a point takes about 2 bytes. How much is a day of raw points?",
      "About 3.5 GB",
      ["About 35 GB", "About 350 MB", "About 3.5 TB"],
      "1.73 billion × 2 bytes is about 3.5 GB. Uncompressed, at 16 bytes each, it would be about 28 GB.",
    ),
    talk(
      "Raw points for 15 days, then one-minute rollups for a year. Roughly how much storage?",
      [
        "Raw: 15 × 3.5 GB is about 52 GB.",
        "Rollups: six times fewer points, three values each (minimum, maximum, average): about half a day's raw size per day, so about 640 GB for a year.",
        "A year of raw points would be about 1.3 TB: rollups halve it, and make long queries far faster.",
      ],
      "Which would you cut first if storage had to halve again?",
    ),
  ],
  "people-you-may-know": [
    mc(
      "A member has 300 connections, and each of them has about 300. Roughly how many friends of friends are there to count?",
      "About 90,000",
      ["About 600", "About 27 million", "About 3,000"],
      "300 × 300 is 90,000, before removing duplicates and people they already know. Adding instead of multiplying gives 600.",
    ),
    mc(
      "100 million members each keep 50 suggested IDs of 8 bytes. How much memory?",
      "About 40 GB",
      ["About 4 GB", "About 400 GB", "About 40 MB"],
      "50 × 8 is 400 bytes a member; × 100 million is 40 GB: a few {cache} nodes.",
    ),
    mc(
      "A recompute takes half a second of waiting, and a {worker} keeps about 100 in flight. How many workers for 500 new connections a second?",
      "3, so 4 for headroom",
      ["1", "25", "250"],
      "100 ÷ 0.5 is 200 a second per worker; 500 ÷ 200 is 2.5. One at a time, it would be 250.",
    ),
    talk(
      "A member accepts ten invitations in a minute. How many recomputes do they need?",
      [
        "One job per connection recomputes them ten times, each result replacing the last.",
        "Waiting a few seconds and merging jobs for the same member makes it one.",
        "At 500 connections a second, merging can cut the work a lot when people connect in bursts.",
      ],
      "What does merging cost in freshness?",
    ),
  ],
  "clinic-records": [
    mc(
      "Say 2,000 clinics each write about 3 records a second at peak. How many writes a second in all?",
      "About 6,000 a second",
      ["About 667 a second", "About 2,000 a second", "About 20,000 a second"],
      "2,000 × 3 is 6,000: twice what one {sql-primary} takes. Dividing instead gives 667.",
    ),
    mc(
      "The biggest country is 55% of the 6,000 writes. How many shards does it need to itself, at about 3,000 writes each?",
      "2 shards",
      ["1 shard", "4 shards", "6 shards"],
      "55% of 6,000 is 3,300: more than one primary, so two, at about 55% each. Six is the total, with the other four countries.",
    ),
    talk(
      "How many shards in all, and what sets the number?",
      [
        "The rule: at least one per country, so five.",
        "The load: the biggest country needs two of its own.",
        "Six in all. Most run far below capacity, because the rule sets the count, not the load.",
      ],
      "A sixth country joins. What changes, and what doesn't?",
    ),
  ],
  "fleet-tracker": [
    mc(
      "Say 60,000 vans each send an update every 5 seconds at peak. How many writes a second?",
      "About 12,000 a second",
      ["About 300,000 a second", "About 200 a second", "About 60,000 a second"],
      "60,000 ÷ 5 is 12,000: four times what one {sql-primary} takes. Multiplying by 5 instead gives 300,000.",
    ),
    mc(
      "The biggest courier sends 35% of the 12,000 writes. Keyed by courier, what does its shard take?",
      "About 4,200 writes a second",
      [
        "About 1,500 writes a second",
        "About 525 writes a second",
        "About 12,000 writes a second",
      ],
      "35% of 12,000 is 4,200, past the 3,000 one primary takes, at any shard count. 1,500 is the average of eight shards, not the busiest.",
    ),
    talk(
      "How many shards, with 'courier ID, then van ID'?",
      [
        "12,000 writes ÷ 3,000 per primary is 4 flat out; at about 50% each, 8.",
        "Check the busiest key: with the giants split by van, no single key is more than about 6% of the traffic.",
        "Then peak season: 1.3 × 50% is 65%, still comfortable.",
      ],
      "What if the vans sent updates every 30 seconds instead?",
    ),
  ],
  "first-customers": [
    mc(
      "Peak is 1,500 requests a second and one {app-server} handles about 1,000. How many do you run so that losing one still carries peak?",
      "3 instances",
      ["2 instances", "1 instance", "6 instances"],
      "Two carry peak at 75%, but lose one and the last runs at 150%. With three, losing one leaves two at 75%. That's N+1: enough for peak, plus one you can lose.",
    ),
    mc(
      "Say 1,500 customer companies each open 200 tickets a month, and a ticket with its replies is about 20 KB. How much storage a year?",
      "About 70 GB a year",
      ["About 6 GB a year", "About 7 TB a year", "About 700 MB a year"],
      "1,500 × 200 × 12 is 3.6 million tickets; × 20 KB is about 72 GB. One database holds that for years. Forgetting the × 12 gives 6 GB, the size of one month.",
    ),
    talk(
      "A fifth of the 1,500 are writes. Does one {sql-primary} cope?",
      [
        "300 writes a second against about 3,000 is 10%; 1,200 reads against about 10,000 is 12%.",
        "So one primary is plenty, with lots of room to grow.",
        "A second instance in another zone is a standby: it's there to survive a failure, not to add capacity.",
      ],
      "At what traffic would one primary first stop being enough?",
    ),
  ],
  "going-viral": [
    mc(
      "10,000 image requests a second, and a {cdn} in front serves about 90% from its edge. How many still reach the {object-store}?",
      "About 1,000 a second",
      ["About 5,500 a second", "About 9,000 a second", "None at all"],
      "10% of 10,000 is 1,000, well under the 5,500 the store answers for one key prefix. Without the {cdn}, all 10,000 arrive and nearly half fail.",
    ),
    mc(
      "Each image is about 200 KB. At 10,000 a second, how much data goes out each second?",
      "About 2 GB, or 16 gigabits",
      [
        "About 200 MB, or 1.6 gigabits",
        "About 16 GB, or 128 gigabits",
        "About 2 megabits",
      ],
      "10,000 × 200 KB is 2 GB a second; × 8 bits is 16 gigabits. That's far beyond one server's network card, and exactly what a {cdn}'s edge is built for.",
    ),
    talk(
      "The chaos round doubles traffic to 20,000 a second. What changes?",
      [
        "The edge still serves about 90%, so about 2,000 reach the {object-store}: still under its 5,500.",
        "The {cdn} scales for you; there's nothing to resize.",
        "{app-server} instances in front would add cost and nothing else: they'd still fetch every miss from the same store.",
      ],
      "A brand-new image goes viral before any edge has it. What happens in the first seconds?",
    ),
  ],
  "upload-rush": [
    mc(
      "100 uploads a second, and resizing each takes half a second of CPU. How many CPU cores does resizing keep busy?",
      "About 50 cores",
      ["About 5 cores", "About 100 cores", "About 200 cores"],
      "100 jobs a second × 0.5 seconds each is 50 seconds of CPU every second, so 50 cores busy all the time.",
    ),
    mc(
      "Each {worker} has 4 cores. How many workers keep up with 50 cores of resizing, at about 80% busy?",
      "16 workers",
      ["13 workers", "50 workers", "4 workers"],
      "50 ÷ 4 is 12.5 workers flat out; at 80% busy that's about 16. Thirteen keeps up only if nothing ever slows down or dies.",
    ),
    talk(
      "Why not resize on the {app-server} while the user waits?",
      [
        "Every upload would make the user wait half a second, longer once requests queue up behind each other.",
        "The request tier would need 50 cores for work nobody needs to see instantly.",
        "A {queue} absorbs bursts and lets the {worker} pool grow on its own; if a worker dies, its message is simply handed to another.",
      ],
      "How does the app know when the resized copies are ready to show?",
    ),
  ],
  "step-counter": [
    mc(
      "About a million wristbands each sync once every five minutes at peak. How many sync writes a second?",
      "About 3,500 a second",
      ["About 200,000 a second", "About 55 a second", "About 12,000 a second"],
      "Five minutes is 300 seconds, and 1,000,000 ÷ 300 is about 3,300. That's this level's 3,500 writes, past the 3,000 one {sql-primary} takes. Dividing by 5 instead of 300 gives 200,000.",
    ),
    mc(
      "3,500 writes a second, and 1.5 times that on the first Monday of January. A {nosql} block takes about 1,000 writes a second. How many blocks?",
      "6 blocks",
      ["4 blocks", "2 blocks", "53 blocks"],
      "3,500 × 1.5 is 5,250, so six blocks of 1,000. Four covers a normal day but not the January spike.",
    ),
    talk(
      "How much storage do the syncs add a year?",
      [
        "Say a sync is about 100 bytes and the average is about a third of peak: 1,200 a second.",
        "1,200 × 86,400 is about 100 million syncs a day, about 10 GB a day.",
        "That's about 4 TB a year: fine for a store that partitions by user, and a reason to roll old minute-by-minute data up into daily totals.",
      ],
      "Do you keep every heart-rate sample forever?",
    ),
  ],
  "zone-outage": [
    mc(
      "Peak needs 8 {app-server} instances. Spread over two zones, how many do you run so losing a zone still carries peak?",
      "16, with 8 in each zone",
      ["9, with one spare", "12, with 6 in each zone", "24, over three zones"],
      "When a zone goes dark you keep only the other zone's half, so each half must carry peak on its own: 8 and 8.",
    ),
    mc(
      "The dashboard promises 99.95% availability. How much downtime does that allow in a month?",
      "About 22 minutes",
      ["About 43 minutes", "About 4 minutes", "About 3.6 hours"],
      "A month is about 43,200 minutes, and 0.05% of that is about 22. 99.9% allows 43 minutes, 99.99% about 4, and 99.5% about 3.6 hours.",
    ),
    talk(
      "With three zones instead of two, how many {app-server} instances?",
      [
        "Losing one of three zones leaves two thirds of the instances.",
        "So 8 must fit in two zones: 4 per zone, 12 in all, instead of 16.",
        "More zones means less spare capacity. The {sql-primary} still needs a standby in a second zone either way.",
      ],
      "Why not keep everything in one zone and fail over quickly instead?",
    ),
  ],
  "feed-the-analysts": [
    mc(
      "1,600 orders a second, and 1.5 times that in the flash sale. One {event-stream} shard takes about 1,000 events a second in. How many shards?",
      "3 shards",
      ["2 shards", "1 shard", "6 shards"],
      "1,600 × 1.5 is 2,400, so three shards of 1,000. Two cover a normal day and fall behind in the sale.",
    ),
    mc(
      "Each order event is about 1 KB, and the average is about a third of the 1,600-a-second peak. How much does the {data-warehouse} take in each day?",
      "About 50 GB a day",
      ["About 140 GB a day", "About 2 GB a day", "About 50 TB a day"],
      "About 530 a second × 86,400 is about 46 million orders a day; × 1 KB is about 46 GB. Using the peak rate all day gives 140 GB.",
    ),
    talk(
      "Why one write to a stream, instead of checkout writing to all three stores?",
      [
        "Checkout pays for one fast write; the {search-index} and the {data-warehouse} read the stream at their own pace.",
        "Three writes in a row multiply the risk: at 99.9% each, all three succeed only 99.7% of the time.",
        "The warehouse answers in seconds, which no customer should wait for, and the stream can replay events if a consumer falls behind.",
      ],
      "The search index falls an hour behind. What do customers notice?",
    ),
  ],
  "shoebox-receipts": [
    mc(
      "30 receipt photos a second, and each OCR call takes about 3 seconds. How many calls are in flight at once?",
      "About 90 at once",
      ["About 10 at once", "About 30 at once", "About 270 at once"],
      "In flight = arrivals × time each takes: 30 × 3 is 90. Workers that mostly wait can run many calls each, so this sets how many slots you need, not cores.",
    ),
    mc(
      "The {doc-ai} quota comes in blocks of 10 calls a second. Deadline day is 1.5 times the normal 30 photos a second. How many blocks?",
      "5 blocks",
      ["3 blocks", "2 blocks", "45 blocks"],
      "30 × 1.5 is 45 calls a second, so five blocks of 10. Three covers a normal day; on deadline day the backlog would grow by 15 photos a second.",
    ),
    talk(
      "What does OCR cost in deadline week, at about a cent a page?",
      [
        "Say the 30-a-second peak lasts two hours a day for a week: 30 × 7,200 × 7 is about 1.5 million pages.",
        "At a cent a page that's about $15,000, most of this level's bill.",
        "Typed-in receipts cost nothing to read, so making the form easy to use saves real money.",
      ],
      "The provider won't raise your quota in time. What do you tell users?",
    ),
  ],
  "plug-finder": [
    mc(
      "250,000 charging ports, each with a live status record of about 200 bytes. How much memory to hold them all?",
      "About 50 MB",
      ["About 5 GB", "About 500 KB", "About 50 GB"],
      "250,000 × 200 bytes is 50 MB: it fits in memory many times over, which is why a fast key-value store or a cache can serve live status.",
    ),
    mc(
      "9,500 map views a second, and 60% are of the same busy areas. A {cdn} caching each answer for 30 seconds serves nearly all of those. Roughly how many still reach your servers?",
      "About 4,000 a second",
      ["About 9,500 a second", "About 500 a second", "About 6,000 a second"],
      "About 95% of the 5,700 repeat views are served at the edge, about 5,400, leaving about 4,000. The other 40% are quieter areas that each need fresh work.",
    ),
    talk(
      "Status changes every few minutes. Is 30 seconds of caching acceptable?",
      [
        "A charging session lasts half an hour or more, so a 30-second-old answer is rarely wrong.",
        "Marking a charger in use writes straight to the store, never to the cached map.",
        "When a driver taps a station, fetch just that one fresh: cheap, and it's the moment accuracy matters.",
      ],
      "Two drivers race for the last free charger. What decides who gets it?",
    ),
  ],
  "balance-sheet": [
    mc(
      "Each transfer writes two ledger entries. Peak is 240 transfers a second, and the average is about a third of that. How many entries a day?",
      "About 14 million",
      ["About 40 million", "About 7 million", "About 600,000"],
      "80 a second × 2 entries × 86,400 is about 14 million. Forgetting the second entry gives 7 million; using the peak rate all day gives 40 million.",
    ),
    mc(
      "A write commits once a majority of copies confirm it. How many copies can be lost or cut off while writes still commit?",
      "1 of 3, or 2 of 5",
      ["2 of 3, or 4 of 5", "None of 3, or 1 of 5", "1 of 3, or 1 of 5"],
      "A majority of 3 is 2, so one can go. A majority of 5 is 3, so two can go. With 2 copies the majority is both, so losing either stops writes.",
    ),
    talk(
      "Is one {sql-primary} enough here, or do you need to shard?",
      [
        "240 writes a second is about 8% of what one primary takes, and 360 reads is a few percent.",
        "So there's nothing to shard: spend on copies, three over three zones, so a split leaves a majority.",
        "Sharding would add moving parts and transfers between shards, which are much harder to keep correct.",
      ],
      "Traffic grows tenfold. What runs out first?",
    ),
  ],
  "full-basket": [
    mc(
      "4,500 basket writes a second, and a {nosql} block takes about 1,000. How many blocks to run each at about 75%?",
      "6 blocks",
      ["5 blocks", "3 blocks", "15 blocks"],
      "4,500 ÷ 750 is 6. Five runs each at 90%, with no room for a busy minute. One {sql-primary} at 3,000 is already ruled out.",
    ),
    mc(
      "20 million shoppers each have a basket of about 2 KB. How much storage?",
      "About 40 GB",
      ["About 4 TB", "About 400 MB", "About 40 TB"],
      "20,000,000 × 2 KB is 40 GB: small. Baskets are sized by how fast they change, not by how much they hold.",
    ),
    talk(
      "A split cuts off one zone of three for 10 minutes at peak. If that side refused writes, how many adds would fail?",
      [
        "About a third of the traffic is on the cut-off side: about 1,500 writes a second.",
        "Over 600 seconds that's about 900,000 refused adds and removals.",
        "Each one is a shopper who might leave, which is why the basket keeps accepting writes and merges the copies afterwards.",
      ],
      "So how do you merge two versions of the same basket?",
    ),
  ],
  "like-storm": [
    mc(
      "3,000 likes a second, and four in ten go to one post. How many writes a second hit that post's key?",
      "About 1,200 a second",
      ["About 300 a second", "About 3,000 a second", "About 120 a second"],
      "40% of 3,000 is 1,200, past the 1,000 one key takes however much capacity you buy.",
    ),
    mc(
      "Split that post's likes over 10 keys with a random suffix. What does each key take?",
      "About 120 writes a second",
      [
        "About 1,200 writes a second",
        "About 12 writes a second",
        "About 300 writes a second",
      ],
      "1,200 ÷ 10 is 120, about 12% of a key's limit. The price: reading the count now means adding up 10 keys.",
    ),
    talk(
      "12,000 reads of like counts a second. Why cache them, and how stale can they be?",
      [
        "Most reads are of the same few popular posts, so a cache serves nearly all of them.",
        "A count a few seconds old is fine: nobody can tell 1,204,113 from 1,204,180.",
        "With salted keys, each uncached count costs 10 reads, so the cache saves even more than usual.",
      ],
      "How would you show the singer an exact count?",
    ),
  ],
  "claim-your-name": [
    mc(
      "6,000 writes a second over 3 shards, each with three copies across three zones. How many {sql-primary} instances do you pay for?",
      "9 instances",
      ["3 instances", "6 instances", "18 instances"],
      "3 shards × 3 copies is 9. Each shard takes 2,000 writes, about 67% of one primary; the copies add survival, not capacity.",
    ),
    mc(
      "Split by sign-up time instead, and about 90% of writes land on the newest shard. What does it take?",
      "About 5,400 writes a second",
      [
        "About 2,000 writes a second",
        "About 600 writes a second",
        "About 6,000 writes a second",
      ],
      "90% of 6,000 is 5,400, nearly twice what one primary takes, whatever the shard count. New sign-ups all have the newest time.",
    ),
    talk(
      "Why does the username have to be the partition key?",
      [
        "Then every check for a name, and every claim of it, goes to one shard.",
        "One strongly consistent primary can refuse a second claim of the same name, even during a split.",
        "With any other key, checking a name means asking every shard, and two shards could both say yes.",
      ],
      "Someone changes their username. What has to move?",
    ),
  ],
  worldwide: [
    mc(
      "Half your users are a 150 ms round trip away, and opening a page takes two round trips to your servers. What's the least they wait, before any work is done?",
      "About 300 ms: already past the 250 ms target",
      [
        "About 150 ms, comfortably inside it",
        "About 75 ms, comfortably inside it",
        "About 600 ms, far past it",
      ],
      "Two crossings of 150 ms is 300 ms before your servers do anything. No amount of server capacity fixes distance: the servers have to be near them.",
    ),
    mc(
      "A store runs a full copy in each of two regions. Of 2,000 writes a second, how many does the far copy receive?",
      "All 2,000",
      ["About 1,000", "About 200", "None until they're read"],
      "Each copy holds everything, so every write goes to both. Two regions double the store's bill and its write work, not just its reads.",
    ),
    talk(
      "Which components need to run in both regions, and which don't?",
      [
        "Everything a request touches: {load-balancer}, {app-server}, {cache} and the store, or far users still cross the ocean.",
        "{dns} is global already; nothing to copy.",
        "Writes must be accepted in both regions, so the store has to be one that takes writes everywhere and reconciles later.",
      ],
      "One region goes dark. Can the other carry everyone?",
    ),
  ],
  "black-friday": [
    mc(
      "11,250 reads a second reach the {sql-primary}, which answers about 10,000. Twenty {app-server} instances can serve 20,000. Where does it break?",
      "The database, at about 112%",
      [
        "The app tier, at about 112%",
        "The load balancer, at 100%",
        "Nowhere: it should hold",
      ],
      "The app tier runs at about 63%. Every read goes on to the database, and it's past its limit. More app servers only send it more reads.",
    ),
    mc(
      "85% of reads are the same catalogue. A cache in front catches about 95% of those. How many reads still reach the database?",
      "About 2,000 a second",
      ["About 9,000 a second", "About 11,000 a second", "About 500 a second"],
      "11,250 × 85% × 95% is about 9,100 served by the cache, leaving about 2,100: a fifth of what the database takes.",
    ),
    talk(
      "Twenty app servers for 12,500 requests. Too many, or too few?",
      [
        "12,500 ÷ 1,000 is 13 flat out; with room for a crash, 15 or 16 is plenty.",
        "Twenty is about 63% busy, so a few could go back to pay for the cache.",
        "The money was spent on the tier that wasn't red.",
      ],
      "How would you have found this bottleneck before Black Friday?",
    ),
  ],
  "front-page": [
    mc(
      "Say readers load 300 million pages a day, and peak is about four times the average. What peak should you design for?",
      "About 15,000 requests a second",
      [
        "About 3,500 requests a second",
        "About 80,000 requests a second",
        "About 1,500 requests a second",
      ],
      "300 million ÷ 86,400 is about 3,500 a second on average; four times that is about 14,000. That's this level's 15,000. Dividing by 3,600 (an hour) instead gives 83,000.",
    ),
    mc(
      "95% of the 15,000 are reads, and 90% of those are the articles everyone is reading. A cache serves almost all of those. About how many reads still reach the database?",
      "About 2,000 a second",
      [
        "About 14,000 a second",
        "About 7,000 a second",
        "None: the cache serves them all",
      ],
      "14,250 reads × 90% cacheable × about 95% hits is about 12,000 served by the cache, leaving about 2,000 for the {sql-primary}. It takes about 10,000, so one primary is plenty once the cache is in front.",
    ),
    talk(
      "How much memory does the cache need?",
      [
        "The hot set is small: about 50 trending articles, at about 100 KB each rendered, is 5 MB.",
        "Even the 10,000 most-read articles of the week is about 1 GB, which fits in one cache node with room to spare.",
        "So the cache is sized by requests a second and by surviving a lost node, not by memory.",
      ],
      "The cache node restarts cold at peak. What happens to the database for the next minute?",
    ),
  ],
  "tenant-split": [
    mc(
      "6,000 writes a second, one {sql-primary} takes about 3,000, and you want each shard under about 60% so a busy hour has room. How many shards?",
      "4 shards",
      ["2 shards", "3 shards", "12 shards"],
      "6,000 ÷ (3,000 × 60%) is 3.3, so round up to 4: 1,500 writes each, at 50%. Two runs both at 100%; three runs at 67%, with no room for the busy hour.",
    ),
    mc(
      "Split by company, and the biggest company is an eighth of all traffic. If you went to 16 shards, what's the least its shard would take?",
      "About 750 writes a second",
      [
        "About 375 writes a second",
        "About 190 writes a second",
        "About 6,000 writes a second",
      ],
      "One company's rows all live on one shard, so its eighth of 6,000 (750 a second) stays together however many shards there are. 6,000 ÷ 16 is 375, but that's the average shard, not the busiest.",
    ),
    talk(
      "Created date, task ID or company ID: which key, and why?",
      [
        "Created date: every new task lands on the newest shard, so one shard takes nearly all the writes.",
        "Task ID: writes spread evenly, but 'open this project's task list' doesn't name a task, so it asks every shard.",
        "Company ID: a company's projects and tasks live together, so almost every read goes to one shard, and the biggest company (an eighth) fits within one shard's room.",
      ],
      "Your biggest customer doubles in size. What changes?",
    ),
  ],
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
