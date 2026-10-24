import { useEffect, useState } from "react"
import {
  loadProgress,
  loadProvider,
  saveProgress,
  saveProvider,
  type Progress,
} from "~/game/storage"
import { LEVELS, SANDBOX_LOAD, levelById, type Level } from "~/levels"
import type { Provider } from "~/providers/names"
import { GENERIC_SCENARIO } from "~/levels/roles"
import { KINDS } from "~/sim/catalogue"
import { Codex } from "~/screens/Codex"
import { Retention } from "~/screens/Retention"
import { Survival } from "~/screens/Survival"
import { SURVIVAL_REQUIRES } from "~/survival/engine"
import { PointsChip } from "~/ui/PointsChip"
import { AchievementToaster } from "~/ui/AchievementToaster"
import { MuteButton } from "~/ui/MuteButton"
import { AccountButton } from "~/ui/AccountButton"
import { useAuth } from "~/auth/auth"
import { Welcome } from "~/screens/Welcome"
import { subscribeProfile } from "~/game/profile"
import { LockedLevel } from "~/screens/LockedLevel"
import { isComplete, isUnlocked, missingPrereqs } from "~/game/progression"
import { DECK_TITLES } from "~/decks"
import { Deck } from "~/screens/Deck"
import { Home } from "~/screens/Home"
import { Play } from "~/screens/Play"
import { ProviderToggle } from "~/ui/ProviderToggle"

const SANDBOX: Level = {
  id: "sandbox",
  mode: "build",
  requires: [],
  title: "Sandbox",
  tagline: "",
  brief: "",
  scenario: GENERIC_SCENARIO,
  load: SANDBOX_LOAD,
  targets: {
    p99Ms: 500,
    maxErrorRate: 0.01,
    availability: 0.99,
    budgetUsd: 100_000,
    writesReach: [],
    noBacklog: false,
  },
  chaos: { faults: [{ kind: "zone-outage" }], label: "Zone A loses power" },
  palette: KINDS,
  reference: { components: [], edges: [] },
  concepts: [],
  hint: "",
}

type Route =
  | { screen: "home" }
  | { screen: "codex" }
  | { screen: "play"; levelId: string }
  | { screen: "deck"; levelId: string }
  | { screen: "retention" }
  | { screen: "survival" }

/** Routes live in the hash so the back button and a home-screen PWA both behave. */
function parse(hash: string): Route {
  const [screen, id] = hash.replace(/^#\/?/, "").split("/")
  if (screen === "codex") return { screen: "codex" }
  if (screen === "retention") return { screen: "retention" }
  if (screen === "survival") return { screen: "survival" }
  if (screen === "deck" && id && (levelById(id) || DECK_TITLES[id]))
    return { screen: "deck", levelId: id }
  if (screen === "play" && id && (id === "sandbox" || levelById(id)))
    return { screen: "play", levelId: id }
  return { screen: "home" }
}

export function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  // Signing in or out swaps whose save we're showing.
  useEffect(() => subscribeProfile(() => setProgress(loadProgress())), [])
  const auth = useAuth()
  // With sign-in configured, a signed-out player chooses: account or guest.
  if (auth.status === "loading" || auth.status === "signed-out")
    return <Welcome auth={auth} />
  // Achievements are granted from anywhere; the toaster sits above every screen.
  return (
    <>
      <AppScreens progress={progress} setProgress={setProgress} />
      <AchievementToaster progress={progress} />
    </>
  )
}

function AppScreens({
  progress,
  setProgress,
}: {
  progress: Progress
  setProgress: (p: Progress) => void
}) {
  const [route, setRoute] = useState<Route>(() => parse(location.hash))
  const [provider, setProvider] = useState<Provider>(loadProvider)

  useEffect(() => {
    const on = () => setRoute(parse(location.hash))
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  const go = (hash: string) => {
    location.hash = hash
    window.scrollTo(0, 0)
  }

  // Points travel with the provider toggle, so every screen's header shows both.
  const toggle = (
    <div className="flex items-center gap-2">
      <PointsChip />
      <MuteButton />
      <AccountButton />
      <ProviderToggle
        value={provider}
        onChange={(p) => {
          setProvider(p)
          saveProvider(p)
        }}
      />
    </div>
  )

  if (route.screen === "play") {
    const level =
      route.levelId === "sandbox"
        ? SANDBOX
        : (levelById(route.levelId) ?? LEVELS[0])
    if (!level) return null
    // A shared or bookmarked link can't skip the levels that teach this one.
    if (level !== SANDBOX && !isUnlocked(level, progress)) {
      return (
        <LockedLevel
          level={level}
          missing={missingPrereqs(level, progress)}
          onHome={() => go("/")}
          onDeck={() => go(`/deck/${level.id}`)}
        />
      )
    }
    return (
      <>
        <Play
          key={level.id}
          level={level}
          sandbox={level === SANDBOX}
          provider={provider}
          progress={progress}
          onProgress={(p) => {
            setProgress(p)
            saveProgress(p)
          }}
          onExit={() => go("/")}
          onNext={(id) => go(`/play/${id}`)}
          onDeck={() => go(`/deck/${level.id}`)}
          toggle={toggle}
        />
      </>
    )
  }

  if (route.screen === "survival") {
    const missing = SURVIVAL_REQUIRES.filter((id) => !isComplete(id, progress))
    if (missing.length === 0)
      return (
        <Survival provider={provider} onBack={() => go("/")} toggle={toggle} />
      )
  }

  if (route.screen === "retention")
    return (
      <Retention
        provider={provider}
        onBack={() => go("/")}
        onPlay={(id) => go(`/play/${id}`)}
        toggle={toggle}
      />
    )

  if (route.screen === "deck") {
    const level = levelById(route.levelId)
    const topic = DECK_TITLES[route.levelId]
    if (!level && !topic) return null
    return (
      <Deck
        key={route.levelId}
        source={{ id: route.levelId, title: level?.title ?? topic ?? "" }}
        provider={provider}
        onBack={() => history.back()}
        onPlay={level ? () => go(`/play/${level.id}`) : undefined}
        toggle={toggle}
      />
    )
  }

  return (
    <div className="min-h-dvh">
      <div
        className="sticky top-0 z-30 flex justify-end bg-gradient-to-b from-[#070a12] to-transparent px-4 pb-3"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        {toggle}
      </div>
      {route.screen === "codex" ? (
        <Codex provider={provider} onBack={() => go("/")} />
      ) : (
        <Home
          progress={progress}
          onPlay={(id) => go(`/play/${id}`)}
          onSandbox={() => go("/play/sandbox")}
          onCodex={() => go("/codex")}
          onDeck={(id) => go(`/deck/${id}`)}
          onRetention={() => go("/retention")}
          onSurvival={() => go("/survival")}
        />
      )}
    </div>
  )
}
