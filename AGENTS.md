# Architech

A system design game: isometric diagramming, a pure simulation engine, and a provider naming toggle. See `README.md` for the player's view.

## Layout

- `src/sim/` is the engine. Pure TypeScript, no React. `simulate.ts` is the model, `grade.ts` turns it into stars, `findings.ts` turns it into words.
- `src/levels/` holds level data (`index.ts`) and codex cards (`concepts.ts`).
- `src/providers/names.ts` maps every `ComponentKind` to its name under each provider.
- `src/ui/` holds the board (`Board.tsx`, `Block.tsx`, `particles.ts`) and panels. `src/screens/` holds the routes.

## Rules that aren't enforced by the linter

- **Never write a product name in game text.** Levels, findings and cards write `{kind}` tokens (`{cache}`, `{sql-primary}`), which `src/text.ts` renders under the current provider. A test greps all game text for provider product names.
- **Every level needs a reference solution that earns three stars**, and every repair level a starter that doesn't. `src/sim/__tests__/levels.test.ts` enforces both, so tune catalogue numbers by running the tests.
- **The canvas never decides anything.** Colours, packet rates and stats are renders of `simulate()` output. If a visual needs a number the engine doesn't produce, add it to the engine.
- **Verify provider names against current docs** before changing `names.ts`. Services get renamed.
- The service worker only exists in a production build: test PWA behaviour with `pnpm build && pnpm preview`.

## Commands

`pnpm check` (lint + typecheck), `pnpm test:run`, `pnpm build`. CI runs all three.
