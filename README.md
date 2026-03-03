# Community — Frontend

A mobile-first collaborative web game. Every day a reference image appears divided into a grid of tiles. Players claim tiles, photograph their section, and submit. When all tiles are filled, the image completes and a new round begins with a larger grid.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animations | Framer Motion |
| Client state | Zustand |
| Server state | TanStack Query v5 |
| Localization | i18next + react-i18next (en, es, da) |
| Package manager | pnpm |
| Testing | Vitest + React Testing Library |

## Getting started

**Prerequisites:** Node.js 24+, pnpm 10+

```bash
pnpm install
cp .env.example .env.local   # fill in your API URL
pnpm dev
```

Open http://localhost:3000 — redirects automatically to your browser locale (`/en`, `/es`, or `/da`).

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_APP_ENV` | `development` / `staging` / `production` |
| `NEXT_PUBLIC_APP_URL` | Public URL of this frontend (for metadata) |

See `.env.example` for defaults. Set these in Railway for deployed environments.

## Commands

```bash
pnpm dev          # start dev server on :3000
pnpm build        # production build
pnpm start        # start production server
pnpm test         # run unit tests
pnpm test:watch   # tests in watch mode
pnpm lint         # ESLint
pnpm format       # Prettier (write)
pnpm format:check # Prettier (check only, used in CI)
```

## Project structure

```
src/
  app/[locale]/       # locale-prefixed routes (/en, /es, /da)
  components/
    ui/               # shadcn/ui components (owned source)
    layout/           # Header, Footer, LanguageSwitcher
    providers/        # I18nProvider, QueryProvider
  lib/
    api/              # fetch client + endpoints + mock/ fallbacks
    i18n/             # i18next server + client config
    query/            # TanStack Query hooks per domain
    store/            # Zustand stores
  types/              # shared TypeScript interfaces
  proxy.ts            # locale detection + routing (Next.js 16)
public/
  locales/            # translation files (en, es, da)
```

## Branching

| Branch | Deploys to |
|---|---|
| `master` | Production (Railway) |
| `develop` | Dev / staging (Railway) |

PRs require 1 approval and passing CI. Signed commits required.

## Backend

Go API deployed on Railway. Frontend fetches from `NEXT_PUBLIC_API_URL`. If the API is unreachable, the data layer falls back to mock responses automatically — components are never aware of the difference.
