use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

/// Per-page interface state: which node is expanded, how far a list was
/// scrolled, an unsent draft. It lives apart from `preferences.json` because the
/// two are written at completely different rates — a slider is dragged a few
/// times a session, a scroll position changes constantly — and a shared file
/// would let the noisier writer clobber the quieter one.
///
/// Every page owns one scope, so a write only has to replace its own subtree.
pub const CURRENT_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiState {
    #[serde(rename = "version", default = "current_version")]
    pub Version: u32,
    /// Scope name -> that page's opaque payload. The backend deliberately does
    /// not model the payload: adding a field to a page must not need a Rust
    /// change, and an unknown scope has to survive a round trip untouched.
    #[serde(rename = "scopes", default)]
    pub Scopes: BTreeMap<String, Value>,
}

fn current_version() -> u32 {
    CURRENT_VERSION
}

impl Default for UiState {
    fn default() -> Self {
        Self {
            Version: CURRENT_VERSION,
            Scopes: BTreeMap::new(),
        }
    }
}

fn path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位应用数据目录：{}", error))?;
    std::fs::create_dir_all(&dir).map_err(|error| format!("无法创建数据目录：{}", error))?;
    Ok(dir.join("ui-state.json"))
}

pub fn load(app: &tauri::AppHandle) -> Result<UiState, String> {
    let path = path(app)?;
    if !path.exists() {
        return Ok(UiState::default());
    }
    let raw = std::fs::read_to_string(&path).map_err(|error| format!("读取界面状态失败：{}", error))?;
    // A corrupt file costs one page's scroll position, not the app: fall back to
    // an empty state instead of failing startup.
    Ok(serde_json::from_str(&raw).unwrap_or_default())
}

/// Replaces the whole file. Callers send the merged state, so this stays a
/// single write with no read-modify-write race between pages.
pub fn save(app: &tauri::AppHandle, state: &UiState) -> Result<(), String> {
    let mut sanitized = state.clone();
    sanitized.Version = CURRENT_VERSION;
    let json = serde_json::to_string_pretty(&sanitized).map_err(|error| error.to_string())?;
    std::fs::write(path(app)?, json).map_err(|error| format!("写入界面状态失败：{}", error))
}

#[cfg(test)]
mod tests {
    use super::{UiState, CURRENT_VERSION};
    use serde_json::json;

    #[test]
    fn unknown_scopes_survive_a_round_trip() {
        let mut state = UiState::default();
        state.Scopes.insert("drill".into(), json!({ "index": 3 }));
        state.Scopes.insert("future-page".into(), json!({ "nested": [1, 2] }));

        let raw = serde_json::to_string(&state).expect("serialise");
        let back: UiState = serde_json::from_str(&raw).expect("deserialise");

        assert_eq!(back.Scopes.len(), 2);
        assert_eq!(back.Scopes["drill"]["index"], 3);
        assert_eq!(back.Version, CURRENT_VERSION);
    }

    #[test]
    fn a_missing_version_is_treated_as_current() {
        let back: UiState = serde_json::from_str(r#"{"scopes":{}}"#).expect("deserialise");
        assert_eq!(back.Version, CURRENT_VERSION);
    }

    #[test]
    fn the_file_uses_camel_case_keys() {
        let mut state = UiState::default();
        state.Scopes.insert("drill".into(), json!({ "index": 3 }));
        let raw = serde_json::to_string(&state).expect("serialise");
        assert!(raw.contains("\"version\""));
        assert!(raw.contains("\"scopes\""));
    }

    #[test]
    fn a_corrupt_file_falls_back_to_empty_state() {
        let back: UiState = serde_json::from_str("{ not json").unwrap_or_default();
        assert!(back.Scopes.is_empty());
    }
}
