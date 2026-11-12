use futures_util::StreamExt;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::provider::protocol::prepare;
use crate::provider::types::{ChatRequest, ProviderConfig, ToolCall};
use crate::provider::wire::{
    read_anthropic, read_openai_chat, read_openai_responses, ToolAccumulator, WireEvent,
};

/// Event name the webview listens on. One channel for every request: the
/// payload carries the request id, so two open conversations never mix.
pub const DELTA_EVENT: &str = "ai://delta";

#[derive(Clone, Serialize)]
pub struct Delta {
    #[serde(rename = "requestId")]
    pub RequestId: String,
    #[serde(rename = "delta", skip_serializing_if = "Option::is_none")]
    pub Delta: Option<String>,
    /// A fragment of the chain of thought. DeepSeek streams it beside the
    /// answer; the webview shows it behind a disclosure.
    #[serde(rename = "reasoning", skip_serializing_if = "Option::is_none")]
    pub Reasoning: Option<String>,
    /// Sent once, on the frame that ends the reply, when the model asked for
    /// tools. The caller runs them and sends the results back as new turns.
    #[serde(rename = "toolCalls", skip_serializing_if = "Option::is_none")]
    pub ToolCalls: Option<Vec<ToolCall>>,
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
            Reasoning: None,
            ToolCalls: None,
            Done: false,
            Error: None,
        }
    }

    fn thinking(request_id: &str, text: String) -> Self {
        Self {
            RequestId: request_id.to_string(),
            Delta: None,
            Reasoning: Some(text),
            ToolCalls: None,
            Done: false,
            Error: None,
        }
    }

    fn finish(request_id: &str, tool_calls: Vec<ToolCall>) -> Self {
        Self {
            RequestId: request_id.to_string(),
            Delta: None,
            Reasoning: None,
            ToolCalls: (!tool_calls.is_empty()).then_some(tool_calls),
            Done: true,
            Error: None,
        }
    }

    fn fail(request_id: &str, message: String) -> Self {
        Self {
            RequestId: request_id.to_string(),
            Delta: None,
            Reasoning: None,
            ToolCalls: None,
            Done: true,
            Error: Some(message),
        }
    }
}

fn reader(protocol: crate::provider::protocol::Protocol) -> fn(&str) -> Vec<WireEvent> {
    match protocol {
        crate::provider::protocol::Protocol::OpenaiChat => read_openai_chat,
        crate::provider::protocol::Protocol::OpenaiResponses => read_openai_responses,
        crate::provider::protocol::Protocol::Anthropic => read_anthropic,
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
    let prepared = prepare(&config, &request);
    let mut builder = client
        .post(&prepared.Url)
        .header("Content-Type", "application/json")
        .json(&prepared.Body);

    // OpenAI-compatible endpoints authenticate with a bearer token; Anthropic
    // sends its own header pair, so the default is only applied when no
    // protocol-specific header names a key.
    let has_key_header = prepared.Headers.iter().any(|(name, _)| name == "x-api-key");
    if !has_key_header {
        builder = builder.bearer_auth(&config.ApiKey);
    }
    for (name, value) in prepared.Headers {
        builder = builder.header(name, value);
    }

    let response = builder.send().await;
    let response = match response {
        Ok(response) => response,
        Err(error) => {
            let _ = app.emit(
                DELTA_EVENT,
                Delta::fail(&request_id, format!("请求失败：{}", error)),
            );
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
    let read = reader(config.Protocol);
    let mut tools = ToolAccumulator::default();

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
                for event in read(line) {
                    match event {
                        WireEvent::Text(text) => {
                            let _ = app.emit(DELTA_EVENT, Delta::chunk(&request_id, text));
                        }
                        WireEvent::Reasoning(text) => {
                            let _ = app.emit(DELTA_EVENT, Delta::thinking(&request_id, text));
                        }
                        other => tools.apply(&other),
                    }
                }
            }
        }
    }

    // A last frame without its trailing blank line still carries content.
    for line in buffer.lines() {
        for event in read(line) {
            match event {
                WireEvent::Text(text) => {
                    let _ = app.emit(DELTA_EVENT, Delta::chunk(&request_id, text));
                }
                WireEvent::Reasoning(text) => {
                    let _ = app.emit(DELTA_EVENT, Delta::thinking(&request_id, text));
                }
                other => tools.apply(&other),
            }
        }
    }

    let calls = tools.finish();
    let _ = app.emit(DELTA_EVENT, Delta::finish(&request_id, calls));
}
