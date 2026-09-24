# Align Data View interaction and visual style with the Grafana dashboard paradigm

## Context

Data View already had the 12-column grid, drag/resize, table/chart dual modes, and mutation confirmation, but its interaction was still "form + one-shot execution": no auto refresh, no "last refreshed" feedback, no data-size information on result panels, no empty-result hint; the list page devoted a whole toolbar row to search; the editor was a flat form with no column headers for variables and no way to tell query cards from mutation cards at a glance. The user asked to optimize style and interaction with Grafana as the reference, while staying consistent with this project's own conventions (shadcn-vue + Tailwind tokens, h-9 compact toolbars, ghost icon buttons, full i18n coverage).

## Decision

- The Runner becomes a Grafana-style dashboard: an h-8 controls bar hosts the Run button, an auto-refresh interval picker (off/5s/10s/30s/1m/5m/15m), a running-elapsed or "refreshed N ago" status, the variables-row collapse toggle, and the layout-edit toggle; while executing, a 2px indeterminate progress bar slides along the bar's bottom edge instead of the old full-width dashed notice. The variables area drops to a borderless sub-bar (bg-muted/10), and boolean variables use a Switch instead of a bare checkbox. The results area scrolls independently so the toolbar and variables stay visible; panel headers reveal table/chart icon toggles on hover, panel footers show "rows · cols" stats, and empty results show a no-data hint. Auto refresh is driven by the pure module `lib/dataView/dataViewAutoRefresh.ts`: a setTimeout chain anchored at the last run's start (slow queries never stack ticks), skipped while `document.hidden`, fully cleaned up on unmount; the existing 12-column grid and gesture logic are unchanged.
- List page: the search box moves into the title toolbar (saving a whole row); entries become two-line rows (name + query-count badge / description) with an indigo-tinted icon badge; hover actions remain, and the context menu and delete-confirmation flow are unchanged.
- Editor: split into three cards ("General / Variables / Queries") with a uniform h-8 section header; the variables area becomes an aligned grid with column headers (name/label/type/default/required) and the cryptic "SQL" button is relabeled "Extract from SQL"; query cards get an amber border and badge for mutations, and the preview button switches to the secondary variant for visibility.
- All new copy enters the `dataView.*` namespace across all 9 locales containing that block (English for en/es/it/ja/ko/pt-BR/tr, Chinese for zh-CN/zh-TW, with zh-TW following its block's existing simplified-script convention); interval options (5s/1m…) are pure symbols and stay untranslated.

## Alternatives

- Adopting a third-party Vue grid library (react-grid-layout style) for richer panel gestures: the existing in-house gestures (rAF-throttled drag + vertical compaction) already cover the need, and the dependency and testing cost is disproportionate; rejected.
- Persisting auto refresh as view-level configuration (stored in the DataView entity): readers of a share link would inherit the author's polling; refresh policy is viewer session state, so it stays component-local; rejected.
- Per-panel single-query refresh (Grafana's per-panel query): execution currently runs per view in one batch, and single-panel refresh would need backend changes beyond this styling/interaction pass; not done.
- Putting run controls in the DataViewPage header: the Runner also serves the share page (embedded), so controls must travel with the component to avoid two competing headers; rejected.

## Verification

- The new `dataViewAutoRefresh.spec.ts` (9 cases: interval table ordered and unique, id resolution, anchored-delay clamping, short-duration formatting) is green.
- `DataViewPage.spec.ts` (6 cases: row rendering / search filtering / empty states / direct editor open / delete-confirmation flow) passes with unmodified assertions after the redesign, confirming list behavior and testable selectors did not regress.
- Full vitest suite, vue-tsc typecheck, and oxlint pass (only two pre-existing warnings remain, both in old code untouched by this change); oxfmt reports no diff.
