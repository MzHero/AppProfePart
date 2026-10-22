# AGENTS.md — AppProfePart (client)

## Project Overview
React 18 + Vite 5 SPA for "Particuldando" — a tutor matching app (Spanish). Single-page app with mock data, no backend.

## Commands
```bash
cd client
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Structure
```
client/
├── index.html          # Entry HTML (lang="es")
├── src/
│   ├── main.jsx        # React root mount
│   ├── App.jsx         # All UI logic + mock data (320 lines)
│   └── App.css         # Styles
└── package.json        # Deps: react, react-dom, lucide-react
```

## Key Conventions
- **No lint/typecheck/test configured** — none exist
- **No vite.config.js** — uses Vite defaults
- **All state in App.jsx** — screens managed via `currentScreen` state ('auth' | 'grid' | 'swipe' | 'detail' | 'chats')
- **Mock data in INITIAL_TUTORS** — 3 tutors with distance-based filtering
- **Icons from lucide-react** — imported individually
- **Spanish UI strings** — no i18n setup

## Gotchas
- `npm` commands must run from `client/` directory
- No `.env` or config files — all defaults
- Single component file (App.jsx) contains entire app logic
- Distance filtering uses meters (50/100/200/500 chips)
