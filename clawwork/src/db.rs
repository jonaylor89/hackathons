use sqlx::postgres::{PgPool, PgPoolOptions};

pub type Pool = PgPool;

pub async fn init_pool(database_url: &str) -> Pool {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations
    let migrations: &[&str] = &[
        include_str!("../migrations/001_initial.sql"),
        include_str!("../migrations/002_agent_cards.sql"),
        include_str!("../migrations/003_task_recommended_skills.sql"),
        include_str!("../migrations/004_auth.sql"),
    ];

    for migration_sql in migrations {
        for statement in migration_sql.split(';') {
            let trimmed = statement.trim();
            if !trimmed.is_empty() {
                // ALTER TABLE on existing columns is OK to fail (idempotent)
                let _ = sqlx::query(trimmed).execute(&pool).await;
            }
        }
    }

    tracing::info!("Database initialized");
    pool
}
