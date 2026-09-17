<div align="center">

# dataview

90+ databases in one lightweight client — desktop, Docker, CLI, built-in AI assistant, MCP server, and parameterized Data View dashboards.

English | [简体中文](README.zh-CN.md)

</div>

> **Fork notice** — dataview is a fork of [DBX](https://github.com/t8y2/dbx) (Apache-2.0) carrying the [Data View feature](https://github.com/gladmo/dbx/tree/feature-data-view). See [NOTICE](NOTICE) for attribution and the changes made in this repository. Screenshots and some text below originate from upstream DBX.

## Why dataview?

<table>
  <tr>
    <td width="50%">
      <h3>🪶 20 MB, zero runtime bloat</h3>
      <p>No Java JRE. No Python venv. No bundled Chromium. DBX ships as a single small binary — download, install, connect. DBeaver needs Java; TablePlus is Freemium. DBX runs everywhere with nothing extra.</p>
    </td>
    <td width="50%">
      <h3>🤖 AI that lives in your editor</h3>
      <p>Highlight a table, describe what you want, get SQL back — no copy-paste between tools. Works with Claude, OpenAI, or local models via Ollama. Built-in safety checks review AI-generated SQL before it runs.</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🔌 MCP: your databases, AI-ready</h3>
      <p>DBX speaks the Model Context Protocol. Claude Code, Cursor, Windsurf, and other AI coding agents can query your databases through connections you already set up. One config, everywhere.</p>
    </td>
    <td>
      <h3>🌐 Desktop + Docker + Web</h3>
      <p>Native app on macOS, Windows, and Linux. Self-host via Docker for team access. Web version for browser-only environments. Same feature set. Same connections.</p>
    </td>
  </tr>
</table>

## Features

### 90+ Databases, One Tool

MySQL, PostgreSQL, SQLite, Cloudflare D1, Redis, MongoDB, DuckDB, ClickHouse, SQL Server, Oracle, Elasticsearch, Easysearch, Meilisearch, Qdrant, Milvus, Weaviate, MariaDB, TiDB, OceanBase, openGauss, GaussDB, KWDB, KingbaseES, Vastbase, GoldenDB, Doris, SelectDB, StarRocks, Manticore Search, Redshift, DM, TDengine, XuguDB, CockroachDB, Access, HighGo, UXDB, Dolt, and more. Agent-based profiles extend DBX to H2, Snowflake, Trino, PrestoSQL, Hive, DB2, Informix, Neo4j, Cassandra, BigQuery, Cloud Spanner, Kylin, SunDB, JDBCX, and custom JDBC connections. New native and agent-driven drivers also cover Databricks, SAP HANA, Teradata, Vertica, Firebird, Exasol, YashanDB, GBase 8a/8s, Databend, RQLite, Turso, InfluxDB, QuestDB, IoTDB, etcd, ZooKeeper, Nacos, Consul KV, IRIS, and more. Message queue admin is also available for Pulsar, Kafka, and RocketMQ. All in a single ~20 MB app. No bundled Chromium.

### Query Editor

CodeMirror 6 with SQL syntax highlighting, metadata-aware autocomplete, `Cmd+Enter` execution, selected SQL execution, SQL formatting, diagnostics, and 9 editor themes. Persistent query history, saved SQL snippets, tab restore, and SQL file execution keep repeat work close at hand.

### AI SQL Assistant

Describe what you want in plain language — get SQL back. DBX can explain queries, optimize SQL, fix errors, and run AI-generated SQL through built-in safety checks. Works with Claude, OpenAI, local models, or any OpenAI-compatible endpoint.

### Data Grid

Virtual-scrolled table that handles large result sets. Inline editing, SQL preview before save, WHERE / ORDER BY controls, DataGrip-style filters, LIKE / NOT LIKE context filters, sorting, full-text search, pagination, column resize, auto-fit, row numbers, zebra stripes, and full cell details. Export or copy as CSV, JSON, Markdown, XLSX, or INSERT statements.

### Schema Tools

- **Schema browser** — databases, schemas, tables, columns, indexes, foreign keys, triggers, with sidebar search & pin
- **Object browser** — grouped procedures, functions, views, and source editing where supported
- **Table structure editor** — reviewable column and index changes for supported engines
- **ER diagram** — visualize table relationships
- **Schema diff** — compare structures across connections
- **Explain plan** — visual query execution plan
- **Field lineage** — column-level lineage analysis
- **Database search** — find objects across large schemas

### Data Operations

- **Table import** — CSV, Excel
- **Data transfer** — migrate between databases
- **Database export** — full database dump
- **Data compare** — compare table data and review synchronization output
- **SQL file execution** — run `.sql` files directly
- **File preview** — drag & drop Parquet, CSV, JSON to preview instantly (powered by DuckDB)
- **Connection import** — bring connection profiles from DBeaver or Navicat

### Specialized Browsers

- **Redis** — key pattern search, batch key operations, command runner, TTL editing, and all data types (String, Hash, List, Set, ZSet, Stream)
- **MongoDB** — document CRUD with pagination, Atlas & replica set URL connection

### Safety & Connectivity

SSH tunnel (key & password) · database and AI proxy settings · auto-reconnect on connection loss · confirmation dialogs for destructive operations · encrypted config export/import · color-coded connections · driver store and optional JDBC plugin

### Polished UI

Dark mode with native title bar sync · 9 editor themes · English, 简体中文 & Español · layout preferences · built-in auto-update

## AI Agent Integration (MCP)

DBX provides a separate [Rust-powered MCP server](packages/mcp-server/) that lets AI coding agents query databases using connections configured in DBX. The MCP server is distributed independently from the desktop application, so installing DBX does not automatically install the MCP executable.

```bash
npx @dbx-app/mcp-server
```

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "dbx": { "command": "npx", "args": ["-y", "@dbx-app/mcp-server"] }
  }
}
```

Manage the connection allowlist and the **Read only**, **Data read/write**, and **Full access** modes in **DBX Settings → MCP**. The machine-readable values remain `read_only`, `safe_write`, and `high_risk_write`; client configs do not need permission or connection-scope environment variables.

For upgrade compatibility, an existing `DBX_MCP_ALLOW_WRITES=0` (or `false`) remains a read-only restriction only until a central MCP policy is saved for the first time; it can never enable writes or override a saved policy.

Windows portable builds need `DBX_DATA_DIR` in the MCP config, pointing to the `data` directory next to `DBX.exe` (the folder that contains `dbx.db`).

For DBX Web or Docker deployments, point the MCP server at the Web backend API. If the Web login page requires a password, set `DBX_WEB_PASSWORD` to the same password used there:

```json
{
  "mcpServers": {
    "dbx": {
      "command": "npx",
      "args": ["-y", "@dbx-app/mcp-server"],
      "env": {
        "DBX_WEB_URL": "http://localhost:4224",
        "DBX_WEB_PASSWORD": "your-web-login-password"
      }
    }
  }
}
```

Works with Claude Code, Cursor, Windsurf, and any MCP-compatible agent. Supports listing connections, browsing tables, executing SQL, and opening tables directly in DBX's UI.

Precompiled native binaries are also published for macOS, Linux, and Windows in [package releases](https://github.com/t8y2/dbx/releases?q=packages-v). They run without Node.js and are suitable for offline or server environments. The npm installation uses the same Rust binary through a small Node.js launcher.

DBX also provides a dedicated CLI package for terminal, script, and Codex workflows:

```bash
npm install -g @dbx-app/cli
# or via Homebrew
brew tap t8y2/tap && brew install dbx-cli
dbx connections list --json
dbx query local "select 1" --json
```

See the [MCP server README](packages/mcp-server/README.md) and [CLI README](packages/cli/README.md) for details.

## Install

dataview does not publish prebuilt installers yet; build from source.

Prerequisites: [Node.js](https://nodejs.org/) >= 18, [pnpm](https://pnpm.io/), [Rust](https://www.rust-lang.org/tools/install) >= 1.88 (plus the Tauri system dependencies for your platform — see Getting Started below).

```bash
pnpm install
make           # desktop dev environment
make package   # desktop installers
```

## Self-Hosted (Docker)

DBX provides a web version that can be deployed via Docker. The examples use
the `latest` tag to pull the current release.

```bash
docker run -d --pull=always --name dbx -p 4224:4224 -v dbx-data:/app/data dataview:local
```

This uses the cross-platform `dbx-data` named volume. Users in China can use
the CNB image, `dataview:local`, for faster pulls.

For Docker Compose, `deploy/docker-compose.yml` remains the source-build
configuration. To deploy a published image, use
`deploy/docker-compose.release.yml`:

```bash
docker compose -f deploy/docker-compose.release.yml up -d
```

```yaml
services:
  dbx:
    image: dataview:local
    # For faster pulls in China, use the CNB image instead:
    # image: dataview:local
    pull_policy: always
    ports:
      - "4224:4224"
    volumes:
      - dbx-data:/app/data
    restart: unless-stopped

volumes:
  dbx-data:
```

Open `http://localhost:4224` in your browser. Multi-arch images (amd64 / arm64) are available.

To publish DBX under a reverse-proxy context path such as `/dbx`, set the
runtime base path and proxy the same prefix to the container:

```yaml
environment:
  - DBX_PUBLIC_BASE_PATH=/dbx
```

When building the frontend yourself with an absolute asset base, set
`VITE_DBX_BASE_PATH=/dbx/` before `pnpm build`.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) >= 1.88

#### System Dependencies

**macOS:**

No additional dependencies required.

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev
```

**NIXOS/NIX :** 

<a href="README-NIX.md">See README-NIX.md</a>

**Windows:**

No additional dependencies required.

### Development

```bash
make
```

`make` installs root dependencies when needed and starts the local Tauri desktop development environment.

Development builds can run alongside an installed DBX instance and share its local data, including connections and history. Avoid changing the same connection or global setting in both windows at once.

> [!TIP]
> DuckDB compilation takes a while. If you're not working on DuckDB features,
> skip it to speed up local builds:
>
> ```bash
> # Fast checks (skip DuckDB)
> make cargo-check-fast
> make cargo-test-fast
>
> # Tauri dev without DuckDB
> make dev-fast
> ```
>
> The `--no-default-features` flag only affects local development.
> Release builds (`pnpm tauri build`) always include DuckDB.

Web version:

```bash
make dev-web       # frontend
make dev-backend   # backend
```

Documentation site:

```bash
make docs
```

The official DBX documentation site lives in `docs/`. If you want to improve the website content or documentation pages, edit the files under `docs/` and run `make docs` to preview the site locally.

For clean, reproducible local database instances, use the versioned Docker Compose recipes under [`deploy/database/`](deploy/database/README.md):

```bash
make db-list
make db-verify DB=mysql@8.4
```

JDBC agent driver development projects live in `agents/`:

```bash
cd agents
./gradlew test
```

Build artifacts from `agents/drivers/<db-type>/build/libs/` are picked up by local driver install flows when available.

### Build

```bash
make package
```

The installer will be in `src-tauri/target/release/bundle/`.

## Tech Stack

| Layer     | Technology                                                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | [Tauri 2](https://tauri.app/)                                                                                                                                                                                    |
| Frontend  | [Vue 3](https://vuejs.org/) + TypeScript                                                                                                                                                                         |
| UI        | [shadcn-vue](https://www.shadcn-vue.com/) + Tailwind CSS                                                                                                                                                         |
| Editor    | [CodeMirror 6](https://codemirror.net/)                                                                                                                                                                          |
| Backend   | Rust + [sqlx](https://github.com/launchbadge/sqlx) / [tiberius](https://github.com/prisma/tiberius) / [redis-rs](https://github.com/redis-rs/redis-rs) / [mongodb](https://github.com/mongodb/mongo-rust-driver) |

## Documentation

- [Official docs](https://dbxio.com/en/docs/what-is-dbx) — feature guides and tutorials
- [Database Test Lab](https://dbxio.com/en/docs/database-lab) — local database recipes for development and verification
- [Contributing](CONTRIBUTING.md) — how to pick up issues and open PRs
- [Web API reference](docs/content/docs/web-api.mdx) — HTTP API for Docker/Web deployments
- [Examples](examples/) — CLI, MCP, Docker, and API samples

## Contributors

<a href="https://github.com/t8y2/dbx/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=t8y2/dbx&max=300&columns=15" />
</a>

## License

[Apache-2.0](LICENSE)
