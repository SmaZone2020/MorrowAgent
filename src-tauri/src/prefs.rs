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
    /// Which Lumi the learner wants to talk to: `warm`, `sharp`, `rigorous` or
    /// `playful`. It is a manner of speech, not a teaching method, so it stays
    /// with the person rather than with a package.
    #[serde(rename = "persona", default = "default_persona")]
    pub Persona: String,
    /// How Lumi is allowed to teach: `guided`, `direct` or `socratic`. App-wide
    /// rather than per package because it describes the learner's own habit of
    /// working — someone revising always wants the answer — and a tutor whose
    /// manner changed with every book would feel like a different tutor.
    #[serde(rename = "teachingStyle", default = "default_teaching_style")]
    pub TeachingStyle: String,
    /// What Lumi should call the learner. Empty means no preference was given,
    /// and the prompt then addresses them in the second person.
    #[serde(rename = "nickname", default)]
    pub Nickname: String,
    /// `YYYY-MM-DD`, optional. Only ever used to know roughly how old the
    /// learner is, never shown back on a schedule or a countdown.
    #[serde(rename = "birthday", default)]
    pub Birthday: String,
    /// How hard a model that supports thinking should think: `off`, `low`,
    /// `high` or `max`. Kept app-wide because it says something about the
    /// learner's patience rather than about one conversation.
    #[serde(rename = "thinking", default = "default_thinking")]
    pub Thinking: String,
    /// Whether the rail's Lumi entry gets a dot when a reply finishes while the
    /// learner is on another page. Quiet, so it is on by default.
    #[serde(rename = "lumiDot", default = "default_true")]
    pub LumiDot: bool,
    /// Whether that same reply also raises a toast. Louder, and on by default
    /// because an answer nobody notices is an answer that was not given.
    #[serde(rename = "lumiToast", default = "default_true")]
    pub LumiToast: bool,
}

fn default_true() -> bool {
    true
}

fn default_temperature() -> f64 {
    0.6
}

fn default_max_tokens() -> u32 {
    // Long enough that a worked derivation or a marked-up proof arrives whole;
    // short enough that a runaway reply still stops before it fills the window.
    8192
}

fn default_question_scale() -> f64 {
    // Out-of-range values are rejected on read so a hand-edited preferences file
    // cannot shrink the drill text to nothing.
    1.0
}

fn default_persona() -> String {
    "warm".to_string()
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

/// The four manners the prompt registry understands; anything else falls back
/// rather than being sent to the model as an unknown instruction.
fn clamp_persona(value: &str) -> String {
    match value {
        "warm" | "sharp" | "rigorous" | "playful" => value.to_string(),
        _ => default_persona(),
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

/// A nickname is a label, not prose: trim it and cap it so a paste of a whole
/// paragraph cannot end up in every system prompt.
fn clamp_nickname(value: &str) -> String {
    value.trim().chars().take(24).collect()
}

/// A birthday is either a real `YYYY-MM-DD` date or nothing at all. A blank
/// half-typed date would otherwise be read as an age of several thousand years.
fn clamp_birthday(value: &str) -> String {
    let trimmed = value.trim();
    let shaped = trimmed.len() == 10
        && trimmed.as_bytes()[4] == b'-'
        && trimmed.as_bytes()[7] == b'-'
        && trimmed
            .chars()
            .enumerate()
            .all(|(index, ch)| index == 4 || index == 7 || ch.is_ascii_digit());
    if !shaped {
        return String::new();
    }
    let year: i32 = trimmed[..4].parse().unwrap_or(0);
    if (1900..=2100).contains(&year) {
        trimmed.to_string()
    } else {
        String::new()
    }
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            Temperature: default_temperature(),
            MaxTokens: default_max_tokens(),
            QuestionScale: default_question_scale(),
            Persona: default_persona(),
            TeachingStyle: default_teaching_style(),
            Nickname: String::new(),
            Birthday: String::new(),
            Thinking: default_thinking(),
            LumiDot: default_true(),
            LumiToast: default_true(),
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
    loaded.Persona = clamp_persona(&loaded.Persona);
    loaded.TeachingStyle = clamp_style(&loaded.TeachingStyle);
    loaded.Nickname = clamp_nickname(&loaded.Nickname);
    loaded.Birthday = clamp_birthday(&loaded.Birthday);
    loaded.Thinking = clamp_thinking(&loaded.Thinking);
    Ok(loaded)
}

pub fn save(app: &tauri::AppHandle, preferences: &Preferences) -> Result<(), String> {
    let mut sanitized = preferences.clone();
    sanitized.QuestionScale = clamp_scale(sanitized.QuestionScale);
    sanitized.Persona = clamp_persona(&sanitized.Persona);
    sanitized.TeachingStyle = clamp_style(&sanitized.TeachingStyle);
    sanitized.Nickname = clamp_nickname(&sanitized.Nickname);
    sanitized.Birthday = clamp_birthday(&sanitized.Birthday);
    sanitized.Thinking = clamp_thinking(&sanitized.Thinking);
    let json = serde_json::to_string_pretty(&sanitized).map_err(|error| error.to_string())?;
    std::fs::write(path(app)?, json).map_err(|error| format!("写入偏好失败：{}", error))
}
