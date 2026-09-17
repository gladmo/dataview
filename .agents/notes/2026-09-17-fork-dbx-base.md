# 以 dbx 源码为基座建立 dataview 仓库

## 背景

仓库需要同时具备 t8y2/dbx 的全部功能与 gladmo/dbx `feature-data-view` 分支的数据视图能力。自研重建 90+ 数据库驱动矩阵代价过高，而两个上游均为 Apache-2.0，允许以署名为前提的复用。用户在备选方案中明确确认采用源码基座策略。

## 决定

以 gladmo/dbx `feature-data-view` tip（9e99142，= t8y2/dbx main 同步至 2026-09-11 + 数据视图完整实现）为基线，`git merge --allow-unrelated-histories` 导入并保留全部上游历史；配置 `upstream`（t8y2/dbx）与 `gladmo` 两个远端供日后同步。品牌化：产品名 dataview、Tauri 标识 com.dataview.app（数据目录与已装 DBX 隔离）、深链 scheme `dataview://`、更新器指向占位域名并关闭更新工件；NOTICE 记录署名与本仓库改动。

## 替代方案

- 完全自研：周期不可接受，90+ 数据库只能长期逼近，放弃。
- 混合（移植 crates/ + 前端自研）：仍需重建整套前端，收益有限，放弃。
- 以 t8y2/main 为基线再 cherry-pick 数据视图提交：需手工重放 55 文件 +4019 行补丁且冲突密集，不如 gladmo 分支已完成的合并，放弃。
- 曾尝试从 upstream/main 恢复受损文件：其版本新于本基线，引用基线不存在的模块（sqlShortcutActions 等），引发版本漂移，回退并改为修复基线版本本身。

## 验证

- vitest 1334 文件 / 13921 用例全绿（含全部 dataView 规格：网格布局压缩、动态默认值、分享链接、导入导出、结果展示、页面交互）。
- vue-tsc typecheck 0 错误；`pnpm build` 前端构建成功；`cargo check`（dbx-core/dbx-web/dbx-mcp，跳过 DuckDB）通过；`cargo build -p dbx-web` 产出可运行二进制。
- HTTP 冒烟（dbx-web，隔离数据目录）：SQLite 连接保存、数据视图 CRUD、`${since}` 变量替换执行结果正确、mutation 未带 allowMutations 被服务端拦截、确认后影响行数=1、gridPos 布局持久化、删除后列表为空。
- 上游分支重复应用补丁造成的损伤已全部修复（useDataGridExport、EditorSettingsDialog、RedisKeyBrowser 及两处规格文件），并以邻接重复块检测器扫描全仓确认无残留。
- 基线 tag：`dbx-base` 打在导入合并提交上。
