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
import { KINDS } from "~/sim/catalogue"
import { Codex } from "~/screens/Codex"
import { Home } from "~/screens/Home"
import { Play } from "~/screens/Play"
import { ProviderToggle } from "~/ui/ProviderToggle"

const SANDBOX: Level = {
  id: "sandbox",
  mode: "build",
  title: "Sandbox",
  tagline: "",
  brief: "",
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
  { screen: "home" } | { screen: "codex" } | { screen: "play"; levelId: string }

/** Routes live in the hash so the back button and a home-screen PWA both behave. */
function parse(hash: string): Route {
  const [screen, id] = hash.replace(/^#\/?/, "").split("/")
  if (screen === "codex") return { screen: "codex" }
  if (screen === "play" && id && (id === "sandbox" || levelById(id)))
    return { screen: "play", levelId: id }
  return { screen: "home" }
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parse(location.hash))
  const [provider, setProvider] = useState<Provider>(loadProvider)
  const [progress, setProgress] = useState<Progress>(loadProgress)

  useEffect(() => {
    const on = () => setRoute(parse(location.hash))
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  const go = (hash: string) => {
    location.hash = hash
    window.scrollTo(0, 0)
  }

  const toggle = (
    <ProviderToggle
      value={provider}
      onChange={(p) => {
        setProvider(p)
        saveProvider(p)
      }}
    />
  )

  if (route.screen === "play") {
    const level =
      route.levelId === "sandbox"
        ? SANDBOX
        : (levelById(route.levelId) ?? LEVELS[0])
    if (!level) return null
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
        />
        <div
          className="fixed right-3 z-40"
          style={{ top: "calc(0.45rem + env(safe-area-inset-top, 0px))" }}
        >
          <div className="mr-16 sm:mr-20">{toggle}</div>
        </div>
      </>
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
        />
      )}
    </div>
  )
}
