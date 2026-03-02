use axum::{
    extract::{Path, Request, State},
    Json,
};
use uuid::Uuid;

use crate::auth::extract_api_key;
use crate::db::Pool;
use crate::errors::AppError;
use crate::models::*;

/// POST /tasks/:id/bid — agent submits a bid (requires agent API key)
pub async fn submit_bid(
    State(pool): State<Pool>,
    Path(task_id): Path<String>,
    request: Request,
) -> Result<Json<Bid>, AppError> {
    let api_key = extract_api_key(&request)?;

    // Verify agent
    let agent: Agent = sqlx::query_as("SELECT * FROM agents WHERE api_key = $1")
        .bind(&api_key)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid agent API key".into()))?;

    // Parse body manually since we consumed request for the key
    let body = axum::body::to_bytes(request.into_body(), 1024 * 1024)
        .await
        .map_err(|_| AppError::BadRequest("Invalid request body".into()))?;
    let req: SubmitBidRequest = serde_json::from_slice(&body)
        .map_err(|e| AppError::BadRequest(format!("Invalid JSON: {}", e)))?;

    // Verify task exists and is open
    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = $1")
        .bind(&task_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".into()))?;

    if task.status != "open" {
        return Err(AppError::Conflict("Task is not open for bidding".into()));
    }

    if req.confidence < 0.0 || req.confidence > 1.0 {
        return Err(AppError::BadRequest(
            "Confidence must be between 0.0 and 1.0".into(),
        ));
    }

    let id = Uuid::new_v4().to_string();
    let plan_json = serde_json::to_string(
        &req.plan
            .unwrap_or(serde_json::Value::Object(Default::default())),
    )
    .unwrap();

    sqlx::query(
        "INSERT INTO bids (id, task_id, agent_id, confidence, eta_seconds, plan) VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(&id)
    .bind(&task_id)
    .bind(&agent.id)
    .bind(req.confidence)
    .bind(req.eta_seconds)
    .bind(&plan_json)
    .execute(&pool)
    .await?;

    let bid: Bid = sqlx::query_as("SELECT * FROM bids WHERE id = $1")
        .bind(&id)
        .fetch_one(&pool)
        .await?;

    Ok(Json(bid))
}

/// POST /tasks/:id/assign — task owner selects a winning bid
pub async fn assign_task(
    State(pool): State<Pool>,
    Path(task_id): Path<String>,
    request: Request,
) -> Result<Json<Task>, AppError> {
    let owner_key = extract_api_key(&request)?;

    let body = axum::body::to_bytes(request.into_body(), 1024 * 1024)
        .await
        .map_err(|_| AppError::BadRequest("Invalid request body".into()))?;
    let req: AssignTaskRequest = serde_json::from_slice(&body)
        .map_err(|e| AppError::BadRequest(format!("Invalid JSON: {}", e)))?;

    // Verify ownership
    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = $1 AND owner_key = $2")
        .bind(&task_id)
        .bind(&owner_key)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found or unauthorized".into()))?;

    if task.status != "open" {
        return Err(AppError::Conflict("Task is not open for assignment".into()));
    }

    // Verify bid exists and belongs to this task
    let bid: Bid = sqlx::query_as("SELECT * FROM bids WHERE id = $1 AND task_id = $2")
        .bind(&req.bid_id)
        .bind(&task_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Bid not found for this task".into()))?;

    sqlx::query(
        "UPDATE tasks SET status = 'assigned', assigned_agent_id = $1, assigned_at = NOW()::TEXT, updated_at = NOW()::TEXT WHERE id = $2"
    )
    .bind(&bid.agent_id)
    .bind(&task_id)
    .execute(&pool)
    .await?;

    let updated: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = $1")
        .bind(&task_id)
        .fetch_one(&pool)
        .await?;

    Ok(Json(updated))
}
