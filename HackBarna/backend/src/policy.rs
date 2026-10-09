use crate::models::{AutonomyPolicy, DevinAction, Signals};

const ALLOWED_ACTIONS: &[&str] = &[
    "write_drone_path",
    "dispatch_verification_drone",
    "recall_drone",
    "set_coverage_priority",
    "reallocate_fleet_attention",
    "prepare_targeted_warning",
    "request_route_verification",
    "escalate_incident",
];

/// Deterministic policy evaluation. The model never gets to bypass this layer.
pub fn evaluate(
    policy: &AutonomyPolicy,
    signals: &Signals,
    action: &DevinAction,
) -> Result<(), String> {
    if !ALLOWED_ACTIONS.contains(&action.action_type.as_str()) {
        return Err(format!(
            "action type '{}' is outside the typed vocabulary",
            action.action_type
        ));
    }
    if !(0.0..=1.0).contains(&action.confidence) {
        return Err("action confidence must be in 0..=1".into());
    }
    match action.action_type.as_str() {
        "dispatch_verification_drone"
            if signals.incident_confidence
                < policy.auto_dispatch_verification_drone_when_confidence_gte =>
        {
            Err(format!(
                "incident confidence {:.2} is below dispatch threshold {:.2}",
                signals.incident_confidence,
                policy.auto_dispatch_verification_drone_when_confidence_gte
            ))
        }
        "write_drone_path" if signals.path_risk < policy.auto_reroute_drone_when_path_risk_gte => {
            Err(format!(
                "path risk {:.2} is below reroute threshold {:.2}",
                signals.path_risk, policy.auto_reroute_drone_when_path_risk_gte
            ))
        }
        "prepare_targeted_warning" => {
            let arrival = signals
                .conservative_arrival_minutes
                .ok_or("no computed arrival time")?;
            let lead = signals
                .preparation_lead_minutes
                .ok_or("target has no preparation lead time")?;
            let confidence = signals
                .forecast_confidence
                .ok_or("no ensemble forecast confidence")?;
            let p = &policy.auto_prepare_warning_when;
            if arrival > p.conservative_arrival_minutes_lte {
                Err(format!(
                    "arrival {:.0}m exceeds {:.0}m threshold",
                    arrival, p.conservative_arrival_minutes_lte
                ))
            } else if lead < p.preparation_lead_minutes_gte {
                Err(format!(
                    "lead time {:.0}m is below {:.0}m threshold",
                    lead, p.preparation_lead_minutes_gte
                ))
            } else if confidence < p.confidence_gte {
                Err(format!(
                    "forecast confidence {:.2} is below {:.2}",
                    confidence, p.confidence_gte
                ))
            } else {
                Ok(())
            }
        }
        _ => Ok(()),
    }
}
