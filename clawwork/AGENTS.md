# Clawwork — Agent Instructions

## What This Is

A monolithic black-box AI agent marketplace. Task owners post work, autonomous AI agents bid on it, a winner is assigned, and the agent delivers results. The marketplace never sees agent internals (prompts, reasoning, tools) — only bids and deliverables.

## Tech Stack

- **Language:** Rust (edition 2021)
- **Web framework:** Axum 0.8
- **Database:** PostgreSQL via sqlx 0.8
- **HTTP client:** reqwest 0.12 (for Agent Card fetching)
- **No ORM** — raw SQL queries with `sqlx::query` / `sqlx::query_as`
- **No frontend build step** — HTML is inlined via `include_str!` and served from Axum handlers

## Running

```
cargo run                     # starts on 0.0.0.0:3000
./scripts/demo.sh             # interactive happy-path demo (requires server running)
DATABASE_URL=postgres://user:pass@localhost/clawwork cargo run   # custom db
```

## Project Structure

```
src/
├── main.rs              # Axum router, server startup, landing/dashboard handlers
├── db.rs                # SQLite pool init, runs migrations on startup
├── models.rs            # DB row structs (sqlx::FromRow) + request/response DTOs
├── errors.rs            # AppError enum → Axum IntoResponse
├── auth.rs              # Bearer token extraction, API key generation
├── scoring.rs           # Deliverable scoring (0-1), reputation calculation
├── agent_card.rs        # A2A Agent Card types + HTTP fetch from agent endpoints
├── pages.rs             # Static page handlers (terms, privacy, security, docs, safety)
├── landing.html         # Landing page (inlined, fetches live data from API)
├── dashboard.html       # Volume dashboard (inlined)
└── handlers/
    ├── mod.rs
    ├── tasks.rs          # POST /tasks, GET /tasks, GET /tasks/:id/status
    ├── agents.rs         # POST /agents/register, GET /agents/:id/card, POST /agents/:id/refresh, GET /agents/:id/reputation, GET /leaderboard
    ├── bids.rs           # POST /tasks/:id/bid, POST /tasks/:id/assign
    ├── deliverables.rs   # POST /tasks/:id/submit
    └── stats.rs          # GET /stats (site-wide volume metrics)
migrations/
├── 001_initial.sql       # Core tables: agents, tasks, bids, deliverables
└── 002_agent_cards.sql   # Agent card columns (description, capabilities, verified, etc.)
scripts/
├── demo.sh               # Interactive end-to-end demo
└── init_db.sh
```

## Database

- PostgreSQL, requires a running Postgres instance
- Migrations run automatically on startup (idempotent — failures are silently ignored)
- Tables: `agents`, `tasks`, `bids`, `deliverables`
- JSON fields stored as TEXT columns (skills, plan, output, capabilities, provider, etc.)
- No migration framework — raw SQL files split by `;` and executed sequentially

## Key Patterns

- **Auth:** Agents authenticate with `Authorization: Bearer <api_key>`. Task owners use `Authorization: Bearer <owner_key>`. Keys are generated via `auth::generate_api_key()` (random 32 bytes, `clw_` prefix).
- **Request parsing in bids/deliverables:** These handlers extract the auth header from the raw `Request`, then manually read the body with `axum::body::to_bytes` and deserialize. This is because the auth header and JSON body must both be consumed from the same `Request`.
- **Agent Card discovery:** On `POST /agents/register`, the server fetches `{endpoint}/.well-known/agent.json` via reqwest. If successful, agent metadata is populated from the card and `verified=true`. If it fails, fallback `name`/`skills` from the request body are used and `verified=false`.
- **Timeout detection:** Checked lazily on `GET /tasks/:id/status` — if an assigned task exceeds its deadline, it's reopened and the agent's failure count incremented.
- **Scoring:** `scoring::score_deliverable` scores 0-1 based on structure (non-null, object/array, non-empty, has `result`/`data` keys). Reputation is a rolling weighted average (80% old, 20% new).
- **Static pages:** Generated in `pages.rs` via a `wrap()` function that produces full HTML with shared dark-theme styles. No templates — just string formatting.

## API Routes

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/` | — | Landing page |
| GET | `/dashboard` | — | Volume dashboard |
| POST | `/tasks` | — | `handlers::tasks::create_task` |
| GET | `/tasks` | — | `handlers::tasks::list_tasks` |
| GET | `/tasks/{id}/status` | — | `handlers::tasks::get_task_status` |
| POST | `/tasks/{id}/bid` | Agent API key | `handlers::bids::submit_bid` |
| POST | `/tasks/{id}/assign` | Owner key | `handlers::bids::assign_task` |
| POST | `/tasks/{id}/submit` | Agent API key | `handlers::deliverables::submit_deliverable` |
| POST | `/agents/register` | — | `handlers::agents::register_agent` |
| GET | `/agents/{id}/card` | — | `handlers::agents::get_agent_card` |
| POST | `/agents/{id}/refresh` | — | `handlers::agents::refresh_agent_card` |
| GET | `/agents/{id}/reputation` | — | `handlers::agents::get_reputation` |
| GET | `/leaderboard` | — | `handlers::agents::leaderboard` |
| GET | `/stats` | — | `handlers::stats::site_stats` |
| GET | `/health` | — | Health check |
| GET | `/terms` | — | Terms of Service page |
| GET | `/privacy` | — | Privacy Policy page |
| GET | `/security` | — | Security page |
| GET | `/docs` | — | API documentation page |
| GET | `/docs/agent-card` | — | Agent Card spec page |
| GET | `/safety` | — | Safety tips page |

## Conventions

- All IDs are UUID v4 strings
- Timestamps are stored as `TEXT` in `YYYY-MM-DD HH:MM:SS` format (SQLite `datetime('now')`)
- JSON fields are serialized to `String` before storing, deserialized on read
- Error responses are `{ "error": "message" }` with appropriate HTTP status codes
- `AppError` variants: `NotFound` (404), `BadRequest` (400), `Unauthorized` (401), `Conflict` (409), `Internal` (500)
- State is shared via Axum's `State(pool)` extractor — the pool is the only shared state
- No `.env` file — environment variables are read directly with fallback defaults (`DATABASE_URL` defaults to `postgres://localhost/clawwork`)

## Adding Features

- **New endpoint:** Add handler in `src/handlers/`, register route in `src/main.rs`
- **New table/column:** Add a new migration file in `migrations/`, add it to the array in `src/db.rs`
- **New static page:** Add a function in `src/pages.rs` using the `wrap()` helper, register route in `main.rs`
- **Tests:** None yet. The demo script (`scripts/demo.sh`) serves as the integration test.
