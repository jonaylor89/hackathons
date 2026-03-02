use serde::{Deserialize, Serialize};

// ── Database row types ──

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub endpoint: String,
    pub description: String,
    pub version: String,
    pub skills: String,   // JSON array stored as text
    pub provider: String, // JSON object
    pub documentation_url: Option<String>,
    pub capabilities: String,      // JSON object
    pub input_modes: String,       // JSON array
    pub output_modes: String,      // JSON array
    pub card_json: Option<String>, // full raw agent card
    pub verified: bool,
    pub last_verified_at: Option<String>,
    pub api_key: String,
    pub reputation: f64,
    pub tasks_completed: i64,
    pub tasks_failed: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub owner_key: String,
    pub recommended_skills: String, // JSON array stored as text
    pub deadline_seconds: i64,
    pub assigned_agent_id: Option<String>,
    pub assigned_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Bid {
    pub id: String,
    pub task_id: String,
    pub agent_id: String,
    pub confidence: f64,
    pub eta_seconds: i64,
    pub plan: String, // JSON stored as text
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Deliverable {
    pub id: String,
    pub task_id: String,
    pub agent_id: String,
    pub output: String, // JSON stored as text
    pub score: Option<f64>,
    pub feedback: Option<String>,
    pub submitted_at: String,
}

// ── Request / response DTOs ──

#[derive(Debug, Deserialize)]
pub struct RegisterAgentRequest {
    /// The agent's base URL. Marketplace will fetch `/.well-known/agent.json` from here.
    pub endpoint: String,
    /// Fallback name if agent card fetch fails.
    pub name: Option<String>,
    /// Fallback skills if agent card fetch fails.
    pub skills: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct RegisterAgentResponse {
    pub id: String,
    pub api_key: String,
    pub verified: bool,
    pub name: String,
    pub skills: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct AgentCardResponse {
    pub agent_id: String,
    pub verified: bool,
    pub last_verified_at: Option<String>,
    pub card: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct RefreshCardResponse {
    pub verified: bool,
    pub name: String,
    pub skills: Vec<String>,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: String,
    pub deadline_seconds: Option<i64>,
    pub recommended_skills: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ListTasksQuery {
    pub status: Option<String>,
    pub skills: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateTaskResponse {
    pub id: String,
    pub owner_key: String,
}

#[derive(Debug, Deserialize)]
pub struct SubmitBidRequest {
    pub confidence: f64,
    pub eta_seconds: i64,
    pub plan: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct AssignTaskRequest {
    pub bid_id: String,
}

#[derive(Debug, Deserialize)]
pub struct SubmitDeliverableRequest {
    pub output: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct TaskStatusResponse {
    pub id: String,
    pub title: String,
    pub status: String,
    pub recommended_skills: Vec<String>,
    pub assigned_agent_id: Option<String>,
    pub deadline_seconds: i64,
    pub assigned_at: Option<String>,
    pub created_at: String,
    pub bids: Vec<BidSummary>,
    pub deliverable: Option<DeliverableSummary>,
}

#[derive(Debug, Serialize)]
pub struct BidSummary {
    pub id: String,
    pub agent_id: String,
    pub confidence: f64,
    pub eta_seconds: i64,
    pub plan: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct DeliverableSummary {
    pub id: String,
    pub agent_id: String,
    pub output: serde_json::Value,
    pub score: Option<f64>,
    pub feedback: Option<String>,
    pub submitted_at: String,
}

#[derive(Debug, Serialize)]
pub struct AgentReputation {
    pub id: String,
    pub name: String,
    pub description: String,
    pub verified: bool,
    pub reputation: f64,
    pub tasks_completed: i64,
    pub tasks_failed: i64,
    pub skills: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct LeaderboardEntry {
    pub rank: usize,
    pub agent_id: String,
    pub name: String,
    pub reputation: f64,
    pub tasks_completed: i64,
}

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub error: String,
}
