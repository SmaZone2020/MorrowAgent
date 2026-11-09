use serde::{Deserialize, Serialize};

// Rust struct fields are PascalCase per AGENT.md; the wire format stays
// camelCase for the webview, so every field maps explicitly.

#[derive(Debug, Clone, Deserialize)]
pub struct ProviderConfig {
    #[serde(rename = "baseUrl")]
    pub BaseUrl: String,
    #[serde(rename = "apiKey")]
    pub ApiKey: String,
    #[serde(rename = "model")]
    pub Model: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ChatMessage {
    #[serde(rename = "role")]
    pub Role: String,
    #[serde(rename = "content")]
    pub Content: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatRequest {
    #[serde(rename = "messages")]
    pub Messages: Vec<ChatMessage>,
    #[serde(rename = "temperature", default)]
    pub Temperature: Option<f64>,
    #[serde(rename = "maxTokens", default)]
    pub MaxTokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatResponse {
    #[serde(rename = "content")]
    pub Content: String,
    #[serde(rename = "model")]
    pub Model: String,
    #[serde(rename = "finishReason", skip_serializing_if = "Option::is_none")]
    pub FinishReason: Option<String>,
    #[serde(rename = "promptTokens", skip_serializing_if = "Option::is_none")]
    pub PromptTokens: Option<u32>,
    #[serde(rename = "completionTokens", skip_serializing_if = "Option::is_none")]
    pub CompletionTokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelInfo {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "displayName", skip_serializing_if = "Option::is_none")]
    pub DisplayName: Option<String>,
}

// Wire shapes for OpenAI-compatible endpoints. Kept private to the adapter so a
// protocol change never leaks into the command surface.

#[derive(Deserialize)]
pub struct WireModels {
    #[serde(rename = "data", default)]
    pub Data: Vec<WireModel>,
}

#[derive(Deserialize)]
pub struct WireModel {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "display_name", default)]
    pub DisplayName: Option<String>,
}

#[derive(Deserialize)]
pub struct WireChat {
    #[serde(rename = "model", default)]
    pub Model: String,
    #[serde(rename = "choices", default)]
    pub Choices: Vec<WireChoice>,
    #[serde(rename = "usage", default)]
    pub Usage: Option<WireUsage>,
}

#[derive(Deserialize)]
pub struct WireChoice {
    #[serde(rename = "message", default)]
    pub Message: Option<ChatMessage>,
    #[serde(rename = "finish_reason", default)]
    pub FinishReason: Option<String>,
}

#[derive(Deserialize)]
pub struct WireUsage {
    #[serde(rename = "prompt_tokens", default)]
    pub PromptTokens: Option<u32>,
    #[serde(rename = "completion_tokens", default)]
    pub CompletionTokens: Option<u32>,
}
