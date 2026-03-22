# Lister — Claude Context

## What this project is

Lister is a local-first newsletter management app. All subscriber data lives in a single SQLite file on the user's device — no cloud backend, no accounts, no tracking. An optional Express server handles email sending via SMTP (stateless relay only).

## Commands

```bash
npm run dev          # Start frontend (Vite :5173) + server (Express :3001) together
npm run dev:ui       # Frontend only
npm run dev:server   # Server only
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run lint         # ESLint
```

## Architecture

Two tiers:
- **Frontend** — React 18 + TypeScript + Vite. Runs entirely in the browser. All data operations are local.
- **Backend** — Lightweight Express server (`server/index.ts`). Stateless SMTP relay only. No database, no persistence.

Vite proxies `/api/*` → `http://localhost:3001` in dev.

## Database

- **sql.js** (SQLite compiled to WebAssembly) — synchronous, runs in-browser
- Entire DB is in memory; persisted to a `.sqlite` file on disk via the **File System Access API**
- File handle stored in IndexedDB (`lister-fsa`) so the file reopens without a picker on reload
- **Encryption**: optional AES-256-GCM. Two modes — password (PBKDF2) or passkey (WebAuthn PRF). Encrypted files have a `LISTER1` magic header.
- All DB query functions are in `src/db/database.ts` and operate on a module-level `db` instance
- Schema and migrations are in `src/db/schema.ts` — migrations run on every open (idempotent)

## Server endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/send` | Send email via SMTP |
| POST | `/api/test` | Test SMTP connection |
| GET | `/api/health` | Health check |

SMTP credentials are sent from the frontend on every request — the server never stores them. Set `SMTP_REJECT_UNAUTHORIZED=false` to allow self-signed certs (dev only).

## Key directories

```
src/
  components/       # React components (PascalCase filenames)
    ui/             # Reusable primitives (Button, Modal, Table, etc.)
    lists/          # List management views
    campaigns/      # Campaign editor & sender
    subscribers/    # Subscriber management
    templates/      # Template library
    themes/         # Theme management
    settings/       # App + sender profile settings
  db/               # Database layer (database.ts, schema.ts, crypto.ts)
  context/          # React context (SettingsContext)
  hooks/            # Custom hooks (useHotkey.ts)
  themes/           # Built-in email themes and templates
  types/            # TypeScript types (index.ts)
server/
  index.ts          # Express SMTP relay
public/
  sql-wasm.wasm     # sql.js WebAssembly binary (do not modify)
```

## TypeScript

- Strict mode on (`strict`, `noUnusedLocals`, `noUnusedParameters`)
- Target: ES2020, module resolution: `bundler`
- Server uses a separate `tsconfig.node.json`

## Styling

- Tailwind CSS (utility classes directly in JSX, no CSS modules)
- Dark mode via `class` strategy
- Sidebar background is a custom dark color (`#1a1f2e`), not a Tailwind token

## Browser storage

| Key | Store | Purpose |
|-----|-------|---------|
| `lister-theme` | localStorage | `'dark'` / `'light'` |
| `lister-sidebar` | localStorage | `'collapsed'` / `'expanded'` |
| `lister-sidebar-sections` | localStorage | Open nav sections |
| `lister-recent-filename` | localStorage | Last opened filename |
| `lister-fsa` | IndexedDB | File System API handle |
| `lister-passkeys` | IndexedDB | WebAuthn credential IDs |

## Constraints & things to keep in mind

- sql.js queries are **synchronous** — no async/await for DB calls
- The Express server is **stateless** — don't add persistent state there
- No environment variables are required for normal development
- `public/sql-wasm.wasm` must stay in `public/` — Vite serves it as a static asset
- File System Access API is the primary persistence mechanism; the download/upload fallback exists for unsupported browsers
