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

/// One piece of a user turn. Text and images can share a turn, which is what
/// lets a photographed page and the question about it travel together.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentPart {
    #[serde(rename = "text")]
    Text {
        #[serde(rename = "text")]
        Text: String,
    },
    #[serde(rename = "image")]
    Image {
        #[serde(rename = "mimeType")]
        MimeType: String,
        /// Base64 without the `data:` prefix; each protocol adds its own wrapper.
        #[serde(rename = "data")]
        Data: String,
    },
}

/// A message body is either plain text or an ordered list of parts. Old
/// transcripts and system prompts stay strings, so the simple shape is the
/// default and the array is opt-in.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(untagged)]
pub enum MessageContent {
    Text(String),
    Parts(Vec<ContentPart>),
}

impl Default for MessageContent {
    fn default() -> Self {
        MessageContent::Text(String::new())
    }
}

impl MessageContent {
    /// Plain text with images dropped, for protocols that cannot take them and
    /// for the transcript written back to SQLite.
    pub fn flatten(&self) -> String {
        match self {
            MessageContent::Text(text) => text.clone(),
            MessageContent::Parts(parts) => parts
                .iter()
                .filter_map(|part| match part {
                    ContentPart::Text { Text } => Some(Text.as_str()),
                    ContentPart::Image { .. } => None,
                })
                .collect::<Vec<_>>()
                .join("\n"),
        }
    }

    pub fn has_image(&self) -> bool {
        matches!(self, MessageContent::Parts(parts)
            if parts.iter().any(|part| matches!(part, ContentPart::Image { .. })))
    }
}

/// One tool call the model asked for. `Arguments` stays a raw JSON string
/// because that is what every wire protocol streams and what the frontend
/// parses; re-serialising it in Rust would only add a failure mode.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ToolCall {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "arguments", default)]
    pub Arguments: String,
}

/// A tool the model may call. `Parameters` is a JSON Schema object.
#[derive(Debug, Clone, Deserialize)]
pub struct ToolDef {
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "description", default)]
    pub Description: String,
    #[serde(rename = "parameters", default)]
    pub Parameters: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ChatMessage {
    #[serde(rename = "role")]
    pub Role: String,
    #[serde(rename = "content", default)]
    pub Content: MessageContent,
    /// Set on an assistant turn that asked for tools.
    #[serde(rename = "toolCalls", default)]
    pub ToolCalls: Vec<ToolCall>,
    /// Set on the `role: "tool"` turn that answers one call.
    #[serde(rename = "toolCallId", default)]
    pub ToolCallId: Option<String>,
    /// The chain of thought DeepSeek returned with this assistant turn.
    ///
    /// It has to travel back on every later request that carries tools: the
    /// endpoint rejects a history where a tool-using turn lost its reasoning.
    #[serde(rename = "reasoningContent", default, skip_serializing_if = "Option::is_none")]
    pub ReasoningContent: Option<String>,
}

/// DeepSeek's thinking switch. `Kind` is `enabled` or `disabled`; `Effort` is
/// `low`, `high` or `max` and is ignored when thinking is off.
#[derive(Debug, Clone, Deserialize)]
pub struct ThinkingConfig {
    #[serde(rename = "type", default)]
    pub Kind: String,
    #[serde(rename = "effort", default)]
    pub Effort: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatRequest {
    #[serde(rename = "messages")]
    pub Messages: Vec<ChatMessage>,
    #[serde(rename = "temperature", default)]
    pub Temperature: Option<f64>,
    #[serde(rename = "maxTokens", default)]
    pub MaxTokens: Option<u32>,
    #[serde(rename = "tools", default)]
    pub Tools: Vec<ToolDef>,
    /// Only sent to endpoints that understand it; other protocols drop it.
    #[serde(rename = "thinking", default)]
    pub Thinking: Option<ThinkingConfig>,
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
