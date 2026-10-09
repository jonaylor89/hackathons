use reqwest::{Client, multipart};
use serde_json::{Value, json};
use std::env;

#[derive(Clone)]
pub struct DevinClient {
    http: Client,
    api_key: String,
    api_base: String,
    org_id: Option<String>,
    playbook_id: Option<String>,
    max_acu_limit: f64,
}

impl DevinClient {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            http: Client::new(),
            api_key: env::var("DEVIN_API_KEY").map_err(|_| "DEVIN_API_KEY is not set")?,
            api_base: env::var("DEVIN_API_BASE").unwrap_or_else(|_| "https://api.devin.ai".into()),
            org_id: env::var("DEVIN_ORG_ID").ok(),
            playbook_id: env::var("DEVIN_PLAYBOOK_ID").ok(),
            max_acu_limit: env::var("DEVIN_MAX_ACU")
                .ok()
                .and_then(|x| x.parse().ok())
                .unwrap_or(2.0),
        })
    }

    async fn json(&self, req: reqwest::RequestBuilder) -> Result<Value, String> {
        let res = req
            .bearer_auth(&self.api_key)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let status = res.status();
        let body = res.text().await.map_err(|e| e.to_string())?;
        if !status.is_success() {
            return Err(format!(
                "Devin API {status}: {}",
                body.chars().take(800).collect::<String>()
            ));
        }
        serde_json::from_str(&body).map_err(|e| format!("invalid Devin JSON: {e}"))
    }

    pub async fn organizations(&self) -> Result<Value, String> {
        self.json(
            self.http
                .get(format!("{}/v3/enterprise/organizations", self.api_base)),
        )
        .await
    }

    /// Upload the frozen fixture slice before creating the reasoning session.
    pub async fn upload_attachment(
        &self,
        name: &str,
        bytes: Vec<u8>,
    ) -> Result<(String, String), String> {
        let part = multipart::Part::bytes(bytes)
            .file_name(name.to_owned())
            .mime_str("application/json")
            .map_err(|e| e.to_string())?;
        let org_id = self.org_id.as_deref().ok_or("DEVIN_ORG_ID is not set")?;
        let value = self
            .json(
                self.http
                    .post(format!(
                        "{}/v3/organizations/{org_id}/attachments",
                        self.api_base
                    ))
                    .multipart(multipart::Form::new().part("file", part)),
            )
            .await?;
        let id = value
            .get("id")
            .or_else(|| value.get("attachment_id"))
            .and_then(Value::as_str)
            .map(str::to_owned)
            .ok_or_else(|| "Devin attachment response had no id".to_string())?;
        let url = value
            .get("url")
            .and_then(Value::as_str)
            .map(str::to_owned)
            .ok_or_else(|| "Devin attachment response had no url".to_string())?;
        Ok((id, url))
    }

    pub async fn create_session(
        &self,
        prompt: &str,
        attachment_url: &str,
    ) -> Result<Value, String> {
        let org_id = self
            .org_id
            .as_deref()
            .ok_or("DEVIN_ORG_ID is not set; copy the organization ID from Settings → Devin API (or use GET /v3/self for an organization-scoped key)")?;
        let playbook_id = self
            .playbook_id
            .as_deref()
            .ok_or("DEVIN_PLAYBOOK_ID is not set")?;
        let schema = json!({
            "type": "object",
            "required": ["assessment", "actions"],
            "properties": {
                "assessment": {
                    "type": "object",
                    "required": ["targetId", "reasoning"],
                    "properties": { "targetId": {"type":"string"}, "reasoning": {"type":"string"} }
                },
                "actions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["type", "target", "params", "reason", "confidence"],
                        "properties": {
                            "type": {"enum": ["write_drone_path", "dispatch_verification_drone", "recall_drone", "set_coverage_priority", "reallocate_fleet_attention", "prepare_targeted_warning", "request_route_verification", "escalate_incident"]},
                            "target": {"type":"string"}, "params": {"type":"object"},
                            "reason": {"type":"string"}, "confidence": {"type":"number", "minimum":0, "maximum":1}
                        }
                    }
                }
            }
        });
        let body = json!({
            "prompt": prompt,
            "title": "FastAndSlow wildfire forecast",
            "playbook_id": playbook_id,
            "max_acu_limit": self.max_acu_limit as u64,
            "attachment_urls": [attachment_url],
            "structured_output_schema": schema,
            "structured_output_required": true,
            "resumable": false,
            "tags": ["fastandslow", "autonomy-sandbox", "historical-replay"]
        });
        self.json(
            self.http
                .post(format!(
                    "{}/v3/organizations/{}/sessions",
                    self.api_base, org_id
                ))
                .json(&body),
        )
        .await
    }

    pub async fn session(&self, session_id: &str) -> Result<Value, String> {
        let org_id = self.org_id.as_deref().ok_or("DEVIN_ORG_ID is not set")?;
        self.json(self.http.get(format!(
            "{}/v3/organizations/{org_id}/sessions/{session_id}",
            self.api_base
        )))
        .await
    }

    pub async fn redirect(&self, session_id: &str, message: &str) -> Result<Value, String> {
        let org_id = self.org_id.as_deref().ok_or("DEVIN_ORG_ID is not set")?;
        self.json(
            self.http
                .post(format!(
                    "{}/v3/organizations/{org_id}/sessions/{session_id}/messages",
                    self.api_base
                ))
                .json(&json!({"message": message})),
        )
        .await
    }
}
