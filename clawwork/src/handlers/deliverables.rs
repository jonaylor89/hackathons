use axum::{
    extract::{Path, Request, State},
    Json,
};
use uuid::Uuid;

use crate::auth::extract_api_key;
use crate::db::Pool;
use crate::errors::AppError;
use crate::models::*;
use crate::scoring;

/// POST /tasks/:id/submit — assigned agent submits deliverable
pub async fn submit_deliverable(
    State(pool): State<Pool>,
    Path(task_id): Path<String>,
    request: Request,
) -> Result<Json<Deliverable>, AppError> {
    let api_key = extract_api_key(&request)?;

    // Verify agent
    let agent: Agent = sqlx::query_as("SELECT * FROM agents WHERE api_key = $1")
        .bind(&api_key)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid agent API key".into()))?;

    let body = axum::body::to_bytes(request.into_body(), 10 * 1024 * 1024)
        .await
        .map_err(|_| AppError::BadRequest("Invalid request body".into()))?;
    let req: SubmitDeliverableRequest = serde_json::from_slice(&body)
        .map_err(|e| AppError::BadRequest(format!("Invalid JSON: {}", e)))?;

    // Verify task is assigned to this agent
    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = $1")
        .bind(&task_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".into()))?;

    if task.status != "assigned" {
        return Err(AppError::Conflict("Task is not in assigned state".into()));
    }

    match &task.assigned_agent_id {
        Some(assigned_id) if assigned_id == &agent.id => {}
        _ => {
            return Err(AppError::Unauthorized(
                "You are not the assigned agent for this task".into(),
            ));
        }
    }

    // Score the deliverable
    let score = scoring::score_deliverable(&req.output);
    let feedback = if score >= 0.8 {
        "Excellent deliverable"
    } else if score >= 0.5 {
        "Acceptable deliverable"
    } else {
        "Deliverable needs improvement"
    };

    let id = Uuid::new_v4().to_string();
    let output_json = serde_json::to_string(&req.output).unwrap();

    sqlx::query(
        "INSERT INTO deliverables (id, task_id, agent_id, output, score, feedback) VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(&id)
    .bind(&task_id)
    .bind(&agent.id)
    .bind(&output_json)
    .bind(score)
    .bind(feedback)
    .execute(&pool)
    .await?;

    // Update task status
    sqlx::query("UPDATE tasks SET status = 'completed', updated_at = NOW()::TEXT WHERE id = $1")
        .bind(&task_id)
        .execute(&pool)
        .await?;

    // Update agent reputation
    let new_rep = scoring::update_reputation(agent.reputation, score, agent.tasks_completed + 1);

    sqlx::query(
        "UPDATE agents SET reputation = $1, tasks_completed = tasks_completed + 1, updated_at = NOW()::TEXT WHERE id = $2",
    )
    .bind(new_rep)
    .bind(&agent.id)
    .execute(&pool)
    .await?;

    let deliverable: Deliverable = sqlx::query_as("SELECT * FROM deliverables WHERE id = $1")
        .bind(&id)
        .fetch_one(&pool)
        .await?;

    Ok(Json(deliverable))
}
