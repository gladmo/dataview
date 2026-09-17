# AGENTS.md

dataview is a lightweight cross-platform database client. Its goal is to implement the full feature set of [t8y2/dbx](https://github.com/t8y2/dbx) and bring in the Data View capability from the [gladmo/dbx `feature-data-view`](https://github.com/gladmo/dbx/tree/feature-data-view) branch. Read [docs/AGENTS.md](docs/AGENTS.md) before changing `apps/`, `crates/`, or `src-tauri/`; follow [.agents/AGENTS.md](.agents/AGENTS.md) when writing decision records.

AGENTS.md instruction files (this one, [docs/AGENTS.md](docs/AGENTS.md), [.agents/AGENTS.md](.agents/AGENTS.md)) are written in English only. Documents that agents generate follow the bilingual contract in [docs/AGENTS.md](docs/AGENTS.md).

## Feature scope

**Core features aligned with dbx**: connections to 90+ databases (MySQL, PostgreSQL, SQLite, Redis, MongoDB, DuckDB, ClickHouse, SQL Server, Oracle, DM, and more); SSH tunneling, proxies, and auto-reconnect; a query editor (CodeMirror 6 with SQL highlighting, metadata-aware completion, run-selection, formatting, history and snippets); a data grid (virtual scrolling, inline editing, SQL preview before save, filter/sort/pagination, export to CSV/JSON/Markdown/XLSX/INSERT); schema tools (schema browser, object browser, table structure editor, ER diagram, schema diff, explain plan, field lineage, database search); data operations (CSV/Excel import, cross-database transfer, database export, data compare, SQL file execution, file preview); dedicated Redis and MongoDB browsers; an AI SQL assistant with safety checks; an MCP server and CLI; desktop and Docker/Web as deployment targets.

**Data View (this repository's differentiating feature)**: organize saved SQL queries into runnable dashboards. A view holds shared variables (string/number/date/boolean/select, with dynamic default placeholders `{{today}}`, `{{yesterday}}`, `{{tomorrow}}`, `{{now}}`); each query is marked as a read-only query or a mutation, and mutations must pass a danger-confirmation dialog before executing; results render as tables or charts (bar/line/pie) with persistable chart configuration; result panels live on a 12-column grid with drag, resize, and automatic compaction; share links open a minimal viewer page without workspace chrome; views support import and export; queries can be added from the query editor in one click (auto-extracting `${name}` variables and splitting multi-statement tabs into separate queries).

## Repository layout

Target layout (not yet materialized when this file was created; treat it as the planning baseline — the actual directories are authoritative):

```
apps/desktop/   Vue 3 + TypeScript frontend
  src/components/    UI components (incl. components/dataView/)
  src/lib/           pure-function libraries (incl. lib/dataView/: grid layout, import/export, share link, dynamic defaults)
  src/stores/        Pinia state (incl. stores/dataViewStore.ts)
  src/types/         domain types (incl. types/dataView.ts)
  src/i18n/          locale files (dataView.* namespace)
src-tauri/      Tauri 2 desktop command layer (src-tauri/src/commands/data_view.rs, …)
crates/         Rust core (dbx-core: data_view.rs, data_view_params.rs; dbx-web: HTTP routes)
docs/           bilingual documentation (docs/AGENTS.md)
.agents/         agent notes and skills (.agents/AGENTS.md)
deploy/         Docker and Compose deployment configs
```

## Tech stack

Frontend: Tauri 2 + Vue 3 (composition API, `<script setup>`) + TypeScript + shadcn-vue/Tailwind CSS + CodeMirror 6 + ECharts. Backend: Rust (sqlx / tiberius / redis-rs / mongo-rust-driver). The Data View reuses the query editor, data grid, and chart components instead of building a separate rendering pipeline.

## Commands

```
make               # install dependencies and start the Tauri desktop dev environment
make dev-web       # start the frontend dev server only
make dev-backend   # start the backend (dbx-web) dev server only
make docs          # preview the local documentation site
make package       # package desktop installers
pnpm test          # vitest unit tests (apps/desktop)
pnpm build         # frontend build
cargo check        # Rust type check (crates/ and src-tauri/)
cargo test         # Rust tests
```

## Conventions

- ESM + TypeScript `strict`; no bare `any` (when unavoidable, comment why narrowing is infeasible).
- All UI copy goes through i18n dictionaries (e.g. the `dataView.*` namespace); hardcoded copy is forbidden; new interfaces must update every locale file in the same change.
- Naming: camelCase on the frontend (`dataView`), snake_case in Rust (`data_view`); convert cross-language payload shapes in each side's serialization layer, never scattered through business code.
- Mutation-style operations must pass a danger-confirmation dialog and report affected rows or an equivalent outcome.
- Registrations are effects: event listeners, timers, and store subscriptions must ship matching cleanup so unmount or plugin stop fully reclaims them.
- Pure-function modules under `lib/` (grid layout, dynamic defaults, share-link parsing) require vitest coverage; prefer interaction-focused component tests over snapshots.
- Commit messages follow Conventional Commits (`feat(grid): …`, `fix(redis): …`, `docs(data-view): …`).
- Non-trivial changes include a `.agents/notes/` decision record in the same commit; only mechanical local edits are exempt.
- Files end with exactly one trailing newline; one physical line per Markdown paragraph (editor soft-wrap).

## Documentation language

AGENTS.md instruction files stay English only. Every document an agent generates is bilingual: the Chinese primary `<name>.md` is displayed by default, and the English translation is recorded as `<name>.en.md` beside it; the pair updates in the same change. Tiering rules, the pairing contract, and the terminology table live in [docs/AGENTS.md](docs/AGENTS.md).

## Editing these instructions

Keep each rule self-contained while linking high-level docs. Instruction files stay English only; never reintroduce inline translations into them.
