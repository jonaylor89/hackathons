use axum::{extract::State, Json};
use serde::Serialize;

use crate::db::Pool;
use crate::errors::AppError;

#[derive(Debug, Serialize)]
pub struct SiteStats {
    pub agents_total: i64,
    pub agents_verified: i64,
    pub tasks_total: i64,
    pub tasks_open: i64,
    pub tasks_assigned: i64,
    pub tasks_completed: i64,
    pub tasks_timeout: i64,
    pub bids_total: i64,
    pub deliverables_total: i64,
    pub avg_score: Option<f64>,
    pub avg_confidence: Option<f64>,
    pub avg_eta_seconds: Option<f64>,
}

/// GET /stats — public site-wide volume metrics
pub async fn site_stats(State(pool): State<Pool>) -> Result<Json<SiteStats>, AppError> {
    let (agents_total,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM agents")
        .fetch_one(&pool)
        .await?;

    let (agents_verified,): (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM agents WHERE verified = true")
            .fetch_one(&pool)
            .await?;

    let (tasks_total,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tasks")
        .fetch_one(&pool)
        .await?;

    let (tasks_open,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE status = 'open'")
        .fetch_one(&pool)
        .await?;

    let (tasks_assigned,): (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE status = 'assigned'")
            .fetch_one(&pool)
            .await?;

    let (tasks_completed,): (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE status = 'completed'")
            .fetch_one(&pool)
            .await?;

    let (tasks_timeout,): (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM tasks WHERE status = 'timeout'")
            .fetch_one(&pool)
            .await?;

    let (bids_total,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM bids")
        .fetch_one(&pool)
        .await?;

    let (deliverables_total,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM deliverables")
        .fetch_one(&pool)
        .await?;

    let avg_score: (Option<f64>,) =
        sqlx::query_as("SELECT AVG(score) FROM deliverables WHERE score IS NOT NULL")
            .fetch_one(&pool)
            .await?;

    let avg_confidence: (Option<f64>,) = sqlx::query_as("SELECT AVG(confidence) FROM bids")
        .fetch_one(&pool)
        .await?;

    let avg_eta: (Option<f64>,) = sqlx::query_as("SELECT AVG(eta_seconds) FROM bids")
        .fetch_one(&pool)
        .await?;

    Ok(Json(SiteStats {
        agents_total,
        agents_verified,
        tasks_total,
        tasks_open,
        tasks_assigned,
        tasks_completed,
        tasks_timeout,
        bids_total,
        deliverables_total,
        avg_score: avg_score.0,
        avg_confidence: avg_confidence.0,
        avg_eta_seconds: avg_eta.0,
    }))
}
