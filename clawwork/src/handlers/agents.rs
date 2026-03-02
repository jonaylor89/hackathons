use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::agent_card;
use crate::auth::generate_api_key;
use crate::db::Pool;
use crate::errors::AppError;
use crate::models::*;

/// POST /agents/register
///
/// Accepts an endpoint URL. The marketplace fetches `/.well-known/agent.json`
/// from that endpoint. If the card is valid, the agent is registered as verified
/// with metadata from the card. If the fetch fails, fallback `name`/`skills`
/// fields are used and the agent is registered as unverified.
pub async fn register_agent(
    State(pool): State<Pool>,
    Json(req): Json<RegisterAgentRequest>,
) -> Result<Json<RegisterAgentResponse>, AppError> {
    if req.endpoint.is_empty() {
        return Err(AppError::BadRequest(
            "Agent endpoint URL is required".into(),
        ));
    }

    let id = Uuid::new_v4().to_string();
    let api_key = generate_api_key();

    // Try to fetch the agent card
    let card_result = agent_card::fetch_agent_card(&req.endpoint).await;

    let (
        name,
        description,
        version,
        skills_json,
        provider_json,
        doc_url,
        caps_json,
        input_modes,
        output_modes,
        card_json,
        verified,
    ) = match card_result {
        Ok(card) => {
            let skill_ids: Vec<String> = card.skills.iter().map(|s| s.id.clone()).collect();
            let skills = serde_json::to_string(&skill_ids).unwrap();
            let provider = serde_json::to_string(&card.provider).unwrap();
            let caps = serde_json::to_string(&card.capabilities).unwrap();
            let in_modes = serde_json::to_string(&card.default_input_modes).unwrap();
            let out_modes = serde_json::to_string(&card.default_output_modes).unwrap();
            let raw = serde_json::to_string(&card).unwrap();

            tracing::info!(agent = %card.name, "Agent card fetched and verified");

            (
                card.name,
                card.description,
                card.version,
                skills,
                provider,
                card.documentation_url,
                caps,
                in_modes,
                out_modes,
                Some(raw),
                true,
            )
        }
        Err(err) => {
            let name = req.name.clone().unwrap_or_default();
            if name.is_empty() {
                return Err(AppError::BadRequest(format!(
                    "Agent card fetch failed ({err}) and no fallback name provided"
                )));
            }
            let skills = serde_json::to_string(&req.skills.clone().unwrap_or_default()).unwrap();

            tracing::warn!(
                endpoint = %req.endpoint,
                error = %err,
                "Agent card fetch failed, registering as unverified"
            );

            (
                name,
                String::new(),
                String::new(),
                skills,
                "{}".to_string(),
                None,
                "{}".to_string(),
                r#"["text"]"#.to_string(),
                r#"["text"]"#.to_string(),
                None,
                false,
            )
        }
    };

    let verified_at: Option<String> = if verified {
        Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
    } else {
        None
    };

    sqlx::query(
        "INSERT INTO agents (id, name, endpoint, description, version, skills, provider, documentation_url, capabilities, input_modes, output_modes, card_json, verified, last_verified_at, api_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)",
    )
    .bind(&id)
    .bind(&name)
    .bind(&req.endpoint)
    .bind(&description)
    .bind(&version)
    .bind(&skills_json)
    .bind(&provider_json)
    .bind(&doc_url)
    .bind(&caps_json)
    .bind(&input_modes)
    .bind(&output_modes)
    .bind(&card_json)
    .bind(verified)
    .bind(&verified_at)
    .bind(&api_key)
    .execute(&pool)
    .await?;

    let skills_vec: Vec<String> = serde_json::from_str(&skills_json).unwrap_or_default();

    Ok(Json(RegisterAgentResponse {
        id,
        api_key,
        verified,
        name,
        skills: skills_vec,
    }))
}

/// GET /agents/:id/card — return the stored agent card
pub async fn get_agent_card(
    State(pool): State<Pool>,
    Path(agent_id): Path<String>,
) -> Result<Json<AgentCardResponse>, AppError> {
    let agent: Agent = sqlx::query_as("SELECT * FROM agents WHERE id = $1")
        .bind(&agent_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Agent not found".into()))?;

    let card = agent.card_json.and_then(|s| serde_json::from_str(&s).ok());

    Ok(Json(AgentCardResponse {
        agent_id: agent.id,
        verified: agent.verified,
        last_verified_at: agent.last_verified_at,
        card,
    }))
}

/// POST /agents/:id/refresh — re-fetch the agent card from the endpoint
pub async fn refresh_agent_card(
    State(pool): State<Pool>,
    Path(agent_id): Path<String>,
) -> Result<Json<RefreshCardResponse>, AppError> {
    let agent: Agent = sqlx::query_as("SELECT * FROM agents WHERE id = $1")
        .bind(&agent_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Agent not found".into()))?;

    match agent_card::fetch_agent_card(&agent.endpoint).await {
        Ok(card) => {
            let skill_ids: Vec<String> = card.skills.iter().map(|s| s.id.clone()).collect();
            let skills_json = serde_json::to_string(&skill_ids).unwrap();
            let provider_json = serde_json::to_string(&card.provider).unwrap();
            let caps_json = serde_json::to_string(&card.capabilities).unwrap();
            let in_modes = serde_json::to_string(&card.default_input_modes).unwrap();
            let out_modes = serde_json::to_string(&card.default_output_modes).unwrap();
            let raw = serde_json::to_string(&card).unwrap();
            let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

            sqlx::query(
                "UPDATE agents SET name = $1, description = $2, version = $3, skills = $4, provider = $5, documentation_url = $6, capabilities = $7, input_modes = $8, output_modes = $9, card_json = $10, verified = true, last_verified_at = $11, updated_at = NOW()::TEXT WHERE id = $12"
            )
            .bind(&card.name)
            .bind(&card.description)
            .bind(&card.version)
            .bind(&skills_json)
            .bind(&provider_json)
            .bind(&card.documentation_url)
            .bind(&caps_json)
            .bind(&in_modes)
            .bind(&out_modes)
            .bind(&raw)
            .bind(&now)
            .bind(&agent_id)
            .execute(&pool)
            .await?;

            Ok(Json(RefreshCardResponse {
                verified: true,
                name: card.name,
                skills: skill_ids,
                message: "Agent card refreshed and verified".into(),
            }))
        }
        Err(err) => {
            sqlx::query(
                "UPDATE agents SET verified = false, updated_at = NOW()::TEXT WHERE id = $1",
            )
            .bind(&agent_id)
            .execute(&pool)
            .await?;

            Ok(Json(RefreshCardResponse {
                verified: false,
                name: agent.name,
                skills: serde_json::from_str(&agent.skills).unwrap_or_default(),
                message: format!("Card fetch failed: {err}"),
            }))
        }
    }
}

/// GET /agents/:id/reputation
pub async fn get_reputation(
    State(pool): State<Pool>,
    Path(agent_id): Path<String>,
) -> Result<Json<AgentReputation>, AppError> {
    let agent: Agent = sqlx::query_as("SELECT * FROM agents WHERE id = $1")
        .bind(&agent_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Agent not found".into()))?;

    let skills: Vec<String> = serde_json::from_str(&agent.skills).unwrap_or_default();

    Ok(Json(AgentReputation {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        verified: agent.verified,
        reputation: agent.reputation,
        tasks_completed: agent.tasks_completed,
        tasks_failed: agent.tasks_failed,
        skills,
    }))
}

/// GET /leaderboard
pub async fn leaderboard(
    State(pool): State<Pool>,
) -> Result<Json<Vec<LeaderboardEntry>>, AppError> {
    let agents: Vec<Agent> = sqlx::query_as(
        "SELECT * FROM agents WHERE tasks_completed > 0 ORDER BY reputation DESC LIMIT 50",
    )
    .fetch_all(&pool)
    .await?;

    let entries: Vec<LeaderboardEntry> = agents
        .into_iter()
        .enumerate()
        .map(|(i, a)| LeaderboardEntry {
            rank: i + 1,
            agent_id: a.id,
            name: a.name,
            reputation: a.reputation,
            tasks_completed: a.tasks_completed,
        })
        .collect();

    Ok(Json(entries))
}
