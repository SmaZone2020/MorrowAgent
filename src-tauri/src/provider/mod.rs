pub mod protocol;
pub mod secret;
pub mod stream;
pub mod types;
pub mod wire;

use types::{ModelInfo, ProviderConfig, WireModels};

const MODELS_PATH: &str = "/models";

/// Trim trailing slashes once so `/v1` and `/v1/` behave the same.
fn join(base_url: &str, path: &str) -> String {
    format!("{}{}", base_url.trim_end_matches('/'), path)
}

/// The catalog endpoint is the cheapest way to prove a key works, so the
/// settings form calls it before saving anything.
pub async fn list_models(
    client: &reqwest::Client,
    config: &ProviderConfig,
) -> Result<Vec<ModelInfo>, String> {
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
        .filter(|model| !model.Id.is_empty())
        .map(|model| ModelInfo {
            Id: model.Id,
            DisplayName: model.DisplayName.or(model.DisplayNameCamel),
        })
        .collect())
}
