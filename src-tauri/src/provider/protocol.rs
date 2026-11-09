use serde::{Deserialize, Serialize};

use crate::provider::types::{ChatMessage, ChatRequest, ProviderConfig};

/// One HTTP request, fully prepared for a specific protocol. Keeping the wire
/// details here means the stream loop never branches on protocol.
pub struct Prepared {
    pub Url: String,
    pub Headers: Vec<(String, String)>,
    pub Body: serde_json::Value,
    /// Pulls assistant text out of one SSE line, or None for frames that carry
    /// no content (lifecycle events, usage, role preambles).
    pub Reads: fn(&str) -> Option<String>,
}

/// The three wire protocols supported. The choice belongs to the provider
/// profile: one base URL rarely offers more than one shape.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Protocol {
    #[default]
    OpenaiChat,
    OpenaiResponses,
    Anthropic,
}

fn split_system(messages: &[ChatMessage]) -> (Option<String>, Vec<serde_json::Value>) {
    // Anthropic takes the system prompt as a top-level field and rejects a
    // "system" role in messages, so it moves out of the list.
    let mut system = None;
    let mut turns = Vec::new();
    for message in messages {
        if message.Role == "system" {
            system = Some(message.Content.clone());
        } else {
            turns.push(serde_json::json!({
                "role": message.Role,
                "content": message.Content,
            }));
        }
    }
    (system, turns)
}

fn read_openai_chat(line: &str) -> Option<String> {
    let payload = line.strip_prefix("data:")?.trim();
    if payload == "[DONE]" {
        return None;
    }
    let value: serde_json::Value = serde_json::from_str(payload).ok()?;
    let text = value
        .get("choices")?
        .get(0)?
        .get("delta")?
        .get("content")?
        .as_str()?;
    (!text.is_empty()).then(|| text.to_string())
}

fn read_openai_responses(line: &str) -> Option<String> {
    let payload = line.strip_prefix("data:")?.trim();
    let value: serde_json::Value = serde_json::from_str(payload).ok()?;
    // The responses API names each event; only text deltas carry content.
    if value.get("type")?.as_str()? != "response.output_text.delta" {
        return None;
    }
    let text = value.get("delta")?.as_str()?;
    (!text.is_empty()).then(|| text.to_string())
}

fn read_anthropic(line: &str) -> Option<String> {
    let payload = line.strip_prefix("data:")?.trim();
    let value: serde_json::Value = serde_json::from_str(payload).ok()?;
    if value.get("type")?.as_str()? != "content_block_delta" {
        return None;
    }
    let text = value.get("delta")?.get("text")?.as_str()?;
    (!text.is_empty()).then(|| text.to_string())
}

pub fn prepare(config: &ProviderConfig, request: &ChatRequest) -> Prepared {
    let base = config.BaseUrl.trim_end_matches('/');
    let mut body = serde_json::json!({ "model": config.Model, "stream": true });

    if let Some(temperature) = request.Temperature {
        body["temperature"] = serde_json::json!(temperature);
    }

    match config.Protocol {
        Protocol::OpenaiChat => {
            if let Some(max_tokens) = request.MaxTokens {
                body["max_tokens"] = serde_json::json!(max_tokens);
            }
            body["messages"] = serde_json::json!(request.Messages);
            Prepared {
                Url: format!("{}/chat/completions", base),
                Headers: Vec::new(),
                Body: body,
                Reads: read_openai_chat,
            }
        }
        Protocol::OpenaiResponses => {
            if let Some(max_tokens) = request.MaxTokens {
                body["max_output_tokens"] = serde_json::json!(max_tokens);
            }
            body["input"] = serde_json::json!(request.Messages);
            Prepared {
                Url: format!("{}/responses", base),
                Headers: Vec::new(),
                Body: body,
                Reads: read_openai_responses,
            }
        }
        Protocol::Anthropic => {
            let (system, turns) = split_system(&request.Messages);
            if let Some(system) = system {
                body["system"] = serde_json::json!(system);
            }
            // Anthropic requires max_tokens, so fall back to a sane ceiling.
            body["max_tokens"] = serde_json::json!(request.MaxTokens.unwrap_or(2048));
            body["messages"] = serde_json::json!(turns);
            Prepared {
                Url: format!("{}/messages", base),
                Headers: vec![
                    ("x-api-key".to_string(), config.ApiKey.clone()),
                    ("anthropic-version".to_string(), "2023-06-01".to_string()),
                ],
                Body: body,
                Reads: read_anthropic,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{read_anthropic, read_openai_chat, read_openai_responses};

    #[test]
    fn chat_reads_a_delta() {
        let line = r#"data: {"choices":[{"delta":{"content":"Hi"}}]}"#;
        assert_eq!(read_openai_chat(line).as_deref(), Some("Hi"));
        assert_eq!(read_openai_chat("data: [DONE]"), None);
    }

    #[test]
    fn responses_reads_only_text_deltas() {
        let delta = r#"data: {"type":"response.output_text.delta","delta":"Hi"}"#;
        assert_eq!(read_openai_responses(delta).as_deref(), Some("Hi"));
        assert_eq!(read_openai_responses(r#"data: {"type":"response.created"}"#), None);
    }

    #[test]
    fn anthropic_reads_content_block_deltas() {
        let delta =
            r#"data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}"#;
        assert_eq!(read_anthropic(delta).as_deref(), Some("Hi"));
        assert_eq!(read_anthropic(r#"data: {"type":"ping"}"#), None);
    }
}
