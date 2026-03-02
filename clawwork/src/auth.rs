use axum::{extract::Request, http::header};

use crate::errors::AppError;

/// Extract bearer token from Authorization header.
pub fn extract_api_key(req: &Request) -> Result<String, AppError> {
    let header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".into()))?;

    let token = header.strip_prefix("Bearer ").ok_or_else(|| {
        AppError::Unauthorized("Invalid Authorization format, use: Bearer <key>".into())
    })?;

    Ok(token.to_string())
}

/// Generate a random API key.
pub fn generate_api_key() -> String {
    use rand::Rng;
    let bytes: [u8; 32] = rand::thread_rng().gen();
    format!("clw_{}", hex::encode(bytes))
}
