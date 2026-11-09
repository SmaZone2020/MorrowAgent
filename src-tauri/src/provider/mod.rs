pub mod secret;
pub mod stream;
pub mod types;

use types::{
    ChatRequest, ChatResponse, ModelInfo, ProviderConfig, WireChat, WireModels,
};

const CHAT_PATH: &str = "/chat/completions";
const MODELS_PATH: &str = "/models";

/// Trim trailing slashes once so `/v1` and `/v1/` behave the same.
fn join(base_url: &str, path: &str) -> String {
    format!("{}{}", base_url.trim_end_matches('/'), path)
}

/// Errors are returned as plain strings: the command surface only needs
/// something a UI can show, and the original status/body is already useful.
async fn send(
    client: &reqwest::Client,
    config: &ProviderConfig,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<String, String> {
    let mut request = client
        .post(join(&config.BaseUrl, path))
        .bearer_auth(&config.ApiKey)
        .header("Content-Type", "application/json");

    if let Some(payload) = body {
        request = request.json(&payload);
    }

    let response = request.send().await.map_err(|error| {
        format!("请求失败：{}", error)
    })?;

    let status = response.status();
    let text = response.text().await.map_err(|error| {
        format!("读取响应失败：{}", error)
    })?;

    if !status.is_success() {
        return Err(format!("Provider 返回 {}：{}", status.as_u16(), text));
    }
    Ok(text)
}

pub async fn list_models(
    client: &reqwest::Client,
    config: &ProviderConfig,
) -> Result<Vec<ModelInfo>, String> {
    // The catalog endpoint accepts GET, but the same bearer header applies.
    let response = client
        .get(join(&config.BaseUrl, MODELS_PATH))
        .bearer_auth(&config.ApiKey)
        .send()
        .await
        .map_err(|error| format!("请求失败：{}", error))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("读取响应失败：{}", error))?;

    if !status.is_success() {
        return Err(format!("Provider 返回 {}：{}", status.as_u16(), text));
    }

    let parsed: WireModels =
        serde_json::from_str(&text).map_err(|error| format!("解析模型列表失败：{}", error))?;

    Ok(parsed
        .Data
        .into_iter()
        .map(|model| ModelInfo {
            Id: model.Id,
            DisplayName: model.DisplayName,
        })
        .collect())
}

pub async fn chat(
    client: &reqwest::Client,
    config: &ProviderConfig,
    request: &ChatRequest,
) -> Result<ChatResponse, String> {
    let mut payload = serde_json::json!({
        "model": config.Model,
        "messages": request.Messages,
    });

    if let Some(temperature) = request.Temperature {
        payload["temperature"] = serde_json::json!(temperature);
    }
    if let Some(max_tokens) = request.MaxTokens {
        payload["max_tokens"] = serde_json::json!(max_tokens);
    }

    let text = send(client, config, CHAT_PATH, Some(payload)).await?;
    let parsed: WireChat =
        serde_json::from_str(&text).map_err(|error| format!("解析回复失败：{}", error))?;

    let choice = parsed
        .Choices
        .into_iter()
        .next()
        .ok_or_else(|| "Provider 没有返回任何选项".to_string())?;

    let content = choice
        .Message
        .map(|message| message.Content)
        .unwrap_or_default();

    Ok(ChatResponse {
        Content: content,
        Model: if parsed.Model.is_empty() {
            config.Model.clone()
        } else {
            parsed.Model
        },
        FinishReason: choice.FinishReason,
        PromptTokens: parsed.Usage.as_ref().and_then(|usage| usage.PromptTokens),
        CompletionTokens: parsed.Usage.as_ref().and_then(|usage| usage.CompletionTokens),
    })
}
