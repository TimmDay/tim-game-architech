import { deck } from "./build"

/**
 * Decks for the production incidents. Each one is about the setting that
 * decides its chaos round, and what an interviewer asks once you've named it.
 * Same layout as the CAP decks, so quiz questions can cite cards by position:
 * 0-2 clarify, 3-4 product, 5-8 decision, 9-11 trade-off, 12-13 alternative,
 * 14-15 scale, 16 edge case, 17-18 failure and recovery, 19-20 security,
 * 21 observability.
 */

export const SLOW_PARTNER = deck("slow-partner", [
  [
    "clarify",
    "What would you ask about the payment provider?",
    [
      "What's its quota on calls per second, and how fast can it be raised?",
      "How slow does it get on a bad day, and how often? Is there a status page or an SLA?",
      "Does it accept an idempotency key, so a retried charge returns the first result?",
    ],
    "If it has no idempotency keys, how would you stop double charges yourself?",
  ],
  [
    "clarify",
    "Must the customer know the payment worked before the order is placed?",
    [
      "If yes, the provider is on the request path and its slowness is the customer's.",
      "If 'confirming payment' is acceptable for a few seconds, charging can happen behind a queue.",
      "That one product answer decides most of the design.",
    ],
  ],
  [
    "clarify",
    "What would you ask about failed charges?",
    [
      "What happens to an order whose card is declined: cancelled, or held while the customer tries another card?",
      "How long can an order wait for payment before the restaurant starts cooking?",
      "Who is told, and how?",
    ],
  ],
  [
    "product",
    "What does the customer see while their payment is being confirmed?",
    [
      "A clear 'confirming payment' state, updated as soon as it changes.",
      "On a slow day, an honest 'this is taking longer than usual'.",
      "Never a second 'pay' button that could start another charge.",
    ],
  ],
  [
    "product",
    "Should the restaurant start cooking before the payment is confirmed?",
    [
      "Usually not: a declined card means food nobody pays for.",
      "For trusted repeat customers, a business might accept the risk to save minutes.",
      "Either way, it's a product rule the system has to support, not a technical default.",
    ],
  ],
  [
    "decision",
    "Where does the call to the payment provider happen?",
    [
      "In a {worker} behind a {queue}, not in the {app-server} while the customer waits.",
      "Then a slow provider makes the queue longer, not every request slower.",
      "The order is saved first, so nothing is lost if the provider is down for minutes.",
    ],
    "What changes if the provider is down for an hour?",
  ],
  [
    "decision",
    "What timeout would you put on the call, and why?",
    [
      "Short enough that a slow call frees the worker quickly: here half a second.",
      "Long enough that a normal call (about 150ms) almost never hits it.",
      "Without one, each call holds a worker for as long as the provider likes.",
    ],
  ],
  [
    "decision",
    "How should a failed or timed-out charge be retried?",
    [
      "With exponential backoff and random jitter, and a cap on attempts.",
      "Immediate retries give a struggling provider three calls for every one, exactly when it's weakest.",
      "After the cap, park the charge and tell someone.",
    ],
  ],
  [
    "decision",
    "How do you make sure a retry never charges twice?",
    [
      "Send an idempotency key with every charge: the order ID works.",
      "If the first attempt actually succeeded, the provider sees the same key and returns the original result.",
      "Store the key and the result on your side too, so your own retries are safe.",
    ],
  ],
  [
    "tradeoff",
    "What does moving charges behind a queue cost?",
    [
      "The customer doesn't get an instant answer; the app needs a 'confirming' state.",
      "A declined card is found after the order is placed, so there's a recovery flow.",
      "More moving parts: a queue, workers, and their alerts.",
    ],
  ],
  [
    "tradeoff",
    "A short timeout or a long one?",
    [
      "Short frees workers fast, but cuts off calls that would have succeeded, so more retries.",
      "Long lets slow calls finish, but holds workers for longer on a bad day.",
      "Set it from the provider's normal p99, with some room, and retry the rest.",
    ],
  ],
  [
    "tradeoff",
    "Why so much spare worker capacity on a normal evening?",
    [
      "On a slow day each call holds its slot for longer, and retries add calls.",
      "Here that takes the workers from 9% busy to 45%. Without timeouts, it's 369%.",
      "It's the same idea as N+1: pay for the bad day, not the average one.",
    ],
  ],
  [
    "alternative",
    "Would a circuit breaker help?",
    [
      "Yes: once calls are clearly failing, stop making them for a while, then try one.",
      "It saves workers' time and the provider's quota, and lets the provider recover.",
      "Messages wait on the queue while the breaker is open.",
    ],
  ],
  [
    "alternative",
    "Should you use two payment providers?",
    [
      "Failing over to a second one removes the single dependency.",
      "But it's two integrations, two contracts and two sets of edge cases to keep working.",
      "Worth it at large scale, or where payments are the whole business.",
    ],
  ],
  [
    "scale",
    "Orders triple on a holiday. What changes?",
    [
      "More workers, and a higher quota from the provider, arranged before the day.",
      "Check the quota against the retry load, not just the normal load.",
      "The {app-server} and {queue} scale as usual.",
    ],
  ],
  [
    "scale",
    "Your contract caps you at 200 calls a second. How do you stay under it?",
    [
      "Limit the workers' total call rate to the quota.",
      "Count retries against it: a slow day with immediate retries can blow through it.",
      "Ask for a higher quota well before you need it.",
    ],
  ],
  [
    "edge-case",
    "The provider charged the card but the response never arrived. What happens?",
    [
      "The worker times out and the message is retried with the same idempotency key.",
      "The provider recognises the key and returns 'already charged'.",
      "The order is marked paid. Without the key, the customer would be charged twice.",
    ],
  ],
  [
    "resilience",
    "The provider is down for an hour. What happens to orders?",
    [
      "They're saved and queued; customers see 'confirming payment'.",
      "Retries back off, and a circuit breaker stops hammering the provider.",
      "When it's back, the queue drains at the quota rate. Tell restaurants and customers what's happening.",
    ],
  ],
  [
    "resilience",
    "Some charges failed for good during the outage. How do you recover?",
    [
      "They're parked in a dead-letter queue with the reason.",
      "Replay them once the provider is healthy; idempotency keys make that safe.",
      "Orders whose cards were declined go to the 'try another card' flow.",
    ],
  ],
  [
    "security",
    "Where do card numbers live in this design?",
    [
      "Nowhere: the browser sends them straight to the provider and you get a token back.",
      "That keeps your systems out of the strictest card-data rules.",
      "Workers charge the token, never a card number.",
    ],
  ],
  [
    "security",
    "How do you keep the provider's API key safe?",
    [
      "Only the workers have it, from a secrets store, not from code or config files.",
      "Rotate it, and alert on unusual charge volumes.",
      "Use a key that can charge, but not refund or read every customer.",
    ],
  ],
  [
    "observability",
    "What would you watch?",
    [
      "The provider's p99 and error rate from your side, not just their status page.",
      "The age of the oldest charge on the queue.",
      "Charges per order: anything above one means a retry without its key.",
    ],
  ],
])

export const POISON_PILL = deck("poison-pill", [
  [
    "clarify",
    "What would you ask about the files people upload?",
    [
      "What formats and sizes? A 500-page scan is a different job from a one-page note.",
      "How quickly must previews appear? Seconds, or is a minute fine?",
      "What happens to a file that can't be converted: is the original still useful?",
    ],
    "If previews must appear in two seconds, what changes?",
  ],
  [
    "clarify",
    "What would you ask about failures?",
    [
      "How often does a conversion fail today, and why?",
      "Does a failing file fail every time, or sometimes succeed on a retry?",
      "Who fixes the converter when a new kind of file breaks it?",
    ],
  ],
  [
    "clarify",
    "What would you ask about the order of jobs?",
    [
      "Does it matter which upload is converted first?",
      "If one customer uploads ten thousand files, should others wait behind them?",
      "That decides whether one shared queue is enough.",
    ],
  ],
  [
    "product",
    "What does someone see when their file can't be converted?",
    [
      "The document, marked 'preview unavailable', with the original still downloadable.",
      "Ideally a reason: 'this file seems to be damaged'.",
      "Not a spinner that never stops.",
    ],
  ],
  [
    "product",
    "Should a failed file be retried automatically after a fix?",
    [
      "Yes: replay the dead-letter queue once the converter is fixed.",
      "Tell the user when their preview appears.",
      "That's only possible if the failed messages were kept, not dropped.",
    ],
  ],
  [
    "decision",
    "What should happen to a message after it fails three times?",
    [
      "Move it to a dead-letter queue, so the queue stops handing it out.",
      "Alert someone, with the file and the error.",
      "Without that, it's retried forever and holds up the work behind it.",
    ],
    "Why three, and not one or ten?",
  ],
  [
    "decision",
    "Why doesn't adding workers fix this?",
    [
      "The corrupt files keep coming back, so more workers just fail them more often.",
      "Here it takes nine workers instead of five, which breaks the budget.",
      "The fix is to stop retrying what can't succeed.",
    ],
  ],
  [
    "decision",
    "Where do the files and previews live?",
    [
      "In the {object-store}: the original first, then the previews next to it.",
      "The queue message holds a reference to the file, not the file itself.",
      "Metadata (owner, status) lives in a database or alongside the object.",
    ],
  ],
  [
    "decision",
    "How do you stop one file taking a worker down for good?",
    [
      "Run each conversion with a time limit and a memory limit.",
      "A conversion that hits either is killed and counted as a failure.",
      "The dead-letter queue then takes it after a few attempts.",
    ],
  ],
  [
    "tradeoff",
    "How many attempts before parking a message?",
    [
      "Too few parks messages that failed for a passing reason, such as a brief network error.",
      "Too many wastes workers on messages that will never succeed.",
      "Two or three, with backoff between them, is a common start.",
    ],
  ],
  [
    "tradeoff",
    "Should conversions retry immediately or after a delay?",
    [
      "After a growing delay: a passing failure often clears in seconds.",
      "Immediate retries of a message that crashes the converter just crash it again sooner.",
      "Most queues support a visibility timeout or a delay per attempt.",
    ],
  ],
  [
    "tradeoff",
    "What does a dead-letter queue cost you?",
    [
      "Someone has to watch it, investigate and replay. That's ongoing work.",
      "Parked messages are delayed work: those users wait until it's fixed.",
      "Compared with the alternative, a blocked pipeline, it's cheap.",
    ],
  ],
  [
    "alternative",
    "Could you validate files at upload instead?",
    [
      "It catches files that are obviously broken, cheaply, before they're queued.",
      "It can't catch files that only fail deep inside the converter.",
      "Do both: validate early, and still have a dead-letter queue.",
    ],
  ],
  [
    "alternative",
    "Could you just drop messages that fail?",
    [
      "It keeps the queue moving, but loses uploads silently.",
      "Nobody finds out until a customer complains.",
      "Parking them costs almost nothing more and loses nothing.",
    ],
  ],
  [
    "scale",
    "Uploads double. What changes?",
    [
      "More workers, sized for peak uploads with headroom.",
      "Watch the dead-letter rate as well: twice the uploads can mean twice the parked messages.",
      "The {object-store} and {queue} scale on their own.",
    ],
  ],
  [
    "scale",
    "One customer uploads 100,000 files at once. What happens?",
    [
      "Everyone else's previews wait behind them in a shared queue.",
      "A separate queue for bulk imports, or a per-customer limit, keeps others moving.",
      "Show the bulk uploader a progress bar, not a promise.",
    ],
  ],
  [
    "edge-case",
    "A file fails twice, then succeeds. Is that a problem?",
    [
      "Not by itself: retries are for exactly that.",
      "But a pattern of it suggests a flaky dependency or a resource limit worth fixing.",
      "Make sure the half-made previews from failed attempts are cleaned up.",
    ],
  ],
  [
    "resilience",
    "The converter bug is fixed. How do you replay the parked messages safely?",
    [
      "Replay slowly, at a fraction of normal capacity, so new uploads don't wait.",
      "Make conversion safe to repeat, so a message processed twice just overwrites the previews.",
      "Watch the dead-letter queue: if replayed messages land back there, stop.",
    ],
  ],
  [
    "resilience",
    "A worker crashes in the middle of a conversion. Is the upload lost?",
    [
      "No: the message wasn't acknowledged, so the queue hands it to another worker.",
      "That's why consumers acknowledge only after the previews are saved.",
      "It's also why the work must be safe to repeat.",
    ],
  ],
  [
    "security",
    "Could a malicious file attack the converter?",
    [
      "Yes: converters parse complex formats and have had real vulnerabilities.",
      "Run conversions in an isolated sandbox with no network and minimal permissions.",
      "Limit file sizes and page counts before converting.",
    ],
  ],
  [
    "security",
    "Who can see a document's previews?",
    [
      "The same people who can see the document: check access before serving either.",
      "Don't serve previews from public, guessable URLs.",
      "Use short-lived signed links from the {object-store}.",
    ],
  ],
  [
    "observability",
    "What would you watch?",
    [
      "The dead-letter queue's size and arrival rate: a spike means a new kind of failure.",
      "The age of the oldest message on the main queue.",
      "Conversion failures by file type, to find what breaks the converter.",
    ],
  ],
])

export const LOGIN_FLOOD = deck("login-flood", [
  [
    "clarify",
    "What would you ask about the attack?",
    [
      "Is it many guesses at a few accounts, or a few guesses at many accounts? Leaked-password lists do the second.",
      "From a handful of addresses, or spread across thousands?",
      "Is it hitting only sign-in, or other endpoints too?",
    ],
    "If it comes from thousands of addresses, what does a per-address limit still do?",
  ],
  [
    "clarify",
    "What would you ask about real users' sign-ins?",
    [
      "How many sign-ins a second at a normal peak?",
      "Do many users share an address, such as a university or an office?",
      "How do people sign in: passwords, passkeys, single sign-on?",
    ],
  ],
  [
    "clarify",
    "Which endpoints need sign-in?",
    [
      "Almost all of them: watch history, profiles and recommendations are personal.",
      "The public catalogue page may not, but it shouldn't reveal anything personal.",
      "Make 'requires sign-in' the default, and opt out deliberately.",
    ],
  ],
  [
    "product",
    "What should a real user see if they're rate-limited?",
    [
      "A clear 'too many attempts, try again in a minute', not a generic error.",
      "A way to prove they're human, such as a CAPTCHA, instead of a hard block.",
      "An email if their account was the target, so they can change the password.",
    ],
  ],
  [
    "product",
    "Should you tell users their password was found in a leak?",
    [
      "Yes: check passwords against known-leaked lists at sign-in and ask them to change it.",
      "Offer passkeys or two-factor sign-in as the better option.",
      "Reused passwords are what makes credential stuffing work.",
    ],
  ],
  [
    "decision",
    "Where does the rate limit go?",
    [
      "Where traffic first lands: here the {load-balancer}, or an {api-gateway}.",
      "Then attack traffic is turned away before it costs the servers anything.",
      "Limiting deep inside the app means the attack has already used capacity to get there.",
    ],
    "What do you limit per: address, account, or both?",
  ],
  [
    "decision",
    "Why can't you just add servers?",
    [
      "The attack is four times normal traffic. Even forty servers fail 16% of requests and break the budget.",
      "The attacker can always send more; you'd be paying for their traffic.",
      "Limiting is cheaper than absorbing.",
    ],
  ],
  [
    "decision",
    "What does the {app-server} check on every request?",
    [
      "That the request carries a valid session, and whose it is.",
      "That the record asked for belongs to that user.",
      "A request without a session gets a 401, and nothing else.",
    ],
  ],
  [
    "decision",
    "How do you limit sign-in attempts per account?",
    [
      "Count failed attempts per account over a time window, wherever they come from.",
      "After a few, slow down or ask for a CAPTCHA, rather than locking the account.",
      "Locking accounts outright lets an attacker lock out real users on purpose.",
    ],
  ],
  [
    "tradeoff",
    "A limit per address or per account?",
    [
      "Per address stops one source, but blocks everyone behind a shared address.",
      "Per account stops slow guessing at one account from many addresses.",
      "Use both, with higher limits for known good sources.",
    ],
  ],
  [
    "tradeoff",
    "How strict should the limit be?",
    [
      "Strict enough that an attacker gets little through.",
      "Loose enough that a busy evening, or a family on one connection, isn't blocked.",
      "Set it from normal traffic data, and watch how often real users hit it.",
    ],
  ],
  [
    "tradeoff",
    "Check sessions at an {api-gateway} or in each service?",
    [
      "A gateway checks once, in one place, for every service.",
      "Each service still checks that the user may see the specific record.",
      "Relying only on the gateway is fine until a service is reachable another way.",
    ],
  ],
  [
    "alternative",
    "Would passkeys make this attack pointless?",
    [
      "For users who adopt them, yes: there's no password to steal or reuse.",
      "Most users will still have passwords for years, so you still need limits.",
      "Offer them, and nudge people towards them.",
    ],
  ],
  [
    "alternative",
    "Could a bot-detection service do this for you?",
    [
      "It can spot automated traffic by behaviour, which plain limits can't.",
      "It adds cost and a dependency on the request path.",
      "It's a layer on top of rate limits, not a replacement.",
    ],
  ],
  [
    "scale",
    "The attack grows to 20 times normal traffic. What then?",
    [
      "The limit still turns it away at the edge, as long as the edge can take the volume.",
      "A managed edge or {cdn} with attack protection absorbs floods that would overwhelm your balancer.",
      "Make sure the limit doesn't depend on the servers being healthy.",
    ],
  ],
  [
    "scale",
    "Real sign-ins spike when a new season of a show drops. Does the limit get in the way?",
    [
      "Only if it's set from an average day. Set it from known peaks.",
      "Limits per account barely affect real users, who sign in once.",
      "Watch the share of real users hitting limits during the launch.",
    ],
  ],
  [
    "edge-case",
    "An attacker guesses one account's password correctly. What then?",
    [
      "Sign-in from a new device or place should ask for a second factor or confirm by email.",
      "Alert the user to the new sign-in.",
      "Let them sign out every session from their settings.",
    ],
  ],
  [
    "resilience",
    "The rate-limiting component itself fails. What happens?",
    [
      "Decide in advance: let traffic through unlimited, or block everything.",
      "For a managed balancer, it's redundant across zones and rarely the weak point.",
      "If the limit's counters live in a shared {cache}, losing it shouldn't take sign-in down.",
    ],
  ],
  [
    "resilience",
    "After the attack, some accounts were taken over. How do you recover?",
    [
      "Reset their passwords and sign out their sessions.",
      "Undo what the attacker changed, such as the account's email address.",
      "Look for the pattern in logs to find others, and tell affected users.",
    ],
  ],
  [
    "security",
    "Should a failed sign-in say whether the email exists?",
    [
      "No: 'wrong email or password' for both, so attackers can't list valid accounts.",
      "The same goes for sign-up and password reset pages.",
      "Keep the responses the same speed too, so timing doesn't give it away.",
    ],
  ],
  [
    "security",
    "How should passwords be stored?",
    [
      "Hashed with a slow, salted password-hashing function, never encrypted or plain.",
      "A slow hash makes each guess expensive if the database ever leaks.",
      "That's another reason sign-in endpoints need limits: each check costs CPU.",
    ],
  ],
  [
    "observability",
    "How would you know an attack is happening?",
    [
      "Alert on failed sign-ins per minute, and on the share of requests turned away by the limit.",
      "Watch for many accounts failing from a few addresses, or one account failing from many.",
      "Track successful sign-ins from new devices, which rise when guesses start working.",
    ],
  ],
])

export const BAD_MIGRATION = deck("bad-migration", [
  [
    "clarify",
    "What would you ask about how much data can be lost?",
    [
      "If you had to restore, how many minutes of recent results could the labs lose? That's the RPO. Here it's 15.",
      "How long could the notebook be unavailable during a restore? That's the RTO.",
      "Is some data more precious than the rest, such as raw instrument files?",
    ],
    "What if the labs say 'none at all'?",
  ],
  [
    "clarify",
    "What would you ask about how migrations are run today?",
    [
      "Who writes and reviews them, and are they tested on a copy of real data first?",
      "Do they run automatically on deploy, or by hand?",
      "Can a migration be undone without a restore?",
    ],
  ],
  [
    "clarify",
    "What would you ask about the attached files?",
    [
      "Do files ever get deleted or overwritten?",
      "Must a restore bring the files back to the same moment as the database?",
      "How long must deleted files be recoverable?",
    ],
  ],
  [
    "product",
    "What do scientists see while a restore runs?",
    [
      "A clear notice that the notebook is read-only or paused, and when it's expected back.",
      "Whether recent entries may need to be re-added.",
      "Afterwards, a list of what was restored and what wasn't.",
    ],
  ],
  [
    "product",
    "Should users be able to undo their own deletions?",
    [
      "Yes: a 'recently deleted' area for days or weeks saves most restores.",
      "It handles one person's mistake; backups handle the system's.",
      "Versioning on the {object-store} does the same for files.",
    ],
  ],
  [
    "decision",
    "Why doesn't the standby protect against this?",
    [
      "A standby copies every change within a second, including the bad migration.",
      "It protects against a machine failing, not a mistake.",
      "Only a backup, from before the mistake, has the data.",
    ],
    "What about a read replica?",
  ],
  [
    "decision",
    "Daily backups or point-in-time recovery?",
    [
      "Daily backups restore to last night: up to a day of results lost, against a 15-minute limit.",
      "Point-in-time recovery replays the database's change log to any minute.",
      "The RPO decides, not habit.",
    ],
  ],
  [
    "decision",
    "What about the files in the {object-store}?",
    [
      "Turn on versioning, so overwritten or deleted files keep their earlier versions.",
      "Then the files can be rolled back to the same moment as the database.",
      "Restoring only the database leaves results pointing at the wrong files.",
    ],
  ],
  [
    "decision",
    "How do you actually restore?",
    [
      "Restore a copy of the database to the minute before the migration, alongside the live one.",
      "Check it, then switch the app over, or copy back just the damaged column.",
      "Restoring into a copy first means a mistake in the restore isn't a second disaster.",
    ],
  ],
  [
    "tradeoff",
    "What does point-in-time recovery cost?",
    [
      "Storage for the change log, for as long as you keep it.",
      "Restore time grows with how much log has to be replayed.",
      "Usually far cheaper than the data it protects.",
    ],
  ],
  [
    "tradeoff",
    "How long should backups be kept?",
    [
      "At least as long as it might take to notice a mistake. Some take weeks to spot.",
      "Longer means more storage, and more old personal data to look after.",
      "Keep recent ones at minute detail, and older ones daily.",
    ],
  ],
  [
    "tradeoff",
    "Restore the whole database, or copy back just the damaged data?",
    [
      "A full restore loses every good write made since the mistake.",
      "Copying back one column or table from a restored copy keeps the rest of today's work.",
      "The second is more work, and usually worth it.",
    ],
  ],
  [
    "alternative",
    "Would a delayed replica help?",
    [
      "A replica kept an hour behind lets you stop it before it applies a mistake.",
      "It only helps if someone notices within the hour.",
      "It's a fast first line, not a replacement for backups.",
    ],
  ],
  [
    "alternative",
    "Could migrations be made safe to undo?",
    [
      "Yes: add the new column, move data across, and drop the old one only later.",
      "Then a mistake is reversible without restoring anything.",
      "Test migrations against a copy of production data first.",
    ],
  ],
  [
    "scale",
    "The database grows tenfold. Does the restore plan still work?",
    [
      "Restores take longer, so check the RTO again by actually timing one.",
      "Restoring one table or one tenant becomes more valuable than restoring everything.",
      "Sharding helps: each shard restores on its own, in parallel.",
    ],
  ],
  [
    "scale",
    "More labs join, each with their own contract. Does the RPO change?",
    [
      "Different customers may need different limits; meet the strictest, or separate them.",
      "Put the RPO and RTO in writing, so everyone knows what a restore can promise.",
      "Test that every store involved can meet it, not just the database.",
    ],
  ],
  [
    "edge-case",
    "The mistake is noticed three days later. Now what?",
    [
      "Point-in-time recovery works only if the log is kept for at least three days.",
      "A full restore would lose three days of good work, so copy back just the damaged data.",
      "This is why retention must match how long mistakes take to spot.",
    ],
  ],
  [
    "resilience",
    "When did you last test a restore?",
    [
      "An untested backup is a hope. Restore into a copy regularly, on a schedule.",
      "Time it, to know the real RTO.",
      "Check the restored data actually works with the app.",
    ],
  ],
  [
    "resilience",
    "An attacker deletes the database and its backups. What protects you?",
    [
      "Backups that can't be deleted, even by an administrator, for a set period.",
      "A copy in a separate account or project with different credentials.",
      "Alerts when backups are deleted or their retention is changed.",
    ],
  ],
  [
    "security",
    "Are backups as sensitive as the database?",
    [
      "Yes: they hold the same data, often for longer.",
      "Encrypt them and limit who can restore them.",
      "Restoring a backup into an unprotected place is a classic leak.",
    ],
  ],
  [
    "security",
    "Who can run a migration on production?",
    [
      "Only the deploy pipeline, after review, not individual engineers from a laptop.",
      "Emergency access is logged and time-limited.",
      "The same rules apply to the restore tools.",
    ],
  ],
  [
    "observability",
    "How would you notice a bad migration quickly?",
    [
      "Alert on sudden changes in row counts or null values in key columns after a deploy.",
      "Track errors and empty results in the app right after each migration.",
      "Check daily that the latest backup exists and restores.",
    ],
  ],
])

export const NOBODY_NOTICED = deck("nobody-noticed", [
  [
    "clarify",
    "What would you ask about the invoices?",
    [
      "How quickly must an invoice go out after it's requested? Minutes, or by the end of the day?",
      "What happens if an invoice is late: a missed payment, an angry customer, a breach of contract?",
      "Is there a monthly peak, such as the first of the month?",
    ],
    "If invoices only need to go out by the end of the day, how does that change the alert?",
  ],
  [
    "clarify",
    "What would you ask about how failures show up today?",
    [
      "What happens when a worker hangs: does anything restart it?",
      "What do the health checks actually test?",
      "Who gets told when the pipeline stops, and how?",
    ],
  ],
  [
    "clarify",
    "What would you ask about who's on call?",
    [
      "Is someone paged at night, or only during working hours?",
      "Is there a written first step for each alert?",
      "An alert nobody acts on is the same as no alert.",
    ],
  ],
  [
    "product",
    "A customer asks where their invoice is. What can support see?",
    [
      "Its status: requested, rendering, sent, or stuck.",
      "How long it's been waiting.",
      "A way to resend it once the system is fixed.",
    ],
  ],
  [
    "product",
    "Invoices are hours late after an incident. What do customers see?",
    [
      "An honest notice if they ask, and invoices arriving as the backlog drains.",
      "No duplicate invoices when the stuck ones are retried.",
      "If due dates are affected, an adjusted due date.",
    ],
  ],
  [
    "decision",
    "What alert would catch hung workers?",
    [
      "The age of the oldest message on the queue: if it's more than a few minutes, something has stopped.",
      "It catches any stopped consumer, whatever the cause.",
      "A per-worker alert on jobs finished per minute catches it too.",
    ],
    "Why is queue age better than queue length?",
  ],
  [
    "decision",
    "Why didn't the health checks catch it?",
    [
      "They ask 'is the process running?', and a hung process is running.",
      "A deeper check does a small piece of real work, such as rendering a test page.",
      "Even then, an alert on the outcome (invoices going out) is the one that matters.",
    ],
  ],
  [
    "decision",
    "How many workers, and why?",
    [
      "Three: two can carry the 20 invoices a second while one is being replaced.",
      "Sized for the bad day, not the average one: N+1.",
      "With alerts, a hung worker is a short dip, not a stopped pipeline.",
    ],
  ],
  [
    "decision",
    "What does whoever's paged actually do?",
    [
      "Check the queue's age and which workers have stopped finishing jobs.",
      "Restart the stuck workers, and watch the backlog drain.",
      "Then find why they hung, so it doesn't happen again.",
    ],
  ],
  [
    "tradeoff",
    "What threshold should the queue-age alert have?",
    [
      "Too low, and normal bursts page someone for nothing.",
      "Too high, and the backlog is huge before anyone acts.",
      "Base it on how late an invoice may be, minus the time to fix.",
    ],
  ],
  [
    "tradeoff",
    "Restart workers automatically, or page a person?",
    [
      "Automatic restarts fix it at 3am without waking anyone.",
      "But they can hide a bug that keeps happening.",
      "Do both: restart automatically, and alert if it keeps happening.",
    ],
  ],
  [
    "tradeoff",
    "How many alerts are too many?",
    [
      "Every alert should mean someone must act now.",
      "Alerts that fire and get ignored train people to ignore all alerts.",
      "Keep a few, tied to what users feel, and put the rest on dashboards.",
    ],
  ],
  [
    "alternative",
    "Could each job have a time limit instead?",
    [
      "Yes: a job running much longer than normal is killed and retried.",
      "It stops one stuck job holding a worker forever.",
      "It doesn't help if every job hangs on the same broken connection, so keep the alert.",
    ],
  ],
  [
    "alternative",
    "Would tracing help here?",
    [
      "A trace of a sample of invoices shows where each one spent its time.",
      "It turns 'invoices are late' into 'workers are waiting on this one connection'.",
      "It helps find the cause; the alert is what tells you to look.",
    ],
  ],
  [
    "scale",
    "Invoices quadruple on the first of the month. What changes?",
    [
      "More workers for that day, or a scheduled scale-up before it.",
      "The queue-age threshold may need to allow for a planned backlog.",
      "Check the {object-store} and database limits too.",
    ],
  ],
  [
    "scale",
    "There are now ten pipelines like this one. How do you watch them all?",
    [
      "The same few alerts on every queue: age of the oldest message, and the dead-letter rate.",
      "A shared dashboard, so anyone on call can read any pipeline.",
      "Owners per pipeline, so every alert has someone to act on it.",
    ],
  ],
  [
    "edge-case",
    "A worker hangs halfway through rendering an invoice. Is it sent twice after a restart?",
    [
      "It could be, if the email was sent but the job wasn't marked done.",
      "Record 'sent' with the invoice ID before or with sending, and check it on retry.",
      "That's idempotency again, for emails instead of payments.",
    ],
  ],
  [
    "resilience",
    "Why did all the workers hang at once?",
    [
      "They shared something that stopped answering: a database connection, a font server, a network path.",
      "Without a timeout on that call, each one waited forever.",
      "Timeouts on every call and the queue-age alert together turn this into a short dip.",
    ],
  ],
  [
    "resilience",
    "The backlog is hours long. How do you catch up safely?",
    [
      "Add workers temporarily, as long as the database and {object-store} can take the load.",
      "Send the oldest invoices first.",
      "Make sure nothing is sent twice while catching up.",
    ],
  ],
  [
    "security",
    "Invoice PDFs contain personal and financial details. How are they protected?",
    [
      "Stored encrypted, and served only to the account's owner through short-lived links.",
      "Not attached to emails in full where a link to a signed-in page works.",
      "Logs never include the invoice contents.",
    ],
  ],
  [
    "security",
    "Who can resend or edit an invoice?",
    [
      "Support staff with a specific permission, and every action logged.",
      "Changes create a new version; the original is kept.",
      "Customers can request a resend, but not change amounts.",
    ],
  ],
  [
    "observability",
    "Which three alerts would you set up first?",
    [
      "The age of the oldest message on the invoice queue.",
      "Error rate and p99 on the app tier, the numbers customers feel.",
      "The dead-letter queue's arrival rate, for invoices that fail for good.",
    ],
  ],
])
