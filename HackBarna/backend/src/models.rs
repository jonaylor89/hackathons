use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutonomyPolicy {
    pub auto_create_incident_when_confidence_gte: f64,
    pub auto_dispatch_verification_drone_when_confidence_gte: f64,
    pub auto_reroute_drone_when_path_risk_gte: f64,
    pub auto_prepare_warning_when: WarningPolicy,
}

impl Default for AutonomyPolicy {
    fn default() -> Self {
        Self {
            auto_create_incident_when_confidence_gte: 0.55,
            auto_dispatch_verification_drone_when_confidence_gte: 0.70,
            auto_reroute_drone_when_path_risk_gte: 0.60,
            auto_prepare_warning_when: WarningPolicy {
                conservative_arrival_minutes_lte: 120.0,
                preparation_lead_minutes_gte: 30.0,
                confidence_gte: 0.50,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WarningPolicy {
    pub conservative_arrival_minutes_lte: f64,
    pub preparation_lead_minutes_gte: f64,
    pub confidence_gte: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Drone {
    pub id: String,
    pub position: [f64; 2],
    pub home: [f64; 2],
    pub path: Vec<[f64; 2]>,
    pub path_index: usize,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Signals {
    pub incident_confidence: f64,
    pub path_risk: f64,
    pub conservative_arrival_minutes: Option<f64>,
    pub preparation_lead_minutes: Option<f64>,
    pub forecast_confidence: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Incident {
    pub id: String,
    pub cluster_id: String,
    pub created_at: String,
    pub signals: Signals,
    pub devin_session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Actor {
    Jev,
    Devin,
    PolicyEngine,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ActionStatus {
    Proposed,
    Approved,
    Vetoed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimAction {
    pub id: String,
    pub sim_tick: u64,
    pub timestamp: String,
    pub actor: Actor,
    pub action_type: String,
    pub target: String,
    pub reason: String,
    pub confidence: f64,
    pub status: ActionStatus,
    pub params: Value,
    pub simulated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DevinSession {
    pub session_id: String,
    pub incident_id: String,
    pub status: String,
    pub triggered_at: String,
    pub last_actions_hash: String,
    pub no_action_deadline: String,
    pub structured_output: Option<Value>,
    /// Path risk value at the time of the last Jev→Devin redirect, for debouncing.
    pub last_redirect_path_risk: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimState {
    pub tick: u64,
    pub hour: f64,
    pub playing: bool,
    pub speed: f64,
    pub fire_id: Option<String>,
    pub incidents: Vec<Incident>,
    pub drones: Vec<Drone>,
    pub actions: Vec<SimAction>,
    pub policy: AutonomyPolicy,
    pub devin_sessions: Vec<DevinSession>,
    pub authority: &'static str,
}

impl Default for SimState {
    fn default() -> Self {
        Self {
            tick: 0,
            hour: 0.0,
            playing: false,
            speed: 1.0,
            fire_id: None,
            incidents: vec![],
            drones: vec![],
            actions: vec![],
            policy: AutonomyPolicy::default(),
            devin_sessions: vec![],
            authority: "BACKEND",
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ControlRequest {
    pub playing: Option<bool>,
    pub hour: Option<f64>,
    pub speed: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DevinAction {
    #[serde(rename = "type")]
    pub action_type: String,
    pub target: String,
    #[serde(default)]
    pub params: Value,
    pub reason: String,
    pub confidence: f64,
}

#[derive(Debug, Deserialize, Default)]
pub struct DevinStructuredOutput {
    #[serde(default)]
    pub assessment: Value,
    #[serde(default)]
    pub actions: Vec<DevinAction>,
}
