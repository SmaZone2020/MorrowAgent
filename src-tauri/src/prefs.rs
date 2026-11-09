use serde::{Deserialize, Serialize};

/// Non-secret app preferences. They sit in a plain JSON file on purpose: the
/// credential blob is the only thing that needs DPAPI, and mixing the two would
/// force a decrypt for every read of a slider value.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Preferences {
    #[serde(rename = "temperature", default = "default_temperature")]
    pub Temperature: f64,
    #[serde(rename = "maxTokens", default = "default_max_tokens")]
    pub MaxTokens: u32,
}

fn default_temperature() -> f64 {
    0.6
}

fn default_max_tokens() -> u32 {
    2048
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            Temperature: default_temperature(),
            MaxTokens: default_max_tokens(),
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
    Ok(dir.join("preferences.json"))
}

pub fn load(app: &tauri::AppHandle) -> Result<Preferences, String> {
    let path = path(app)?;
    if !path.exists() {
        return Ok(Preferences::default());
    }
    let raw = std::fs::read_to_string(&path).map_err(|error| format!("读取偏好失败：{}", error))?;
    // A corrupt file falls back to defaults rather than blocking startup.
    Ok(serde_json::from_str(&raw).unwrap_or_default())
}

pub fn save(app: &tauri::AppHandle, preferences: &Preferences) -> Result<(), String> {
    let json = serde_json::to_string_pretty(preferences).map_err(|error| error.to_string())?;
    std::fs::write(path(app)?, json).map_err(|error| format!("写入偏好失败：{}", error))
}
