# TODO

Security posture and its to-dos are in [docs/SECURITY.md](docs/SECURITY.md).

## Done

- Sign-in with GitHub and Google (Firebase Auth), plus "continue as guest" (sessionStorage, this tab only).
- Cross-device sync: one Firestore document per player, `users/{uid}/save/main`, in `australia-southeast1`. Local storage stays the fast copy; sync merges it with the cloud on sign-in, pushes batched changes, and merges other devices' changes live.
- Security rules: owner-only access, shape and size checks, 2-second write throttle, everything else denied. Tested against the emulator in CI.

## Still to do

- [ ] **Enable App Check enforcement.** Create a reCAPTCHA v3 key (free), register it in Firebase App Check, set `VITE_FIREBASE_APPCHECK_SITE_KEY`, watch the App Check metrics for a few days, then turn on enforcement for Firestore and Auth.
- [ ] **Sync builds in progress?** Boards you're mid-way through stay on the device that drew them. Probably fine; revisit if it annoys.
- [ ] **Leaderboards.** Scores are computed in the browser, so a player can edit their own save. That's harmless while saves are private; before any public leaderboard, recompute or validate scores server-side (a Cloud Function), which needs the paid Blaze plan.
- [ ] **Account deletion.** Add a "delete my data" button that removes `users/{uid}/save/main` (the rules already allow the owner to delete).

## Hosting

Live at https://tim-game-architech.firebaseapp.com (also `.web.app`), deployed by `.github/workflows/deploy.yml` on every push to `main`; PRs get preview channels. The build reads the `VITE_FIREBASE_*` GitHub repository variables; the deploy uses the `FIREBASE_SERVICE_ACCOUNT` secret (a Hosting-only service account).

- [ ] **Custom domain** (e.g. architech.timmday.com): add it in Firebase Hosting, add the DNS records, then set `VITE_FIREBASE_AUTH_DOMAIN` to it (so iOS redirect sign-in stays same-site), add it to Auth's authorised domains, add `https://<domain>/__/auth/handler` to the Google OAuth client's redirect URIs and to the GitHub OAuth app.
- [ ] Firestore rules aren't deployed by CI: run `npx firebase-tools deploy --only firestore:rules` when `firestore.rules` changes.
