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
npm test              # integration tests with mocked external dependencies
npm run test:watch    # rerun tests while developing
npm run test:coverage # local coverage report with enforced thresholds
npm run test:ci       # CI mode with enforced coverage thresholds
```

There is no lint script configured yet. Tests live outside `src/app` under
`__tests__/`, because files inside `src/app` are interpreted as routes by Expo
Router. Integration tests should exercise real screens/hooks while mocking
external boundaries such as HTTP, storage, and navigation.

Coverage is enforced globally for the behavioral scope in `jest.config.js`:
90% statements, lines, and functions; 80% branches. Constants, type-only
files, route configuration, and current visual-only placeholders are excluded.
When a placeholder screen gains behavior, add it to `collectCoverageFrom`.

## Architecture

React Native app built with Expo (SDK 54) and Expo Router (file-based routing), TypeScript throughout.

All source code except static assets lives under `src/`; `assets/` stays at the repo root. Expo Router auto-detects `src/app` as the router root (no extra config needed) because it exists alongside a root-level `app/` absence — do not add a root-level `app/` directory, or routing will silently switch roots.

The `@/*` import alias (see `tsconfig.json`) resolves to `src/*`, e.g. `import { colors } from '@/constants/colors'`. Prefer it over relative paths for anything outside the current folder.

### Routing conventions (`src/app/`)

The folder structure under `src/app/` *is* the navigation — this mirrors the sibling project `bite-alegre-front`, and new work should follow the same shape:

- Each page/screen lives in its own PascalCase folder with an `index.tsx`, exporting the screen component as `export default` (e.g. `src/app/(tabs)/Feed/index.tsx`, `src/app/Login/index.tsx`). Do not put screen components as flat files directly under `src/app/`.
- `src/app/index.tsx` is the root route (`/`); it only does `<Redirect href="/Home" />` to the first tab — it must not render its own content.
- `src/app/_layout.tsx` is the root layout (a `Stack`).
- `src/app/(tabs)/` is a route group (parenthesized name — not part of the URL) holding the bottom-tab-bar area, and is **the default location for new pages**. `(tabs)/_layout.tsx` defines the `Tabs` navigator; each subfolder (`Feed`, `Live`, `CreateEvent`, `Search`, `Profile`) is a real tab with its own button, currently placeholders. Both folder names and the `title` shown to the user in each `Tabs.Screen` are in English.
- **New pages should be added inside `src/app/(tabs)/` as a new tab by default**, unless they belong on the no-navbar exceptions list below.
- Pages without the bottom tab bar (kept outside `src/app/(tabs)/`, directly under `src/app/NomeDaTela/index.tsx`) — this list is maintained by hand, update it when adding a new exception:
  - `Login`
- New screens reached from within a tab that aren't themselves a tab (e.g. event details, edit profile, and `Home` — the root redirect target) belong in the `src/app/(tabs)/(screens)/NomeDaTela/index.tsx` group. These stay nested in `(tabs)` (so the bottom tab bar is still visible), and don't need any per-screen registration in `(tabs)/_layout.tsx`: its `screenOptions` matches any route whose name starts with `(screens)/` and hides its tab button automatically (`tabBarButton: () => null`), so every current and future folder under `(screens)/` is reachable-but-not-listed for free.
  - If a `(screens)` screen should also hide the bottom tab bar itself (rather than just lack a button), add its folder name to `src/constants/noNavbarScreens.ts`. `(tabs)/_layout.tsx` reads that list and sets `tabBarStyle: { display: 'none' }` dynamically for matching routes.
- `(tabs)/_layout.tsx` renders `src/components/Header` as every screen's header (back button, "Hangy" title, notifications bell linking to `(screens)/Notifications`). The `Tabs` navigator has `backBehavior="history"` so `router.canGoBack()`/`router.back()` reflect the actual screens visited (not just a fixed first tab) — don't remove that prop, the back button silently breaks without it.

### Other `src/` folders

- `src/components/`: reusable UI components shared across screens, one component per folder with `index.tsx`.
- `src/constants/`: shared fixed values (e.g. `colors.ts`).
- `src/hooks/`: reusable React hooks (API calls, form logic, etc.).
- `src/utils/`: framework-agnostic helper functions.
