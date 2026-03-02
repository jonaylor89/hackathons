mod agent_card;
mod auth;
mod authentication;
mod db;
mod domain;
mod errors;
mod handlers;
mod models;
mod pages;
mod scoring;
mod session_state;

use axum::{middleware, response::Html, routing::get, routing::post, Router};
use secrecy::Secret;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tower_sessions::cookie::Key;
use tower_sessions::service::PrivateCookie;
use tower_sessions::{Expiry, SessionManagerLayer};
use tower_sessions_redis_store::{
    fred::{
        interfaces::ClientLike,
        prelude::{Config, Pool},
    },
    RedisStore,
};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "clawwork=debug,tower_http=debug".into()),
        )
        .init();

    let database_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://localhost/clawwork".into());

    let pool = db::init_pool(&database_url).await;

    let session_layer = build_session_layer().await;

    let protected_routes = Router::new()
        .route(
            "/password",
            get(handlers::auth::change_password_form).post(handlers::auth::change_password_handler),
        )
        .route("/logout", post(handlers::auth::logout))
        .route_layer(middleware::from_extractor::<
            authentication::AuthenticatedUser,
        >());

    maybe_seed_admin_user(&pool).await;

    let app = Router::new()
        // Landing page
        .route("/", get(landing))
        .route(
            "/login",
            get(handlers::auth::login_form).post(handlers::auth::login),
        )
        // Task endpoints
        .route("/tasks", post(handlers::tasks::create_task))
        .route("/tasks", get(handlers::tasks::list_tasks))
        .route("/tasks/{id}/status", get(handlers::tasks::get_task_status))
        .route("/tasks/{id}/bid", post(handlers::bids::submit_bid))
        .route("/tasks/{id}/assign", post(handlers::bids::assign_task))
        .route(
            "/tasks/{id}/submit",
            post(handlers::deliverables::submit_deliverable),
        )
        // Agent endpoints
        .route("/agents/register", post(handlers::agents::register_agent))
        .route("/agents/{id}/card", get(handlers::agents::get_agent_card))
        .route(
            "/agents/{id}/refresh",
            post(handlers::agents::refresh_agent_card),
        )
        .route(
            "/agents/{id}/reputation",
            get(handlers::agents::get_reputation),
        )
        // Leaderboard & stats
        .route("/leaderboard", get(handlers::agents::leaderboard))
        .route("/stats", get(handlers::stats::site_stats))
        .route("/dashboard", get(dashboard))
        // Static pages
        .route("/terms", get(pages::terms))
        .route("/privacy", get(pages::privacy))
        .route("/security", get(pages::security))
        .route("/docs", get(pages::docs))
        .route("/docs/agent-card", get(pages::agent_card_spec))
        .route("/safety", get(pages::safety))
        // Health
        .route("/health", get(health))
        .merge(protected_routes)
        .layer(session_layer)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(pool);

    let bind = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:3000".into());
    tracing::info!("🦀 Clawwork listening on {}", bind);

    let listener = tokio::net::TcpListener::bind(&bind).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> &'static str {
    "ok"
}

async fn landing() -> Html<&'static str> {
    Html(include_str!("templates/landing.html"))
}

async fn dashboard() -> Html<&'static str> {
    Html(include_str!("templates/dashboard.html"))
}

async fn maybe_seed_admin_user(pool: &db::Pool) {
    let (count,): (i64,) = match sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await
    {
        Ok(result) => result,
        Err(err) => {
            tracing::error!("Failed to check users table: {}", err);
            return;
        }
    };

    if count > 0 {
        return;
    }

    let username = std::env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
    let password = match std::env::var("ADMIN_PASSWORD") {
        Ok(password) => password,
        Err(_) => {
            tracing::warn!(
                "ADMIN_PASSWORD not set; skipping admin user creation (login disabled)."
            );
            return;
        }
    };

    if let Err(err) = authentication::create_user(&username, Secret::new(password), pool).await {
        tracing::error!("Failed to create admin user: {}", err);
    } else {
        tracing::info!("Admin user '{}' created.", username);
    }
}

async fn build_session_layer() -> SessionManagerLayer<RedisStore<Pool>, PrivateCookie> {
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    let redis_config = Config::from_url(&redis_url).expect("Failed to parse REDIS_URL");
    let pool_size = if cfg!(test) { 1 } else { 6 };
    let redis_pool =
        Pool::new(redis_config, None, None, None, pool_size).expect("Failed to create Redis pool");

    let connect_future = async {
        let _handles = redis_pool.connect();
        redis_pool.wait_for_connect().await
    };

    tokio::time::timeout(std::time::Duration::from_secs(5), connect_future)
        .await
        .expect("Redis connection timeout")
        .expect("Failed to connect to Redis");

    let redis_store = RedisStore::new(redis_pool);

    let key = match std::env::var("SESSION_SECRET") {
        Ok(secret) => Key::derive_from(secret.as_bytes()),
        Err(_) => {
            tracing::warn!("SESSION_SECRET not set; using an ephemeral session key");
            Key::generate()
        }
    };

    SessionManagerLayer::new(redis_store)
        .with_private(key)
        .with_expiry(Expiry::OnInactivity(time::Duration::days(30)))
}
