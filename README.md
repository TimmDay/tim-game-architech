<h1 align="center">Load Bearing</h1>

<p align="center">
  <strong>A system design game.</strong><br>
  Draw an architecture, throw traffic at it, watch it break, fix it.
</p>

<p align="center">
  <img src="docs/img/repair.jpg" alt="A repair level under load: the data warehouse is wired onto the request path and glows red" width="100%">
</p>

## Two modes

**Build.** You get a brief (500 requests a second, p99 under 300ms, 99.9% available, $400 a month) and a palette. Place components on an isometric board, wire them together, size each tier, then run the load test. Traffic ramps to peak, then a chaos round fires: an instance crashes, a cache restarts cold, a whole availability zone goes dark.

**Repair.** You inherit somebody else's production system and it's on fire. Load test it, read the symptoms, tap the component you think is really to blame, then fix it. Getting the diagnosis right first time earns a badge.

Each level is worth three stars: **handles peak** (errors, latency, budget, data actually stored), **highly available** (the topology's availability arithmetic), and **survives chaos**.

## Provider toggle

The **AWS / Azure / GCP / None** switch renames every component everywhere: the board, the palette, briefs, findings and the codex. "None" uses the vendor-neutral textbook name you'd use on an interview whiteboard (In-Memory Key-Value Cache, Message Queue, Event Log). Names were checked against provider docs in October 2026; see `src/providers/names.ts`.

## What it teaches

Six build levels and six repair levels, covering horizontal scaling and N+1 capacity, cache-aside and cold-cache stampedes, read replicas and read/write splitting, CDNs and object storage, queues vs event logs, competing consumers and backlog, availability zones, standbys, and OLTP vs OLAP. The **Codex** has a card for every component and concept, each with what an interviewer is listening for.

## How the simulation works

`simulate()` in `src/sim/simulate.ts` is a pure function from a graph and a load profile to per-component metrics. The model is adapted from [architecture-simulator](https://github.com/TimmDay/architecture-simulator):

- **Routers divide, callers duplicate.** A load balancer splits 400 rps between its targets; an app server makes each of its calls per request.
- **Caches pass only misses** (and all writes) to what's behind them. The hit rate comes from the scenario, never from the player.
- **Reads and writes have separate capacity.** A replica serves reads and refuses writes; a SQL primary's extra instances are standbys, not capacity.
- **Latency climbs with utilisation** as 1 / (1 - ρ), capped. The p99 is the slowest synchronous path carrying at least 1% of requests.
- **Async hand-offs** take everything behind them off the critical path. Slow consumers grow a backlog instead of failing requests.
- **Availability** multiplies along the path and composes as 1 - (1 - a)^n across independent failure domains.

The canvas only displays this output: packet rate per edge, block colour by utilisation, red packets bursting at overloaded targets.

Every level ships a reference solution, and CI fails if a tuning change leaves any level unwinnable or any repair level already fixed.

<p align="center">
  <img src="docs/img/phone-results.jpg" alt="The results screen on a phone, three stars" width="300">
</p>

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm check        # lint + typecheck
pnpm test:run     # unit tests
pnpm build        # production build with the service worker
pnpm preview      # serve the build: the only way to test the PWA offline
```

It's a PWA: open it on a phone and use "Add to Home Screen". After the first visit it works offline. Progress, builds and the provider choice live in `localStorage`.

## Stack

Vite · React 19 · TypeScript (strict, `noUncheckedIndexedAccess`) · Tailwind v4 · hand-drawn isometric SVG · vite-plugin-pwa · vitest. No backend.

## Licence

MIT.
