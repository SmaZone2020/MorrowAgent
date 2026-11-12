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
    #[serde(rename = "questionScale", default = "default_question_scale")]
    pub QuestionScale: f64,
    /// How Lumi is asked to teach: `guided`, `direct` or `socratic`. It is a
    /// preference rather than a prompt detail because a learner revising for an
    /// exam and one learning a topic want opposite answers.
    #[serde(rename = "teachingStyle", default = "default_teaching_style")]
    pub TeachingStyle: String,
    /// How hard a model that supports thinking should think: `off`, `low`,
    /// `high` or `max`. Kept app-wide because it says something about the
    /// learner's patience rather than about one conversation.
    #[serde(rename = "thinking", default = "default_thinking")]
    pub Thinking: String,
}

fn default_temperature() -> f64 {
    0.6
}

fn default_max_tokens() -> u32 {
    2048
}

fn default_question_scale() -> f64 {
    // Out-of-range values are rejected on read so a hand-edited preferences file
    // cannot shrink the drill text to nothing.
    1.0
}

fn default_teaching_style() -> String {
    "guided".to_string()
}

fn default_thinking() -> String {
    // DeepSeek thinks by default; matching that means an upgrade does not
    // silently make the tutor dumber.
    "high".to_string()
}

/// The thinking levels the request builder understands. Anything else falls
/// back rather than sending an effort the endpoint never defined.
fn clamp_thinking(value: &str) -> String {
    match value {
        "off" | "low" | "high" | "max" => value.to_string(),
        _ => default_thinking(),
    }
}

/// The three styles the prompt registry understands; anything else falls back
/// rather than being sent to the model as an unknown instruction.
fn clamp_style(value: &str) -> String {
    match value {
        "guided" | "direct" | "socratic" => value.to_string(),
        _ => default_teaching_style(),
    }
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            Temperature: default_temperature(),
            MaxTokens: default_max_tokens(),
            QuestionScale: default_question_scale(),
            TeachingStyle: default_teaching_style(),
            Thinking: default_thinking(),
        }
    }
}

fn clamp_scale(value: f64) -> f64 {
    if value.is_finite() && (0.8..=1.8).contains(&value) {
        value
    } else {
        default_question_scale()
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
    let mut loaded: Preferences = serde_json::from_str(&raw).unwrap_or_default();
    loaded.QuestionScale = clamp_scale(loaded.QuestionScale);
    loaded.TeachingStyle = clamp_style(&loaded.TeachingStyle);
    loaded.Thinking = clamp_thinking(&loaded.Thinking);
    Ok(loaded)
}

pub fn save(app: &tauri::AppHandle, preferences: &Preferences) -> Result<(), String> {
    let mut sanitized = preferences.clone();
    sanitized.QuestionScale = clamp_scale(sanitized.QuestionScale);
    sanitized.TeachingStyle = clamp_style(&sanitized.TeachingStyle);
    sanitized.Thinking = clamp_thinking(&sanitized.Thinking);
    let json = serde_json::to_string_pretty(&sanitized).map_err(|error| error.to_string())?;
    std::fs::write(path(app)?, json).map_err(|error| format!("写入偏好失败：{}", error))
}
