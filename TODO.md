# TODO

## Done

- Sign-in with GitHub and Google (Firebase Auth), plus "continue as guest" (sessionStorage, this tab only).
- Cross-device sync: one Firestore document per player, `users/{uid}/save/main`, in `australia-southeast1`. Local storage stays the fast copy; sync merges it with the cloud on sign-in, pushes batched changes, and merges other devices' changes live.
- Security rules: owner-only access, shape and size checks, 2-second write throttle, everything else denied. Tested against the emulator in CI.

## Still to do

- [ ] **Enable App Check enforcement.** Create a reCAPTCHA v3 key (free), register it in Firebase App Check, set `VITE_FIREBASE_APPCHECK_SITE_KEY`, watch the App Check metrics for a few days, then turn on enforcement for Firestore and Auth.
- [ ] **Sync builds in progress?** Boards you're mid-way through stay on the device that drew them. Probably fine; revisit if it annoys.
- [ ] **Leaderboards.** Scores are computed in the browser, so a player can edit their own save. That's harmless while saves are private; before any public leaderboard, recompute or validate scores server-side (a Cloud Function), which needs the paid Blaze plan.
- [ ] **Account deletion.** Add a "delete my data" button that removes `users/{uid}/save/main` (the rules already allow the owner to delete).

## Before deploying

- [ ] Add the production domain to Firebase Auth → Settings → Authorised domains (and to the reCAPTCHA key's domains).
- [ ] Set the `VITE_FIREBASE_*` variables on the host (see `.env.example`).
- [ ] Deploy rules with `npx firebase-tools deploy --only firestore:rules` whenever `firestore.rules` changes.
