/// <reference types="vite/client" />

// Must be an interface: it merges into the one Vite declares.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY?: string
  /** Comma-separated Firebase UIDs that see admin tools (card reports). */
  readonly VITE_ADMIN_UIDS?: string
}
