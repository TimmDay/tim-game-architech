# TODO

## Move saves off localStorage

Sign-in exists (Firebase Auth, GitHub and Google), but every save still lives in the browser's localStorage, namespaced per account (`lb.u.<uid>.*`). So progress is per account **per device**: signing in on a phone won't show what you earned on a laptop, and clearing site data loses it.

To fix:

- [ ] **Choose the store.** Cloud Firestore fits: same Firebase project, offline cache built in, and the data is document-shaped (one doc per level's progress, one for points and review state, one per deck/quiz record). Security rule: a user can read and write only `users/{uid}/**`.
- [ ] **Sync design.** Keep localStorage as the fast local copy and sync it to Firestore. Points totals need care: merge one-time awards (`awarded` keys) as a union and recompute `total` from them, rather than last-write-wins on the number.
- [ ] **Migration.** On first sync for an account, upload its existing local save.
- [ ] **Leaderboards (optional).** Survival best wave and rank are natural candidates once scores live server-side, but they need anti-cheat thought: today every score is computed in the browser.

## Before deploying sign-in

- [ ] Add the production domain to Firebase Auth → Settings → Authorised domains.
- [ ] Set the `VITE_FIREBASE_*` variables on the host (see `.env.example`).
- [ ] Update the GitHub OAuth app's callback URL if the auth domain changes.
