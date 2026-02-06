# 67dle - Agent Guide

## Project Overview

67dle is a Wordle variant where players solve 67 simultaneous word puzzles. The project is a **monorepo** with two packages: a Svelte 5 frontend and a Cloudflare Workers backend. Both are deployed as a **single Cloudflare Worker** using Workers Static Assets for the SPA and Hono for the API.

## Tech Stack

- **Frontend:** Svelte 5 with runes (`$state`, `$derived`, `$props`)
- **Styling:** Tailwind CSS v4 (CSS-first config)
- **Frontend Build:** Vite + Bun
- **Backend:** Cloudflare Workers with Hono
- **Deployment:** Single Worker with Static Assets (`wrangler deploy` from `67dle-workers/`)
- **Backend Tooling:** Wrangler, Vitest with `@cloudflare/vitest-pool-workers`
- **Language:** TypeScript (both packages)

## Deployment Architecture

The entire app is deployed as **one Cloudflare Worker**:

- **Static assets** (the Vite-built SPA in `67dle-frontend/dist/`) are served by Workers Static Assets
- **API routes** (`/api/*`) are handled by the Hono Worker via `run_worker_first`
- **SPA fallback** (`not_found_handling: "single-page-application"`) returns `index.html` for non-matching routes

Routing flow:
1. Request to `/api/*` -> Worker code (Hono) handles it
2. Request matches a static file (JS, CSS, images) -> served directly from assets (no Worker invocation)
3. Request doesn't match any file -> `index.html` served (SPA client-side routing)

## Project Structure

```
67dle/                         # Monorepo root
├── AGENTS.md                  # This file
├── .gitignore
│
├── 67dle-frontend/            # Svelte 5 SPA (build-only, no standalone deploy)
│   ├── index.html             # Entry HTML
│   ├── package.json           # Frontend dependencies (no runtime deps)
│   ├── vite.config.ts         # Vite + Svelte + Tailwind plugins + dev proxy
│   ├── svelte.config.js       # Svelte preprocessor config
│   ├── tsconfig.json          # TypeScript config
│   ├── public/
│   │   └── favicon.svg        # App icon
│   ├── dist/                  # Production build output (consumed by Workers assets)
│   └── src/
│       ├── main.ts            # Mounts Svelte app to DOM
│       ├── app.css            # Tailwind import + custom theme colors
│       ├── App.svelte         # Root component - screen router (Home vs Game)
│       └── lib/
│           ├── words.ts           # Guess normalization/format validation
│           ├── api.ts             # Worker API client + token helpers
│           ├── game.svelte.ts     # Game state factory (API-driven) with runes
│           ├── Home.svelte        # Landing screen - daily/random mode picker
│           ├── Game.svelte        # Game screen - header, boards grid, keyboard, game-over modal
│           ├── Board.svelte       # Single 5xN grid board component
│           ├── Keyboard.svelte    # Virtual keyboard component
│           └── GameOver.svelte    # End game modal with share
│
└── 67dle-workers/             # Cloudflare Workers API + Static Assets host
    ├── package.json           # Worker dependencies + combined deploy scripts
    ├── wrangler.jsonc         # Wrangler config (assets, bindings, compatibility)
    ├── vitest.config.mts      # Vitest config using CF Workers pool
    ├── tsconfig.json          # TypeScript config (es2024 target)
    ├── worker-configuration.d.ts  # Auto-generated Wrangler types (run `bun cf-typegen`)
    ├── .prettierrc            # Prettier config (tabs, single quotes)
    ├── .editorconfig          # Editor config
    ├── sql/
    │   └── words.sql           # D1 schema for word list
    ├── scripts/
    │   ├── build-word-seed.py  # Generate bulk seed SQL from word list
    │   └── seed-words.sh       # One-shot schema + seed helper
    ├── src/
    │   ├── index.ts           # Hono app + API routes
    │   ├── game.ts            # Server-side game logic + D1 helpers
    │   └── types.ts           # API/session types
    └── test/
        ├── index.spec.ts      # Worker tests
        ├── env.d.ts           # Test environment types
        └── tsconfig.json      # Test-specific TS config
```

## Key Architecture Decisions

### Frontend

#### Screen Routing

`App.svelte` is a lightweight screen router toggling between two screens:
- **Home** (`Home.svelte`) - Landing page with "Game of the Day" and "Random Game" buttons
- **Game** (`Game.svelte`) - Full game UI with header, boards grid, keyboard, and game-over modal

Navigation is state-driven (`currentScreen` rune), not URL-based.

#### Game Modes

Two modes, each with independent server-side state and persistence:
- **Daily** - Deterministic seed from `YYYYMMDD` (UTC), same puzzle for all players
- **Random** - Random seed, new puzzle each time

#### State Management

Game state is created via the `createGame(mode)` factory in `game.svelte.ts`. It calls the Worker API and keeps UI state synced to server responses:

- `boards` - Array of board results with server-evaluated letter states
- `guesses` - Guess history returned by the server
- `currentGuess` - Current typed letters
- `keyboardState` - Derived `Map<string, LetterState>` aggregated across all boards
- `solvedCount` / `totalGuesses` - Stats from the server
- `gameOver` / `shaking` / `loading` / `error` - UI state
- `handleKey(key)` - Unified input handler for physical + virtual keyboard

#### Performance (Critical)

1. **CSS Containment:** Each `Board.svelte` uses `contain: layout style paint` to isolate repaints
2. **content-visibility:** Boards use `content-visibility: auto` so off-screen boards skip rendering
3. **Fine-grained reactivity:** Svelte 5 only updates changed DOM nodes, no diffing
4. **No runtime framework:** Svelte compiles to vanilla JS

#### Persistence

- Server-side sessions stored in KV, keyed by a token
- Client stores per-mode token in localStorage and sends it as `Authorization: Bearer <token>`
- Daily sessions resume on reload; random sessions always start fresh unless you reuse the token

#### Daily Puzzle

- Seed = `YYYYMMDD` as number (UTC)
- Targets chosen from D1 via seeded sampling
- Same puzzle for all players on same day, cached in CF Cache API until midnight UTC

### Backend (Cloudflare Workers)

- Entry point: `67dle-workers/src/index.ts` (Hono app)
- KV (`SESSIONS`) stores game sessions and progress
- D1 (`WORDS_DB`) stores full 5-letter word list (no target list on client)
- Cache API stores daily targets (keyed by date) until midnight UTC
- `nodejs_compat` compatibility flag enabled
- Auto-generate types after adding bindings: `bun run cf-typegen`
- **Static Assets:** `wrangler.jsonc` has an `assets` block pointing to `../67dle-frontend/dist`
- **Routing:** `run_worker_first: ["/api/*"]` ensures only API requests invoke the Worker; all other requests are served from static assets or fall back to `index.html` (SPA mode)

#### API Endpoints

- `POST /api/game/start` - create session, returns token + board metadata
- `POST /api/game/guess` - validate guess, return per-board letter states
- `GET /api/game/state` - restore full game state for reloads

## Common Tasks

### Adding Words

Populate the D1 table in `67dle-workers/sql/words.sql` via the seed script:
```bash
bash 67dle-workers/scripts/seed-words.sh
```

### Changing Board Count

Update `BOARD_COUNT` in `67dle-workers/src/game.ts` and ensure any UI text uses `boardCount` from the server.

### Changing Max Guesses

Update `MAX_GUESSES` in `67dle-workers/src/game.ts`.

### Styling Colors

Custom Wordle colors are defined in `67dle-frontend/src/app.css`:
```css
@theme {
  --color-correct: #538d4e;  /* Green */
  --color-present: #b59f3b;  /* Yellow */
  --color-absent: #3a3a3c;   /* Gray */
}
```

Use as Tailwind classes: `bg-correct`, `text-present`, `border-absent`

### Adding Worker Bindings

1. Add the binding in `67dle-workers/wrangler.jsonc`
2. Run `bun run cf-typegen` in `67dle-workers/` to regenerate `worker-configuration.d.ts`
3. The `Env` interface will be updated automatically with typed bindings

## Commands

### Frontend (`67dle-frontend/`)

```bash
bun install    # Install dependencies
bun dev        # Dev server at localhost:5173 (proxies /api to :8787)
bun build      # Production build to dist/
bun preview    # Preview production build
```

### Workers (`67dle-workers/`)

```bash
bun install            # Install dependencies
bun dev                # Local dev server at localhost:8787 (serves API + static assets)
bun run deploy         # Build frontend + deploy everything to Cloudflare
bun run build:frontend # Build frontend only (called automatically by deploy)
bun test               # Run tests in Workers runtime
bun run cf-typegen     # Regenerate Env types from wrangler.jsonc
```

### Local Development

For local dev, run both servers:
1. `cd 67dle-workers && bun dev` — Wrangler dev server at `:8787` (API + serves built assets)
2. `cd 67dle-frontend && bun dev` — Vite dev server at `:5173` (HMR + proxies `/api` to `:8787`)

Use `:5173` in the browser for hot-reload during frontend development. Use `:8787` to test the full production-like setup (requires `bun run build` in `67dle-frontend/` first).

### Deploying

From `67dle-workers/`:
```bash
bun run deploy
```
This builds the frontend, then deploys the Worker + static assets in one shot.

## Future Considerations

- **API Endpoints:** Add leaderboards, user accounts via Workers
- **Worker Bindings:** KV for leaderboards, D1 for user data, R2 for assets
- **Hard Mode:** Enforce using revealed hints
- **Statistics:** Track solve distribution, streaks
- **Themes:** Light mode, color blind mode
- **PWA:** Add service worker for offline play

## Gotchas

1. **Svelte 5 runes:** Use `$state`, `$derived`, `$props` - not Svelte 4 stores
2. **Tailwind v4:** CSS-first config in `app.css`, not `tailwind.config.js`
3. **Touch events:** Keyboard uses `ontouchstart` with `preventDefault()` to avoid 300ms delay
4. **Word validation:** Server-side via D1, lowercase internally
5. **Game store is a factory:** `createGame(mode)` returns a new store instance, not a singleton
6. **Monorepo:** No root `package.json` - run install/dev/build commands inside each package directory
7. **Wrangler config:** Uses `.jsonc` (JSON with comments), not `.toml`
8. **Worker types:** After changing `wrangler.jsonc` bindings, always run `bun run cf-typegen` to keep types in sync
9. **Single deploy:** Both frontend and backend deploy from `67dle-workers/` — the `assets.directory` in `wrangler.jsonc` points to `../67dle-frontend/dist`, so the frontend must be built first (the `deploy` script handles this automatically)
10. **Static assets routing:** `run_worker_first: ["/api/*"]` in `wrangler.jsonc` controls which requests hit Worker code vs static assets — only add paths here if they need server-side logic
