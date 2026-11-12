/// The one provider this app ships with.
///
/// DeepSeek is special in three ways: it is the only endpoint whose models take
/// the thinking switch, it is the one a learner is most likely to already have a
/// key for, and its balance can be read. So it exists before the user adds
/// anything, and its identity is fixed — only the key, the models and the choice
/// of model are theirs to change.
pub const DEEPSEEK_ID: &str = "deepseek";
pub const DEEPSEEK_NAME: &str = "DeepSeek";
pub const DEEPSEEK_BASE_URL: &str = "https://api.deepseek.com";

/// Models that ship in the picker before anything is fetched.
///
/// `deepseek-flash` is the current default; the pro name is the heavier model.
/// Both are what the endpoint currently serves, so the picker is usable before
/// the first "拉取模型".
pub const DEEPSEEK_MODELS: [&str; 2] = ["deepseek-flash", "deepseek-v4-pro"];

/// The builtin provider, with whatever key the user has already saved.
pub fn builtin(key: &str, models: Vec<String>) -> super::secret::StoredProviderProfile {
    super::secret::StoredProviderProfile {
        Id: DEEPSEEK_ID.to_string(),
        Name: DEEPSEEK_NAME.to_string(),
        BaseUrl: DEEPSEEK_BASE_URL.to_string(),
        ApiKey: key.to_string(),
        Protocol: super::protocol::Protocol::OpenaiChat,
        Models: models,
        // DeepSeek's chat models are text-only; the user can turn this on if
        // their key also covers a vision model.
        SupportsVision: false,
        Builtin: true,
    }
}

/// The catalog a freshly installed app starts from.
pub fn default_models() -> Vec<String> {
    DEEPSEEK_MODELS.iter().map(|model| model.to_string()).collect()
}
