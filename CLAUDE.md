# Claude Code

Read [AGENTS.md](AGENTS.md) for implementation and review rules. For PR reviews,
follow [revisar-pr-hangy](.agents/skills/revisar-pr-hangy/SKILL.md).
The [README](README.md) covers setup, navigation and device validation.

## Commands

```bash
npm install          # install dependencies
npm start             # start the Expo dev server (then pick a platform, or use one of the below)
npm run android
npm run ios
npm run web
npm run typecheck     # tsc --noEmit
```

`npm test` runs the test suite listed in `package.json`. No lint script is
configured. Check `package.json` for dependency versions and available scripts.

## Project layout

The app uses React Native, Expo and Expo Router with TypeScript. Source files
live in `src/`; static assets live in `assets/`. The `@/*` alias resolves to
`src/*`. Keep routes in `src/app/` and avoid adding a root-level `app/` directory,
which would change the router root.

## Navigation

The root route opens `/Splash`, which reads the session and account role.
`homeRouteFor` sends administrators to `/Admin/Painel` and other authenticated
users to `/Home`. Users without a session go to `/Login`. Login also resumes
pending event invitations.

The four tabs are `Home`, `Live`, `Search` and `Profile`. Internal screens live
under `(tabs)/(screens)/`; register their routes in `(tabs)/_layout.tsx`.
`BottomNav` renders the four tab buttons and a centre button that opens
`CreateEvent`. Internal screens use the `Limpo` variant unless their names are
listed in `noNavbarScreens`, which hides the bar.

Configure screen headers with `useTopAppBar`. Keep `backBehavior="history"`
and the custom bar's `tabPress` event handling when changing navigation.
The Admin area has its own `AdminGuard` and `AdminNav`.
