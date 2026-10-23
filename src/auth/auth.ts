import { useSyncExternalStore } from "react"
import { claimGuestData, switchProfile } from "~/game/profile"

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
  | { status: "signed-in"; user: AuthUser }

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}
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
    const auth = mod.getAuth(app)
    await mod.setPersistence(auth, mod.browserLocalPersistence)
    return { auth, mod }
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
    const { auth, mod } = await load()
    // Finishes a redirect sign-in, if one is in flight (installed iOS apps).
    await mod.getRedirectResult(auth).catch(() => null)
    mod.onAuthStateChanged(auth, (u) => {
      if (u) {
        try {
          claimGuestData(localStorage, u.uid)
        } catch {
          // Storage blocked: start the account fresh.
        }
        switchProfile(u.uid)
        set({ status: "signed-in", user: toUser(u) })
      } else {
        switchProfile(null)
        set({ status: "signed-out" })
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

export async function signOut() {
  if (!authConfigured) return
  const { auth, mod } = await load()
  await mod.signOut(auth)
}
