use serde_json::Value;

/// Basic deliverable scoring for the MVP.
/// Checks: non-empty output, presence of expected keys, completeness.
/// Returns a score between 0.0 and 1.0.
pub fn score_deliverable(output: &Value) -> f64 {
    let mut score = 0.0;

    // Non-null output
    if !output.is_null() {
        score += 0.3;
    }

    // Is a structured object (not just a primitive)
    if output.is_object() || output.is_array() {
        score += 0.2;
    }

    // Has content (non-empty object/array or non-empty string)
    let has_content = match output {
        Value::Object(map) => !map.is_empty(),
        Value::Array(arr) => !arr.is_empty(),
        Value::String(s) => !s.is_empty(),
        _ => false,
    };
    if has_content {
        score += 0.3;
    }

    // Has a "result" or "data" key (convention bonus)
    if let Value::Object(map) = output {
        if map.contains_key("result") || map.contains_key("data") {
            score += 0.2;
        }
    }

    score
}

/// Update reputation as a rolling average.
/// new_reputation = old * decay + latest_score * (1 - decay)
pub fn update_reputation(current: f64, latest_score: f64, tasks_completed: i64) -> f64 {
    if tasks_completed <= 1 {
        return latest_score;
    }
    let decay = 0.8_f64;
    current * decay + latest_score * (1.0 - decay)
}
