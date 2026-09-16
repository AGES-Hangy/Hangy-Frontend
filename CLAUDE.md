# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm start             # start the Expo dev server (then pick a platform, or use one of the below)
npm run android
npm run ios
npm run web
npm run typecheck     # tsc --noEmit
```

There is no lint or test script configured yet.

## Architecture

React Native app built with Expo (SDK 54) and Expo Router (file-based routing), TypeScript throughout.

All source code except static assets lives under `src/`; `assets/` stays at the repo root. Expo Router auto-detects `src/app` as the router root (no extra config needed) because it exists alongside a root-level `app/` absence — do not add a root-level `app/` directory, or routing will silently switch roots.

The `@/*` import alias (see `tsconfig.json`) resolves to `src/*`, e.g. `import { colors } from '@/constants/colors'`. Prefer it over relative paths for anything outside the current folder.

### Routing conventions (`src/app/`)

The folder structure under `src/app/` *is* the navigation — this mirrors the sibling project `bite-alegre-front`, and new work should follow the same shape:

- Each page/screen lives in its own PascalCase folder with an `index.tsx`, exporting the screen component as `export default` (e.g. `src/app/(tabs)/Home/index.tsx`, `src/app/Login/index.tsx`). Do not put screen components as flat files directly under `src/app/`.
- `src/app/index.tsx` is the root route (`/`); it only does `<Redirect href="/Login" />` — it must not render its own content. After a successful login, `src/app/Login/index.tsx` sends the user to `/Home`, the first tab.
- `src/app/_layout.tsx` is the root layout (a `Stack`).
- `src/app/(tabs)/` is a route group (parenthesized name — not part of the URL) holding the bottom-tab-bar area, and is **the default location for new pages**. `(tabs)/_layout.tsx` defines the `Tabs` navigator with a custom `tabBar` (see below); each subfolder (`Home`, `Live`, `Search`, `Profile`) is a real tab, currently placeholders. Folder names are in English; the labels the user hears from a screen reader are in Portuguese and live in `src/components/BottomNav`.
- **New pages should be added inside `src/app/(tabs)/` as a new tab by default**, unless they belong on the no-navbar exceptions list below.
- Pages without the bottom tab bar (kept outside `src/app/(tabs)/`, directly under `src/app/NomeDaTela/index.tsx`) — this list is maintained by hand, update it when adding a new exception:
  - `Login`
- New screens reached from within a tab that aren't themselves a tab (e.g. event details, edit profile, and `CreateEvent` — opened by the bottom bar's centre button) belong in the `src/app/(tabs)/(screens)/NomeDaTela/index.tsx` group. These stay nested in `(tabs)` (so the bottom tab bar is still visible), and don't need any per-screen registration in `(tabs)/_layout.tsx`: the custom `tabBar` only ever renders the four known tabs, so every current and future folder under `(screens)/` is reachable-but-not-listed for free — it just renders the bar's `Limpo` variant, with no tab highlighted.
  - If a `(screens)` screen should also hide the bottom tab bar itself (rather than just lack a button), add its folder name to `src/constants/noNavbarScreens.ts`. `(tabs)/_layout.tsx` reads that list and renders no bar at all for matching routes.
- `(tabs)/_layout.tsx` renders `src/components/TopAppBar` as every screen's header, applying `variant="Home"` (Hangy logo + notifications bell linking to `(screens)/Notifications`) as the default for every route. A screen that needs a different bar — a `Modal` flow that closes instead of going back, a `Profile` with a report button, a Portuguese title — declares it itself by calling `useTopAppBar({ variant, title })` from `@/hooks/useTopAppBar` in the screen body, so the layout never has to learn about individual screens. The `Tabs` navigator has `backBehavior="history"` so `router.canGoBack()`/`router.back()` reflect the actual screens visited (not just a fixed first tab) — don't remove that prop, the back button silently breaks without it. The bottom bar itself is `src/components/BottomNav`: four icon-only tabs plus a centre "create event" button that is **not** a tab — it pushes `(screens)/CreateEvent`.

### Other `src/` folders

- `src/components/`: reusable UI components shared across screens, one component per folder with `index.tsx`.
- `src/constants/`: shared fixed values (e.g. `colors.ts`).
- `src/hooks/`: reusable React hooks (API calls, form logic, etc.).
- `src/utils/`: framework-agnostic helper functions.
