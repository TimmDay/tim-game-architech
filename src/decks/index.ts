import {
  FEED_THE_ANALYSTS,
  FIRST_CUSTOMERS,
  FRONT_PAGE,
  GOING_VIRAL,
  PLUG_FINDER,
  SHOEBOX_RECEIPTS,
  STEP_COUNTER,
  UPLOAD_RUSH,
  ZONE_OUTAGE,
} from "./build"
import {
  BALANCE_SHEET,
  CLAIM_YOUR_NAME,
  FULL_BASKET,
  LIKE_STORM,
  TENANT_SPLIT,
} from "./cap"
import {
  GROUP_CHAT,
  HOME_TIMELINE,
  RIDE_HAILING,
  SHORT_LINKS,
  TICKET_DROP,
  TYPEAHEAD,
  PUSH_ALERTS,
  WEB_CRAWLER,
  PAY_BUTTON,
  VIDEO_NIGHT,
} from "./classics"
import {
  ANALYTICS_ATE_PROD,
  BLACK_FRIDAY,
  HALF_THE_ORDERS,
  LOST_WRITES,
  SLOW_CHECKOUT,
  THREE_AM_PAGE,
} from "./repair"
import {
  BAD_MIGRATION,
  LOGIN_FLOOD,
  NOBODY_NOTICED,
  POISON_PILL,
  SLOW_PARTNER,
} from "./ops"
import { TOPICS } from "./topics"
import type { DeckCard } from "./types"

export const DECKS: Record<string, DeckCard[]> = {
  "first-customers": FIRST_CUSTOMERS,
  "front-page": FRONT_PAGE,
  "going-viral": GOING_VIRAL,
  "upload-rush": UPLOAD_RUSH,
  "step-counter": STEP_COUNTER,
  "zone-outage": ZONE_OUTAGE,
  "feed-the-analysts": FEED_THE_ANALYSTS,
  "shoebox-receipts": SHOEBOX_RECEIPTS,
  "plug-finder": PLUG_FINDER,
  "short-links": SHORT_LINKS,
  "group-chat": GROUP_CHAT,
  "home-timeline": HOME_TIMELINE,
  "ticket-drop": TICKET_DROP,
  "video-night": VIDEO_NIGHT,
  "ride-hailing": RIDE_HAILING,
  typeahead: TYPEAHEAD,
  "push-alerts": PUSH_ALERTS,
  "web-crawler": WEB_CRAWLER,
  "pay-button": PAY_BUTTON,
  "balance-sheet": BALANCE_SHEET,
  "full-basket": FULL_BASKET,
  "tenant-split": TENANT_SPLIT,
  "like-storm": LIKE_STORM,
  "claim-your-name": CLAIM_YOUR_NAME,
  "slow-partner": SLOW_PARTNER,
  "poison-pill": POISON_PILL,
  "login-flood": LOGIN_FLOOD,
  "bad-migration": BAD_MIGRATION,
  "nobody-noticed": NOBODY_NOTICED,
  "lost-writes": LOST_WRITES,
  "black-friday": BLACK_FRIDAY,
  "slow-checkout": SLOW_CHECKOUT,
  "three-am-page": THREE_AM_PAGE,
  "analytics-ate-prod": ANALYTICS_ATE_PROD,
  "half-the-orders": HALF_THE_ORDERS,
  ...Object.fromEntries(TOPICS.map((t) => [t.id, t.cards])),
}

/** Fundamentals topics' titles, by deck id: a deck's heading when it has no level. */
export const DECK_TITLES: Record<string, string> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t.title]),
)
