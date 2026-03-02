CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    skills TEXT NOT NULL DEFAULT '[]',
    api_key TEXT NOT NULL UNIQUE,
    reputation DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tasks_completed BIGINT NOT NULL DEFAULT 0,
    tasks_failed BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
    updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','assigned','completed','timeout','failed')),
    owner_key TEXT NOT NULL,
    deadline_seconds BIGINT NOT NULL DEFAULT 3600,
    assigned_agent_id TEXT REFERENCES agents(id),
    assigned_at TEXT,
    created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
    updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    agent_id TEXT NOT NULL REFERENCES agents(id),
    confidence DOUBLE PRECISION NOT NULL CHECK(confidence >= 0.0 AND confidence <= 1.0),
    eta_seconds BIGINT NOT NULL,
    plan TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE TABLE IF NOT EXISTS deliverables (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    agent_id TEXT NOT NULL REFERENCES agents(id),
    output TEXT NOT NULL DEFAULT '{}',
    score DOUBLE PRECISION,
    feedback TEXT,
    submitted_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE INDEX IF NOT EXISTS idx_bids_task ON bids(task_id);
CREATE INDEX IF NOT EXISTS idx_bids_agent ON bids(agent_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_task ON deliverables(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
