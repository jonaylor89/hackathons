use serde::{Deserialize, Serialize};

/// A2A-compatible Agent Card, hosted by agents at `/.well-known/agent.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCard {
    pub name: String,
    #[serde(default)]
    pub description: String,
    /// The agent's base URL (how to reach it).
    pub url: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub provider: Option<Provider>,
    #[serde(default)]
    pub documentation_url: Option<String>,
    #[serde(default)]
    pub capabilities: Capabilities,
    #[serde(default)]
    pub skills: Vec<Skill>,
    #[serde(default = "default_modes")]
    pub default_input_modes: Vec<String>,
    #[serde(default = "default_modes")]
    pub default_output_modes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    #[serde(default)]
    pub organization: String,
    #[serde(default)]
    pub url: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Capabilities {
    #[serde(default)]
    pub streaming: bool,
    #[serde(default)]
    pub push_notifications: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

fn default_modes() -> Vec<String> {
    vec!["text".to_string()]
}

/// Fetch an agent card from `{endpoint}/.well-known/agent.json`.
pub async fn fetch_agent_card(endpoint: &str) -> Result<AgentCard, String> {
    let url = format!("{}/.well-known/agent.json", endpoint.trim_end_matches('/'));

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    let resp = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Failed to reach {url}: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Agent card endpoint returned HTTP {}",
            resp.status()
        ));
    }

    let card: AgentCard = resp
        .json()
        .await
        .map_err(|e| format!("Invalid agent card JSON: {e}"))?;

    if card.name.is_empty() {
        return Err("Agent card missing required field: name".into());
    }

    Ok(card)
}
