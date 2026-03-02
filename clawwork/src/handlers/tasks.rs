use axum::{extract::Path, extract::Query, extract::State, Json};
use uuid::Uuid;

use crate::auth::generate_api_key;
use crate::db::Pool;
use crate::errors::AppError;
use crate::models::*;

/// POST /tasks
pub async fn create_task(
    State(pool): State<Pool>,
    Json(req): Json<CreateTaskRequest>,
) -> Result<Json<CreateTaskResponse>, AppError> {
    if req.title.is_empty() || req.description.is_empty() {
        return Err(AppError::BadRequest(
            "Title and description are required".into(),
        ));
    }

    let id = Uuid::new_v4().to_string();
    let owner_key = generate_api_key();
    let deadline = req.deadline_seconds.unwrap_or(3600);
    let skills_json = serde_json::to_string(&req.recommended_skills.unwrap_or_default()).unwrap();

    sqlx::query(
        "INSERT INTO tasks (id, title, description, owner_key, deadline_seconds, recommended_skills) VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(&id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&owner_key)
    .bind(deadline)
    .bind(&skills_json)
    .execute(&pool)
    .await?;

    Ok(Json(CreateTaskResponse { id, owner_key }))
}

/// GET /tasks/:id/status
pub async fn get_task_status(
    State(pool): State<Pool>,
    Path(task_id): Path<String>,
) -> Result<Json<TaskStatusResponse>, AppError> {
    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = $1")
        .bind(&task_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".into()))?;

    // Check timeout
    check_and_timeout_task(&pool, &task).await?;

    // Re-fetch in case status changed
    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = $1")
        .bind(&task_id)
        .fetch_one(&pool)
        .await?;

    let bids: Vec<Bid> =
        sqlx::query_as("SELECT * FROM bids WHERE task_id = $1 ORDER BY confidence DESC")
            .bind(&task_id)
            .fetch_all(&pool)
            .await?;

    let deliverable: Option<Deliverable> = sqlx::query_as(
        "SELECT * FROM deliverables WHERE task_id = $1 ORDER BY submitted_at DESC LIMIT 1",
    )
    .bind(&task_id)
    .fetch_optional(&pool)
    .await?;

    let bid_summaries: Vec<BidSummary> = bids
        .into_iter()
        .map(|b| BidSummary {
            id: b.id,
            agent_id: b.agent_id,
            confidence: b.confidence,
            eta_seconds: b.eta_seconds,
            plan: serde_json::from_str(&b.plan).unwrap_or(serde_json::Value::Null),
            created_at: b.created_at,
        })
        .collect();

    let deliverable_summary = deliverable.map(|d| DeliverableSummary {
        id: d.id,
        agent_id: d.agent_id,
        output: serde_json::from_str(&d.output).unwrap_or(serde_json::Value::Null),
        score: d.score,
        feedback: d.feedback,
        submitted_at: d.submitted_at,
    });

    let recommended_skills: Vec<String> =
        serde_json::from_str(&task.recommended_skills).unwrap_or_default();

    Ok(Json(TaskStatusResponse {
        id: task.id,
        title: task.title,
        status: task.status,
        recommended_skills,
        assigned_agent_id: task.assigned_agent_id,
        deadline_seconds: task.deadline_seconds,
        assigned_at: task.assigned_at,
        created_at: task.created_at,
        bids: bid_summaries,
        deliverable: deliverable_summary,
    }))
}

/// GET /tasks — list tasks with optional filters (?status=open&skills=code-review,python)
pub async fn list_tasks(
    State(pool): State<Pool>,
    Query(params): Query<ListTasksQuery>,
) -> Result<Json<Vec<Task>>, AppError> {
    let mut sql = String::from("SELECT * FROM tasks");
    let mut conditions: Vec<String> = Vec::new();
    let mut binds: Vec<String> = Vec::new();

    if let Some(ref status) = params.status {
        conditions.push(format!("status = ${}", binds.len() + 1));
        binds.push(status.clone());
    }

    if !conditions.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conditions.join(" AND "));
    }

    sql.push_str(" ORDER BY created_at DESC LIMIT 100");

    let mut query = sqlx::query_as::<_, Task>(&sql);
    for val in &binds {
        query = query.bind(val);
    }

    let mut tasks: Vec<Task> = query.fetch_all(&pool).await?;

    // Filter by skills in application code since recommended_skills is a JSON
    // array stored as text and SQLite JSON support varies.
    if let Some(ref skills_param) = params.skills {
        let requested: Vec<&str> = skills_param.split(',').map(|s| s.trim()).collect();
        tasks.retain(|t| {
            let task_skills: Vec<String> =
                serde_json::from_str(&t.recommended_skills).unwrap_or_default();
            requested
                .iter()
                .any(|r| task_skills.iter().any(|ts| ts.eq_ignore_ascii_case(r)))
        });
    }

    Ok(Json(tasks))
}

/// Check if an assigned task has timed out and reopen it.
async fn check_and_timeout_task(pool: &Pool, task: &Task) -> Result<(), AppError> {
    if task.status != "assigned" {
        return Ok(());
    }

    if let Some(ref assigned_at) = task.assigned_at {
        if let Ok(assigned_time) =
            chrono::NaiveDateTime::parse_from_str(assigned_at, "%Y-%m-%d %H:%M:%S")
        {
            let now = chrono::Utc::now().naive_utc();
            let elapsed = (now - assigned_time).num_seconds();
            if elapsed > task.deadline_seconds {
                tracing::warn!(task_id = %task.id, "Task timed out, reopening for bidding");

                sqlx::query(
                    "UPDATE tasks SET status = 'open', assigned_agent_id = NULL, assigned_at = NULL, updated_at = NOW()::TEXT WHERE id = $1"
                )
                .bind(&task.id)
                .execute(pool)
                .await?;

                // Increment failed count for the agent
                if let Some(ref agent_id) = task.assigned_agent_id {
                    sqlx::query(
                        "UPDATE agents SET tasks_failed = tasks_failed + 1, updated_at = NOW()::TEXT WHERE id = $1"
                    )
                    .bind(agent_id)
                    .execute(pool)
                    .await?;
                }
            }
        }
    }

    Ok(())
}
