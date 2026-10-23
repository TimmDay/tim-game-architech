# Security

What protects the game and its players' data, and what's left to do. Last reviewed 23 October 2026.

## Player data

- **One document per player**, `users/{uid}/save/main` in Firestore (`australia-southeast1`). No other collection is readable or writable.
- **Security rules** (`firestore.rules`):
  - Only the signed-in owner can read or write it.
  - Every write is checked for shape and size, and must carry the server's timestamp.
  - Writes closer together than 2 seconds are refused.

  The rules are tested against the emulator in CI (`rules-tests/`). Deploy changes with `npx firebase-tools deploy --only firestore:rules`.

- **Sign-in** is GitHub or Google only. Email/password, anonymous and phone sign-in are disabled, and email enumeration protection is on.
- **Guests** never touch the server: their progress stays in the tab's sessionStorage.
- **What the client could fake:** scores are computed in the browser, so a player can edit their _own_ save. That's harmless while saves are private. Any public leaderboard needs server-side validation first.

## Abuse and cost

- **Free Spark plan:** no billing account, so a flood of traffic hits the daily quotas and stops rather than costing money.
- **Writes are batched** and sent only when synced content changes.
- **Browser API key:** restricted to the live domains and local dev ports, and to the five APIs the app uses (Auth ×2, Firestore, Installations, App Check).
- **App Check:** wired in but **not yet enforced** (see below).

## The site

- **Content Security Policy** on the app page:
  - Scripts, connections and frames only from this site, Google's sign-in and Firestore endpoints, and reCAPTCHA.
  - `frame-ancestors 'none'` and `X-Frame-Options: DENY` against clickjacking.
  - `object-src 'none'`, and a locked-down `base-uri` and `form-action`.
- **Other headers:** HSTS (Firebase's default), `nosniff`, a strict referrer policy, and a permissions policy that turns off camera, microphone and geolocation.
- **Unsafe DOM APIs:** none used (`innerHTML`, `eval`, `dangerouslySetInnerHTML`).

## Deploys and supply chain

- **Keyless deploys:**
  - GitHub Actions authenticates to Google with Workload Identity Federation: a short-lived token, accepted only from `TimmDay/tim-game-architech`.
  - It acts as `github-deploy`, which can manage Hosting and nothing else.
  - There is no stored deploy key.
- **Pinned actions:** third-party Actions are pinned to commit SHAs.
- **Dependabot:** vulnerability alerts and security fixes are on, plus weekly update PRs for npm and Actions (`.github/dependabot.yml`).
- **Dependency audit:** production dependencies audit clean. Remaining advisories are in `firebase-tools`, a CLI used only locally and in CI.
- **Git history:** scanned for secrets, with none found. `.env.local` is gitignored, and the Firebase web config is public by design.

## To do

- [ ] **Enforce App Check:**
  1. Create a reCAPTCHA v3 key (free) for the live domains.
  2. Register it in Firebase → App Check, and set the `VITE_FIREBASE_APPCHECK_SITE_KEY` repo variable.
  3. Watch the metrics for a few days, then enforce for Firestore and Auth.
- [ ] **Custom domain:** add it to the API key's allowed referrers and the CSP's `frame-src`, as well as the steps in `TODO.md`.
- [ ] **Leaderboards:** validate scores server-side before publishing any (needs a Cloud Function, and the paid Blaze plan).
