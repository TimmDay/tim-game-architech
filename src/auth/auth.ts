import { useSyncExternalStore } from "react"
import { GUEST, switchProfile } from "~/game/profile"
import { startSync, stopSync } from "~/sync/cloud"
import { readSave } from "~/sync/local"

/**
 * Sign-in with GitHub or Google, through Firebase Auth.
 *
 * Optional by design: with no Firebase config in the environment the game
 * runs exactly as before, as a guest, and the account button explains that
 * sign-in isn't set up. The Firebase SDK is loaded only when config exists,
 * so guests on a phone don't download it.
 */
export type AuthUser = {
  uid: string
  name: string
  email: string | null
  photo: string | null
  provider: "github" | "google" | "other"
}

export type AuthState =
  | { status: "disabled" }
  | { status: "loading" }
  | { status: "signed-out"; error?: string }
  /** Chose "continue as guest": progress lasts for this tab only. */
  | { status: "guest" }
  | { status: "signed-in"; user: AuthUser }

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}
/** reCAPTCHA v3 site key for App Check (free; no billing needed). Optional. */
const appCheckKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY as
  string | undefined
export const authConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
)

let state: AuthState = authConfigured
  ? { status: "loading" }
  : { status: "disabled" }
const listeners = new Set<() => void>()
const set = (s: AuthState) => {
  state = s
  for (const l of listeners) l()
}

export const useAuth = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => state,
  )

type Sdk = {
  app: import("firebase/app").FirebaseApp
  auth: import("firebase/auth").Auth
  mod: typeof import("firebase/auth")
}
let sdk: Promise<Sdk> | null = null

function load(): Promise<Sdk> {
  sdk ??= (async () => {
    const [{ initializeApp }, mod] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
    ])
    const app = initializeApp(config as Required<typeof config>)
    // App Check: Firestore and Auth then only accept requests carrying a
    // token from this site, which shuts out scripts calling the APIs directly.
    if (appCheckKey) {
      const ac = await import("firebase/app-check")
      ac.initializeAppCheck(app, {
        provider: new ac.ReCaptchaV3Provider(appCheckKey),
        isTokenAutoRefreshEnabled: true,
      })
    }
    const auth = mod.getAuth(app)
    await mod.setPersistence(auth, mod.browserLocalPersistence)
    return { app, auth, mod }
  })()
  return sdk
}

const toUser = (u: import("firebase/auth").User): AuthUser => {
  const p = u.providerData[0]?.providerId
  return {
    uid: u.uid,
    name: u.displayName ?? u.email ?? "Player",
    email: u.email,
    photo: u.photoURL,
    provider:
      p === "github.com" ? "github" : p === "google.com" ? "google" : "other",
  }
}

/** Start listening for the signed-in user. Call once at startup. */
export async function startAuth() {
  if (!authConfigured) return
  try {
    const { app, auth, mod } = await load()
    // Finishes a redirect sign-in, if one is in flight (installed iOS apps).
    await mod.getRedirectResult(auth).catch(() => null)
    mod.onAuthStateChanged(auth, (u) => {
      if (u) {
        // Fold this tab's guest play, and the device's pre-sign-in save (once
        // per device), into the account before syncing it.
        const extras = [readSave(GUEST)]
        if (!legacyClaimed()) {
          extras.push(readSave(null))
          markLegacyClaimed()
        }
        clearGuestSession()
        switchProfile(u.uid)
        set({ status: "signed-in", user: toUser(u) })
        void startSync(app, u.uid, extras)
      } else {
        stopSync()
        if (guestSession()) {
          switchProfile(GUEST)
          set({ status: "guest" })
        } else {
          switchProfile(null)
          set({ status: "signed-out" })
        }
      }
    })
  } catch {
    set({
      status: "signed-out",
      error: "Sign-in couldn't start. Playing as a guest.",
    })
  }
}

/** Installed iOS web apps can't open popups, so they go by redirect. */
const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true

export async function signIn(which: "github" | "google") {
  if (!authConfigured) return
  const { auth, mod } = await load()
  const provider =
    which === "github"
      ? new mod.GithubAuthProvider()
      : new mod.GoogleAuthProvider()
  try {
    if (standalone()) await mod.signInWithRedirect(auth, provider)
    else await mod.signInWithPopup(auth, provider)
  } catch (e) {
    const code = (e as { code?: string }).code ?? ""
    if (code === "auth/popup-blocked")
      return mod.signInWithRedirect(auth, provider)
    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    )
      return
    set({
      status: "signed-out",
      error:
        code === "auth/account-exists-with-different-credential"
          ? "That email already signed in with the other provider. Use that one."
          : "Sign-in failed. Try again, or keep playing as a guest.",
    })
  }
}

// --- guests ------------------------------------------------------------------
const GUEST_FLAG = "lb.guest-session"
const guestSession = () => {
  try {
    return sessionStorage.getItem(GUEST_FLAG) === "1"
  } catch {
    return false
  }
}
function clearGuestSession() {
  try {
    sessionStorage.clear()
  } catch {
    // Nothing to clear.
  }
}
const LEGACY_FLAG = "lb.legacy-claimed"
const legacyClaimed = () => {
  try {
    return localStorage.getItem(LEGACY_FLAG) === "1"
  } catch {
    return true
  }
}
const markLegacyClaimed = () => {
  try {
    localStorage.setItem(LEGACY_FLAG, "1")
  } catch {
    // Not persisted.
  }
}

/** Play without an account. Progress lives in this tab and goes when it closes. */
export function continueAsGuest() {
  try {
    sessionStorage.setItem(GUEST_FLAG, "1")
  } catch {
    // Private mode: still a guest, just without even session persistence.
  }
  switchProfile(GUEST)
  set({ status: "guest" })
}

export async function signOut() {
  if (!authConfigured) return
  const { auth, mod } = await load()
  await mod.signOut(auth)
}
