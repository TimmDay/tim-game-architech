import {
  FEED_THE_ANALYSTS,
  FIRST_CUSTOMERS,
  FRONT_PAGE,
  GOING_VIRAL,
  PLUG_FINDER,
  SHOEBOX_RECEIPTS,
  UPLOAD_RUSH,
  ZONE_OUTAGE,
} from "./build"
import {
  GROUP_CHAT,
  HOME_TIMELINE,
  RIDE_HAILING,
  SHORT_LINKS,
  TICKET_DROP,
  TYPEAHEAD,
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
import type { DeckCard } from "./types"

export const DECKS: Record<string, DeckCard[]> = {
  "first-customers": FIRST_CUSTOMERS,
  "front-page": FRONT_PAGE,
  "going-viral": GOING_VIRAL,
  "upload-rush": UPLOAD_RUSH,
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
  "lost-writes": LOST_WRITES,
  "black-friday": BLACK_FRIDAY,
  "slow-checkout": SLOW_CHECKOUT,
  "three-am-page": THREE_AM_PAGE,
  "analytics-ate-prod": ANALYTICS_ATE_PROD,
  "half-the-orders": HALF_THE_ORDERS,
}
