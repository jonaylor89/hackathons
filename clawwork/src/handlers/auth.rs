use axum::extract::{Form, State};
use axum::response::{Html, Redirect};
use secrecy::{ExposeSecret, Secret};

use crate::authentication::{
    change_password, get_username, validate_credentials, AuthError, AuthenticatedUser, Credentials,
};
use crate::db::Pool;
use crate::domain::Password;
use crate::errors::AppError;
use crate::pages::{change_password_page, login_page};
use crate::session_state::TypedSession;

#[derive(serde::Deserialize)]
pub struct LoginForm {
    username: String,
    password: Secret<String>,
}

#[derive(serde::Deserialize)]
pub struct ChangePasswordForm {
    current_password: Secret<String>,
    new_password: Secret<String>,
    new_password_check: Secret<String>,
}

pub async fn login_form(session: TypedSession) -> Html<String> {
    let flash_messages = session.get_flash_messages().await;
    login_page(flash_messages)
}

pub async fn login(
    State(pool): State<Pool>,
    session: TypedSession,
    Form(form): Form<LoginForm>,
) -> Result<Redirect, AppError> {
    let credentials = Credentials {
        username: form.username,
        password: form.password,
    };

    match validate_credentials(credentials, &pool).await {
        Ok(user_id) => {
            session
                .renew()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
            session
                .insert_user_id(user_id)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            Ok(Redirect::to("/dashboard"))
        }
        Err(e) => {
            let message = match e {
                AuthError::InvalidCredentials(_) => "Authentication failed".to_string(),
                AuthError::UnexpectedError(e) => format!("Something went wrong: {}", e),
            };
            session.flash_error(message).await;
            Ok(Redirect::to("/login"))
        }
    }
}

pub async fn logout(session: TypedSession) -> Result<Redirect, AppError> {
    if session
        .get_user_id()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .is_some()
    {
        session
            .log_out()
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        session.flash_info("You have successfully logged out").await;
    }
    Ok(Redirect::to("/login"))
}

pub async fn change_password_form(session: TypedSession) -> Html<String> {
    let flash_messages = session.get_flash_messages().await;
    change_password_page(flash_messages)
}

pub async fn change_password_handler(
    AuthenticatedUser(user_id): AuthenticatedUser,
    State(pool): State<Pool>,
    session: TypedSession,
    Form(form): Form<ChangePasswordForm>,
) -> Result<Redirect, AppError> {
    if form.new_password.expose_secret() != form.new_password_check.expose_secret() {
        session
            .flash_error("You entered two different new passwords - the field values must match")
            .await;
        return Ok(Redirect::to("/password"));
    }

    let new_password: Result<Password, _> = form.new_password.expose_secret().try_into();

    if new_password.is_err() {
        session
            .flash_error("You entered an invalid new password")
            .await;
        return Ok(Redirect::to("/password"));
    }

    let new_password = new_password.unwrap();
    let username = get_username(*user_id, &pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let credentials = Credentials {
        username,
        password: form.current_password,
    };

    if let Err(e) = validate_credentials(credentials, &pool).await {
        return match e {
            AuthError::InvalidCredentials(_) => {
                session
                    .flash_error("The current password is incorrect")
                    .await;
                Ok(Redirect::to("/password"))
            }
            AuthError::UnexpectedError(e) => Err(AppError::Internal(e.to_string())),
        };
    }

    change_password(*user_id, new_password, &pool)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    session.flash_info("Your password has been changed").await;
    Ok(Redirect::to("/password"))
}
