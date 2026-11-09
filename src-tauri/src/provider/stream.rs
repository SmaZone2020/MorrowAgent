use futures_util::StreamExt;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::provider::types::{ChatRequest, ProviderConfig};

/// Event name the webview listens on. One channel for every request: the
/// payload carries the request id, so two open conversations never mix.
pub const DELTA_EVENT: &str = "ai://delta";

#[derive(Clone, Serialize)]
pub struct Delta {
    #[serde(rename = "requestId")]
    pub RequestId: String,
    #[serde(rename = "delta", skip_serializing_if = "Option::is_none")]
    pub Delta: Option<String>,
    #[serde(rename = "done")]
    pub Done: bool,
    #[serde(rename = "error", skip_serializing_if = "Option::is_none")]
    pub Error: Option<String>,
}

impl Delta {
    fn chunk(request_id: &str, text: String) -> Self {
        Self {
            RequestId: request_id.to_string(),
            Delta: Some(text),
            Done: false,
            Error: None,
        }
    }

    fn finish(request_id: &str) -> Self {
        Self {
            RequestId: request_id.to_string(),
            Delta: None,
            Done: true,
            Error: None,
        }
    }

    fn fail(request_id: &str, message: String) -> Self {
        Self {
            RequestId: request_id.to_string(),
            Delta: None,
            Done: true,
            Error: Some(message),
        }
    }
}

/// Pull the text out of one `data:` line. Anything without choices (role-only
/// preambles, usage frames) yields nothing.
fn read_chunk(line: &str) -> Option<String> {
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
    if text.is_empty() {
        None
    } else {
        Some(text.to_string())
    }
}

/// Streams one completion, emitting a delta per fragment. Errors are emitted
/// rather than returned: by the time they happen the command has already
/// resolved from the UI's point of view.
pub async fn run(
    app: AppHandle,
    client: reqwest::Client,
    config: ProviderConfig,
    request: ChatRequest,
    request_id: String,
) {
    let url = format!(
        "{}{}",
        config.BaseUrl.trim_end_matches('/'),
        "/chat/completions"
    );

    let mut payload = serde_json::json!({
        "model": config.Model,
        "messages": request.Messages,
        "stream": true,
    });
    if let Some(temperature) = request.Temperature {
        payload["temperature"] = serde_json::json!(temperature);
    }
    if let Some(max_tokens) = request.MaxTokens {
        payload["max_tokens"] = serde_json::json!(max_tokens);
    }

    let response = client
        .post(url)
        .bearer_auth(&config.ApiKey)
        .json(&payload)
        .send()
        .await;

    let response = match response {
        Ok(response) => response,
        Err(error) => {
            let _ = app.emit(DELTA_EVENT, Delta::fail(&request_id, format!("请求失败：{}", error)));
            return;
        }
    };

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        let _ = app.emit(
            DELTA_EVENT,
            Delta::fail(
                &request_id,
                format!("Provider 返回 {}：{}", status.as_u16(), body),
            ),
        );
        return;
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(next) = stream.next().await {
        let bytes = match next {
            Ok(bytes) => bytes,
            Err(error) => {
                let _ = app.emit(
                    DELTA_EVENT,
                    Delta::fail(&request_id, format!("读取流失败：{}", error)),
                );
                return;
            }
        };

        // Providers terminate frames with CRLF; dropping the carriage returns
        // up front makes the split below a plain "\n\n" search even when a
        // chunk boundary lands between the two bytes. Inside a JSON string a
        // real CR is always escaped, so nothing meaningful is lost.
        buffer.push_str(&String::from_utf8_lossy(&bytes).replace('\r', ""));

        while let Some(index) = buffer.find("\n\n") {
            let frame: String = buffer.drain(..index + 2).collect();
            for line in frame.lines() {
                if let Some(text) = read_chunk(line) {
                    let _ = app.emit(DELTA_EVENT, Delta::chunk(&request_id, text));
                }
            }
        }
    }

    // A last frame without its trailing blank line still carries content.
    for line in buffer.lines() {
        if let Some(text) = read_chunk(line) {
            let _ = app.emit(DELTA_EVENT, Delta::chunk(&request_id, text));
        }
    }

    let _ = app.emit(DELTA_EVENT, Delta::finish(&request_id));
}

#[cfg(test)]
mod tests {
    use super::read_chunk;

    #[test]
    fn reads_the_delta_from_a_frame() {
        let line = r#"data: {"choices":[{"delta":{"content":"Hello"}}]}"#;
        assert_eq!(read_chunk(line).as_deref(), Some("Hello"));
    }

    #[test]
    fn ignores_role_only_and_finish_frames() {
        let role = r#"data: {"choices":[{"delta":{"content":"","role":"assistant"}}]}"#;
        assert_eq!(read_chunk(role), None);
        assert_eq!(read_chunk("data: [DONE]"), None);
        assert_eq!(read_chunk(""), None);
    }

    #[test]
    fn ignores_usage_frames_without_choices() {
        let usage = r#"data: {"choices":[],"usage":{"total_tokens":3}}"#;
        assert_eq!(read_chunk(usage), None);
    }
}
