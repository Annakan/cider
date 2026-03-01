# AGENTS.md — Oatear Cider

> Guidelines for AI agents working on this codebase.

## Project Overview

**Oatear Cider** is a data-driven card design studio for game developers. Users design game cards using HTML, CSS, and Handlebars templates, with card data managed in spreadsheet-like tables. The app runs both as a **web app** (IndexedDB storage, deployed to GitHub Pages) and as a **desktop app** (Electron with local file system projects).

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Angular 21 (NgModule-based, **not** standalone components) |
| **Language** | TypeScript 5.9 (strict mode) |
| **UI Components** | PrimeNG 21, PrimeFlex, PrimeIcons |
| **Styling** | SCSS (component-scoped), custom PrimeNG theme (`cider-theme.ts`) |
| **Code Editor** | Monaco Editor (`ngx-monaco-editor-v2`) |
| **Templating** | Handlebars (for card rendering) |
| **Database** | Dexie.js (IndexedDB wrapper) with versioned schema migrations |
| **State** | RxJS (`BehaviorSubject`, `Subject`, reactive pipes) |
| **i18n** | `@ngx-translate/core` with JSON translation files |
| **Desktop** | Electron 25, electron-builder |
| **Testing** | Karma + Jasmine |
| **Node** | v24.12.0 (see `.nvmrc`) |
| **CI/CD** | GitHub Actions (Angular build → gh-pages, Electron release on tag) |

## Project Structure

```
cider/
├── DESIGN.md                   # Original design document and data model
├── cider-app/                  # Main application (Angular + Electron)
│   ├── package.json            # Dependencies and npm scripts
│   ├── angular.json            # Angular CLI configuration
│   ├── electron-app/           # Electron main process
│   │   └── main.ts             # Electron entry point
│   ├── electron-builder.json   # Electron packaging config
│   ├── src/
│   │   ├── main.ts             # Angular bootstrap
│   │   ├── styles.scss         # Global styles
│   │   ├── assets/             # Static assets (logos, screenshots, i18n JSON)
│   │   ├── environments/       # Environment configs (dev/prod)
│   │   └── app/
│   │       ├── app.module.ts           # Root NgModule
│   │       ├── app-routing.module.ts   # Route definitions
│   │       ├── cider-theme.ts          # Custom PrimeNG theme preset
│   │       ├── data-services/          # Data layer (see below)
│   │       ├── shared/                 # Shared utilities, pipes, guards, components
│   │       └── [feature]/              # Feature components (one folder per feature)
│   └── build/                  # macOS entitlements for Electron signing
└── .github/workflows/          # CI/CD pipelines
```

## Architecture

### Data Layer (`data-services/`)

This is the core of the application. Understand it before making changes.

```
data-services/
├── indexed-db/
│   ├── db.ts                   # AppDB — Dexie database with schema versioning (10 versions)
│   ├── indexed-db.service.ts   # Generic CRUD base service (IndexedDbService<Entity, Identity>)
│   └── decks-child.service.ts  # Deck-scoped entity base service (auto-filters by selected deck)
├── services/
│   ├── decks.service.ts        # Deck management + selected deck state
│   ├── cards.service.ts        # Cards with dynamic attribute fields
│   ├── card-templates.service.ts
│   ├── card-attributes.service.ts  # Column/field definitions for card spreadsheet
│   ├── assets.service.ts       # Binary asset management (images, fonts)
│   ├── documents.service.ts    # Markdown/CSS documents (global styles)
│   ├── project-state.service.ts    # Dirty tracking and crash recovery
│   ├── render-cache.service.ts
│   └── image-renderer.service.ts
├── electron/
│   └── electron.service.ts     # Electron IPC bridge (file system, dialogs)
├── local-storage/              # Browser localStorage service
├── types/                      # TypeScript interfaces for all entities
└── pipes/                      # Data-related Angular pipes
```

**Key patterns:**
- **`IndexedDbService<Entity, Identity>`** — Generic base class with CRUD, search, sorting, filtering.
- **`DecksChildService`** — Extends `IndexedDbService`, automatically scopes all queries to the currently selected deck via `DecksService.getSelectedDeck()`.
- **`AppDB`** (extends `Dexie`) — Singleton database with 10 schema versions. Uses Dexie hooks for granular dirty tracking. Handles import/export of the entire database as JSON.
- **Dual-mode operation** — Services check `ElectronService.isElectron()` to branch between web (IndexedDB only) and desktop (file system + IndexedDB) behavior.

### Core Entities

| Entity | Table | Key Fields |
|---|---|---|
| `Deck` | `decks` | `id`, `name` |
| `Card` | `cards` | `id`, `deckId`, `name`, `count`, `frontCardTemplateId`, `backCardTemplateId` + dynamic attributes |
| `CardTemplate` | `cardTemplates` | `id`, `deckId`, `name`, `html`, `css` |
| `CardAttribute` | `cardAttributes` | `id`, `deckId`, `name`, `type`, `options`, `width`, `order`, `isSystem` |
| `Asset` | `assets` | `id`, `name`, `path`, `file` (ArrayBuffer) |
| `Document` | `documents` | `id`, `name`, `mime`, `content` |

### Routing

Routes are defined in `app-routing.module.ts`. All routes except the wildcard (`**` → Welcome) use guards:
- **`ProjectGuard`** — Ensures a project is loaded.
- **`DeckGuard`** — Ensures a deck is selected and sets it via `DecksService.selectDeck()`.

Routes follow the pattern: `/decks/:deckId/cards`, `/decks/:deckId/templates/:templateId`, etc.

### Component Structure

Each feature component has its own folder with 4 files:
- `*.component.ts` — Component class
- `*.component.html` — Template
- `*.component.scss` — Styles
- `*.component.spec.ts` — Tests

Components are declared in `AppModule` (not standalone).

## Coding Conventions

### TypeScript
- **Strict mode** enabled (`strict: true` in `tsconfig.json`)
- **Single quotes** for strings (enforced by `.editorconfig`)
- **2-space indentation** (enforced by `.editorconfig`)
- Angular services use `providedIn: 'root'` for singletons
- Use `EntityField<T>` interface for defining entity schemas
- Use `FieldType` enum for field types (`text`, `numeric`, `dropdown`, `checkbox`, `image`, `color`)

### Styling
- Component styles use **SCSS**
- Global layout uses **PrimeFlex** utility classes
- Theme colors: red, beige, dark brown (brand colors)
- Custom CSS variables prefixed with `--cider-*`
- PrimeNG theming via custom `CiderTheme` preset in `cider-theme.ts`
- Dark mode toggled via CSS class (`LocalStorageService.DARK_MODE`)

### State Management
- No NgRx or similar store — state is managed via **RxJS subjects** in services
- `BehaviorSubject` for current state (e.g., selected deck)
- `Subject` for events (e.g., database changes)
- Use `firstValueFrom()` to convert observables to promises in async contexts

### Database Changes
- **Never modify existing Dexie version blocks.** Always add a new version with an `.upgrade()` function.
- System attributes (`Name`, `Count`, `Front Template`, `Back Template`) are created automatically per deck in `initializeData()`.

## Development Commands

All commands run from `cider-app/`:

```bash
npm install          # Install dependencies
npm start            # Dev server (ng serve)
npm run build        # Production build
npm test             # Run Karma tests
npm run electron     # Build + run Electron dev
npm run electron:build  # Build Electron distributable
```

## Testing

- Unit tests use **Karma + Jasmine**
- Test files are co-located with source files (`*.spec.ts`)
- Run tests: `npm test` (from `cider-app/`)

## CI/CD

- **`angular-build.yaml`** — On push to `main`: builds Angular, deploys to `gh-pages` branch.
- **`electron-release.yaml`** — On version tag push (`v*`): builds Electron apps for Windows, macOS, and Linux; creates GitHub release.

## Important Notes

- **Do not add standalone components** — the project uses NgModule architecture. Declare new components in `AppModule`.
- **Dexie schema is at version 10** — append new versions, never edit existing ones.
- **Electron main process** is in `cider-app/electron-app/main.ts` (TypeScript, compiled separately).
- **Assets are stored as ArrayBuffers** in IndexedDB (web mode) or on the file system (Electron mode).
- **Card rendering** uses Handlebars to merge template HTML with card data, then renders via an iframe/DOM-to-image pipeline.
- **`oatear-longtable`** is a local library (`libs/oatear-longtable-0.1.7.tgz`) — a custom virtual-scroll table component.
- The `cider-theme.ts` file is very large (~200KB) — it defines the full PrimeNG theme preset. Avoid unnecessary edits.
- Translation files are in `src/assets/i18n/`. Use `TranslateService` and `translate` pipe for user-facing strings.
