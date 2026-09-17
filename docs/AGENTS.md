# AGENTS.md — The documentation standard

This file defines document structure, the bilingual contract, writing rules, and the terminology table. AGENTS.md instruction files are English only; every document an agent generates is bilingual.

## Bilingual contract

- Simplified Chinese (zh-CN) is the default language and the source of truth for generated documents; English is a maintained counterpart translation.
- Agent-generated documents use paired files: `<name>.md` is the Chinese primary, displayed by default, and the English translation is recorded as `<name>.en.md` beside it; the pair updates in the same PR — never one side only.
- AGENTS.md instruction files (root, `docs/`, `.agents/`) are the exception: English only, no inline translations, because they address agents rather than readers of the documentation tree.
- When paired content drifts, fix the English side against the Chinese authority.
- UI-copy i18n and documentation share the terminology table below; terms map one-to-one across the Chinese and English sides.

## Document structure

Locate a document before writing: its tree position fixes its scope — describe its own subject and its direct children's purpose and high-level behavior only, and link lower-level detail to its owning document. Classify each document as a tutorial (an ordered path to one outcome) or a reference (a lookup scope and current behavior); when both are substantial, split them or label the sections explicitly.

## Tier taxonomy

Each fact has exactly one home: it lives in the tier whose job it is; everywhere else links there.

| Tier | Job | Does NOT belong |
|---|---|---|
| Root `AGENTS.md` | Standing orders: rules an agent needs in every session, one to three lines each, linking their home | Tutorials, worked examples, restatement of linked homes |
| `docs/` | Human-facing tutorials and references, bilingual (`<name>.md` + `<name>.en.md` pairs) | Agent-internal process |
| `.agents/notes/` | Decision records: context, decision, alternatives, required verification; bilingual pairs like any agent-generated document | Migration plans, acceptance checklists once the decision has shipped |
| Package README | The per-package contract: config, semantics, limitations, extension points | JSDoc restatement, other packages' concerns |

## Writing rules

- Document current state; history stays in commits, PRs, and `.agents/notes/` — prose never narrates change processes.
- One physical line per paragraph (editor soft-wrap); code blocks and tables keep their own formatting.
- No "implemented/future" status annotations — status rots; the tree layout and package manifests carry it. (Target-state planning appears only in the repository-layout section of the root `AGENTS.md`.)
- Fenced code blocks must actually compile or run; pasted type declarations must match source.
- Use relative Markdown links for existing files; absolute URLs for other repositories.

## Terminology

| Chinese | English | Identifier |
|---|---|---|
| 数据视图 | Data View | `dataView` (frontend) / `data_view` (Rust) |
| 变量 | Variable | `variable` |
| 变更 | Mutation | `mutation` |
| 查询 | Query | `query` |
| 看板 | Dashboard | `dashboard` |
| 网格布局 | Grid layout | `gridPos`, `dataViewGridLayout` |
| 图表配置 | Chart configuration | `chartConfig` |
| 显示模式 | Display mode | `displayMode` (table/chart) |
| 分享链接 | Share link | `dataViewShareLink` |
| 动态默认值 | Dynamic default | `dynamicDefaults` (`{{today}}`, …) |
| 连接 | Connection | `connection` |
| 查询编辑器 | Query editor | query editor |
| 数据网格 | Data grid | data grid |
| 结构工具 | Schema tools | schema tools |
| 数据操作 | Data operations | data operations |
