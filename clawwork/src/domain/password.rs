#[derive(Debug)]
pub struct Password(String);

impl Password {
    pub fn parse(s: String) -> Result<Self, String> {
        let candidate = s.trim();

        if validate_password(candidate) {
            Ok(Self(candidate.into()))
        } else {
            Err(format!("{} is not a valid password", s))
        }
    }
}

impl AsRef<str> for Password {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for Password {
    type Error = String;

    fn try_from(s: String) -> Result<Self, Self::Error> {
        let password = Password::parse(s)?;

        Ok(password)
    }
}

impl TryFrom<&String> for Password {
    type Error = String;

    fn try_from(s: &String) -> Result<Self, Self::Error> {
        let password = Password::parse(s.to_string())?;

        Ok(password)
    }
}

impl std::fmt::Display for Password {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

fn validate_password(candidate_password: &str) -> bool {
    candidate_password.len() >= 12 && candidate_password.len() <= 128
}
