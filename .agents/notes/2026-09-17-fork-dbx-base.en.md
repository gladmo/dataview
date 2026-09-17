# Establishing the dataview repository on the dbx source base

## Context

The repository needs both the full feature set of t8y2/dbx and the Data View capability from the gladmo/dbx `feature-data-view` branch. Rebuilding the 90+ database driver matrix from scratch was prohibitive, while both upstreams are Apache-2.0 and permit reuse with attribution. The user explicitly chose the source-base strategy.

## Decision

Base the repository on gladmo/dbx `feature-data-view` tip (9e99142 = t8y2/dbx main synced through 2026-09-11 plus the complete Data View implementation), imported via `git merge --allow-unrelated-histories` with full upstream history retained; remotes `upstream` (t8y2/dbx) and `gladmo` are configured for future syncs. Rebranded: product name dataview, Tauri identifier com.dataview.app (data directory isolated from any installed DBX), deep-link scheme `dataview://`, updater endpoints pointed at a placeholder domain with updater artifacts disabled; NOTICE records attribution and this repository's changes.

## Alternatives

- Full reimplementation: unacceptable timeline — the 90+ database matrix could only be approximated over a long horizon; rejected.
- Hybrid (port crates/ only, rebuild the frontend): still requires rebuilding the entire frontend for limited gain; rejected.
- Basing on t8y2/main and cherry-picking the Data View commits: replaying a 55-file, +4019-line patch through dense expected conflicts loses to the gladmo branch's finished merge; rejected.
- Restoring damaged files from upstream/main was tried and rolled back: that side is newer than this baseline and references modules the baseline lacks (sqlShortcutActions et al.), causing version drift; the baseline copies were repaired instead.

## Verification

- vitest: 1334 files / 13,921 tests green (including every dataView spec: grid compaction, dynamic defaults, share links, import/export, result display, page interaction).
- vue-tsc typecheck: 0 errors; `pnpm build` succeeds; `cargo check` (dbx-core/dbx-web/dbx-mcp, DuckDB skipped) passes; `cargo build -p dbx-web` produces a runnable binary.
- HTTP smoke (dbx-web, isolated data dir): SQLite connection save; Data View CRUD; `${since}` variable substitution returns correct grouped rows; a mutation without allowMutations is rejected server-side; with confirmation it reports affected_rows=1; gridPos layout persists; delete clears the list.
- All damage from the upstream branch's duplicated patch application is repaired (useDataGridExport, EditorSettingsDialog, RedisKeyBrowser, two spec files), verified by a repo-wide adjacent-duplicate-block scan with no remaining hits.
- Baseline tag: `dbx-base` on the import merge commit.
