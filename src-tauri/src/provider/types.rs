use serde::{Deserialize, Serialize};

use super::protocol::Protocol;

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
    #[serde(rename = "protocol", default)]
    pub Protocol: Protocol,
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
pub struct ModelInfo {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "displayName", skip_serializing_if = "Option::is_none")]
    pub DisplayName: Option<String>,
}

// Wire shape for the model catalog. Anthropic returns the same envelope with a
// different id field name, so both are accepted.
#[derive(Deserialize)]
pub struct WireModels {
    #[serde(rename = "data", default)]
    pub Data: Vec<WireModel>,
}

#[derive(Deserialize)]
pub struct WireModel {
    #[serde(rename = "id", default)]
    pub Id: String,
    #[serde(rename = "display_name", default)]
    pub DisplayName: Option<String>,
    #[serde(rename = "displayName", default)]
    pub DisplayNameCamel: Option<String>,
}
