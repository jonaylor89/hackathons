use anyhow::Context;
use argon2::{
    password_hash::SaltString, Algorithm, Argon2, Params, PasswordHash, PasswordHasher,
    PasswordVerifier, Version,
};
use secrecy::{ExposeSecret, Secret};
use uuid::Uuid;

use crate::db::Pool;
use crate::domain::Password;

#[derive(thiserror::Error, Debug)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials(#[source] anyhow::Error),

    #[error(transparent)]
    UnexpectedError(#[from] anyhow::Error),
}

pub struct Credentials {
    pub username: String,
    pub password: Secret<String>,
}

#[tracing::instrument(name = "Validate credentials", skip(credentials, pool))]
pub async fn validate_credentials(
    credentials: Credentials,
    pool: &Pool,
) -> Result<Uuid, AuthError> {
    let mut user_id = None;
    let mut expected_password_hash = Secret::new(
        "$argon2id$v=19$m=15000,t=2,p=1$\
        gZiV/M1gPc22ElAH/Jh1Hw$\
        CWOrkoo7oJBQ/iyh7uJ0LO2aLEfrHwTWllSAxT0zRno"
            .to_string(),
    );

    if let Some((stored_user_id, stored_password_hash)) =
        get_stored_credentials(&credentials.username, pool)
            .await
            .map_err(AuthError::UnexpectedError)?
    {
        user_id = Some(stored_user_id);
        expected_password_hash = stored_password_hash;
    }

    tokio::task::spawn_blocking(move || {
        verify_password_hash(expected_password_hash, credentials.password)
    })
    .await
    .context("Failed to spawn blocking task")
    .map_err(AuthError::UnexpectedError)?
    .context("Invalid password")
    .map_err(AuthError::InvalidCredentials)?;

    user_id.ok_or_else(|| AuthError::InvalidCredentials(anyhow::anyhow!("Unknown username")))
}

#[tracing::instrument(name = "Get stored credentials", skip(username, pool))]
pub async fn get_stored_credentials(
    username: &str,
    pool: &Pool,
) -> Result<Option<(Uuid, Secret<String>)>, anyhow::Error> {
    let row = sqlx::query_as::<_, (Uuid, String)>(
        r#"
        SELECT user_id, password_hash
        FROM users
        WHERE username = $1
        "#,
    )
    .bind(username)
    .fetch_optional(pool)
    .await
    .context("Failed to perform a query to retrieve stored credentials.")?
    .map(|(user_id, password_hash)| (user_id, Secret::new(password_hash)));
    Ok(row)
}

#[tracing::instrument(
    name = "Verify password hash",
    skip(expected_password_hash, password_candidate)
)]
pub fn verify_password_hash(
    expected_password_hash: Secret<String>,
    password_candidate: Secret<String>,
) -> Result<(), AuthError> {
    let expected_password_hash = PasswordHash::new(expected_password_hash.expose_secret())
        .map_err(|e| AuthError::UnexpectedError(anyhow::anyhow!(e)))?;

    Argon2::default()
        .verify_password(
            password_candidate.expose_secret().as_bytes(),
            &expected_password_hash,
        )
        .map_err(|e| AuthError::InvalidCredentials(anyhow::anyhow!(e)))
}

#[tracing::instrument(name = "Change password", skip(password, pool))]
pub async fn change_password(
    user_id: Uuid,
    password: Password,
    pool: &Pool,
) -> Result<(), anyhow::Error> {
    let password_hash = tokio::task::spawn_blocking(move || compute_password_hash(password))
        .await?
        .context("Failed to hash password")?;

    sqlx::query(
        r#"
        UPDATE users
        SET password_hash = $1
        WHERE user_id = $2
        "#,
    )
    .bind(password_hash.expose_secret())
    .bind(user_id)
    .execute(pool)
    .await
    .context("Failed to change user's password in the database")?;

    Ok(())
}

pub async fn create_user(
    username: &str,
    password: Secret<String>,
    pool: &Pool,
) -> Result<Uuid, anyhow::Error> {
    let user_id = Uuid::new_v4();
    let password_hash = tokio::task::spawn_blocking(move || {
        let password =
            Password::parse(password.expose_secret().clone()).map_err(anyhow::Error::msg)?;
        compute_password_hash(password)
    })
    .await?
    .context("Failed to hash password")?;

    sqlx::query(
        r#"
        INSERT INTO users (user_id, username, password_hash, created_at)
        VALUES ($1, $2, $3, NOW()::TEXT)
        "#,
    )
    .bind(user_id)
    .bind(username)
    .bind(password_hash.expose_secret())
    .execute(pool)
    .await
    .context("Failed to insert user")?;

    Ok(user_id)
}

pub async fn get_username(user_id: Uuid, pool: &Pool) -> Result<String, anyhow::Error> {
    let row = sqlx::query_as::<_, (String,)>(
        r#"
        SELECT username
        FROM users
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .context("Failed to fetch username")?;

    Ok(row.0)
}

fn compute_password_hash(password: Password) -> Result<Secret<String>, anyhow::Error> {
    let salt = SaltString::generate(&mut rand::thread_rng());
    let password_hash = Argon2::new(
        Algorithm::Argon2id,
        Version::V0x13,
        Params::new(15_000, 2, 1, None).unwrap(),
    )
    .hash_password(password.as_ref().as_bytes(), &salt)
    .map_err(|e| anyhow::anyhow!(e))?
    .to_string();

    Ok(Secret::new(password_hash))
}
