use serde::{Deserialize, Serialize};

/**
 * DeepSeek's own search and fetch endpoints, proxied by the backend.
 *
 * The key never reaches the webview: it is stored in the same DPAPI blob as the
 * chat providers and used here, so a reply that cites the web cannot be talked
 * into sending the credential anywhere by a page it fetched.
 */
pub const BASE_URL: &str = "https://api.deepseek.com";

#[derive(Debug, Clone, Deserialize)]
pub struct SearchRequest {
    #[serde(rename = "query")]
    pub Query: String,
    /// How many results to ask for; the endpoint takes 1–50 and defaults to 10.
    #[serde(rename = "count", default)]
    pub Count: Option<u32>,
    /// Fills `content` on each hit, which costs more but saves a fetch round.
    #[serde(rename = "needContent", default)]
    pub NeedContent: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FetchRequest {
    #[serde(rename = "url")]
    pub Url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    #[serde(rename = "title", default)]
    pub Title: String,
    #[serde(rename = "url", default)]
    pub Url: String,
    #[serde(rename = "snippet", default)]
    pub Snippet: String,
    #[serde(rename = "summary", default)]
    pub Summary: Option<String>,
    #[serde(rename = "content", default)]
    pub Content: Option<String>,
    #[serde(rename = "siteName", default)]
    pub SiteName: Option<String>,
    #[serde(rename = "date", default)]
    pub Date: Option<String>,
    #[serde(rename = "authority", default)]
    pub Authority: Option<f64>,
    #[serde(rename = "rerankScore", default)]
    pub RerankScore: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    #[serde(rename = "results", default)]
    pub Results: Vec<SearchHit>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchResponse {
    #[serde(rename = "url", default)]
    pub Url: String,
    #[serde(rename = "title", default)]
    pub Title: String,
    #[serde(rename = "content", default)]
    pub Content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceInfo {
    #[serde(rename = "currency", default)]
    pub Currency: String,
    #[serde(rename = "totalBalance", default)]
    pub TotalBalance: String,
    #[serde(rename = "grantedBalance", default)]
    pub GrantedBalance: String,
    #[serde(rename = "toppedUpBalance", default)]
    pub ToppedUpBalance: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceResponse {
    #[serde(rename = "isAvailable", default)]
    pub IsAvailable: bool,
    #[serde(rename = "balanceInfos", default)]
    pub BalanceInfos: Vec<BalanceInfo>,
}

// ---------------------------------------------------------------------------
// Wire shapes. DeepSeek answers in snake_case, and a field it omits must not
// make the whole response unreadable: a hit without a date is still a hit.
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct WireSearch {
    #[serde(default)]
    pub results: Vec<WireHit>,
}

#[derive(Deserialize)]
pub struct WireHit {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub snippet: String,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub site_name: Option<String>,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default)]
    pub authority: Option<f64>,
    #[serde(default)]
    pub rerank_score: Option<f64>,
}

#[derive(Deserialize)]
pub struct WireFetch {
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub content: String,
}

#[derive(Deserialize)]
pub struct WireBalance {
    #[serde(default)]
    pub is_available: bool,
    #[serde(default)]
    pub balance_infos: Vec<WireBalanceInfo>,
}

#[derive(Deserialize)]
pub struct WireBalanceInfo {
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub total_balance: String,
    #[serde(default)]
    pub granted_balance: String,
    #[serde(default)]
    pub topped_up_balance: String,
}

impl From<WireSearch> for SearchResponse {
    fn from(wire: WireSearch) -> Self {
        SearchResponse {
            Results: wire
                .results
                .into_iter()
                .filter(|hit| !hit.url.is_empty())
                .map(|hit| SearchHit {
                    Title: hit.title,
                    Url: hit.url,
                    Snippet: hit.snippet,
                    Summary: hit.summary.filter(|value| !value.is_empty()),
                    Content: hit.content.filter(|value| !value.is_empty()),
                    SiteName: hit.site_name.filter(|value| !value.is_empty()),
                    Date: hit.date.filter(|value| !value.is_empty()),
                    Authority: hit.authority,
                    RerankScore: hit.rerank_score,
                })
                .collect(),
        }
    }
}

impl From<WireFetch> for FetchResponse {
    fn from(wire: WireFetch) -> Self {
        FetchResponse {
            Url: wire.url,
            Title: wire.title,
            Content: wire.content,
        }
    }
}

impl From<WireBalance> for BalanceResponse {
    fn from(wire: WireBalance) -> Self {
        BalanceResponse {
            IsAvailable: wire.is_available,
            BalanceInfos: wire
                .balance_infos
                .into_iter()
                .map(|info| BalanceInfo {
                    Currency: info.currency,
                    TotalBalance: info.total_balance,
                    GrantedBalance: info.granted_balance,
                    ToppedUpBalance: info.topped_up_balance,
                })
                .collect(),
        }
    }
}

const SEARCH_PATH: &str = "/v1/tools/search";
const FETCH_PATH: &str = "/v1/tools/fetch";
const BALANCE_PATH: &str = "/user/balance";

/// The endpoint answers with an OpenAI-shaped error body; the message inside is
/// the only part worth showing, so the status and the raw JSON never reach the
/// transcript.
fn readable_error(status: u16, body: &str) -> String {
    let message = serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|value| {
            value
                .get("error")
                .and_then(|error| error.get("message"))
                .and_then(|text| text.as_str())
                .map(|text| text.to_string())
                .or_else(|| value.get("message").and_then(|text| text.as_str()).map(String::from))
        });
    match message {
        Some(text) if !text.is_empty() => format!("{text}（HTTP {status}）"),
        _ => format!("请求失败：HTTP {status}"),
    }
}

async fn send_json<T: serde::de::DeserializeOwned>(
    client: &reqwest::Client,
    key: &str,
    path: &str,
    body: serde_json::Value,
) -> Result<T, String> {
    let response = client
        .post(format!("{BASE_URL}{path}"))
        .bearer_auth(key)
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("网络请求失败：{error}"))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("读取响应失败：{error}"))?;

    if !status.is_success() {
        return Err(readable_error(status.as_u16(), &text));
    }

    serde_json::from_str(&text).map_err(|error| format!("解析响应失败：{error}"))
}

/// One web search. The query is capped by the endpoint at 128 characters, and
/// the count at 1–50; both are clamped here so a model-written call cannot
/// turn into a 400 the learner has to read.
pub async fn search(
    client: &reqwest::Client,
    key: &str,
    request: &SearchRequest,
) -> Result<SearchResponse, String> {
    let query = request.Query.trim();
    if query.is_empty() {
        return Err("搜索关键词为空".to_string());
    }
    let shortened: String = query.chars().take(128).collect();
    let count = request.Count.unwrap_or(10).clamp(1, 50);

    let mut body = serde_json::json!({ "query": shortened, "count": count });
    if let Some(need_content) = request.NeedContent {
        body["need_content"] = serde_json::Value::Bool(need_content);
    }

    let wire: WireSearch = send_json(client, key, SEARCH_PATH, body).await?;
    Ok(wire.into())
}

/// Fetches one page as cleaned text.
///
/// Only http(s) with a host is accepted: the model picks the url, and a
/// `file:` or `javascript:` scheme here would be a way out of the sandbox.
pub async fn fetch(
    client: &reqwest::Client,
    key: &str,
    request: &FetchRequest,
) -> Result<FetchResponse, String> {
    let url = request.Url.trim();
    if url.is_empty() {
        return Err("链接为空".to_string());
    }
    if url.len() > 8192 {
        return Err("链接过长".to_string());
    }
    let parsed = reqwest::Url::parse(url).map_err(|_| "链接格式不正确".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return Err("只能读取 http(s) 链接".to_string());
    }

    let wire: WireFetch =
        send_json(client, key, FETCH_PATH, serde_json::json!({ "url": url })).await?;
    Ok(wire.into())
}

/// The account balance, used by the settings page as a cheap proof the key works.
pub async fn balance(client: &reqwest::Client, key: &str) -> Result<BalanceResponse, String> {
    let response = client
        .get(format!("{BASE_URL}{BALANCE_PATH}"))
        .bearer_auth(key)
        .send()
        .await
        .map_err(|error| format!("网络请求失败：{error}"))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("读取响应失败：{error}"))?;
    if !status.is_success() {
        return Err(readable_error(status.as_u16(), &text));
    }

    let wire: WireBalance =
        serde_json::from_str(&text).map_err(|error| format!("解析响应失败：{error}"))?;
    Ok(wire.into())
}

#[cfg(test)]
mod tests {
    use super::{readable_error, FetchRequest, SearchRequest, WireSearch};

    #[test]
    fn an_error_body_keeps_its_message_and_drops_the_envelope() {
        let body = r#"{"error":{"message":"Authentication Fails","type":"auth"}}"#;
        assert_eq!(readable_error(401, body), "Authentication Fails（HTTP 401）");
    }

    #[test]
    fn a_body_without_a_message_still_names_the_status() {
        assert_eq!(readable_error(502, "<html>"), "请求失败：HTTP 502");
        assert_eq!(readable_error(500, "{}"), "请求失败：HTTP 500");
    }

    #[test]
    fn a_hit_without_a_url_is_not_a_hit() {
        let wire: WireSearch = serde_json::from_str(
            r#"{"results":[
                {"title":"A","url":"https://a.example","snippet":"a"},
                {"title":"B","url":"","snippet":"b"}
            ]}"#,
        )
        .expect("parses");
        let response: super::SearchResponse = wire.into();
        assert_eq!(response.Results.len(), 1);
        assert_eq!(response.Results[0].Url, "https://a.example");
    }

    #[test]
    fn an_omitted_field_does_not_lose_the_hit() {
        let wire: WireSearch =
            serde_json::from_str(r#"{"results":[{"title":"A","url":"https://a.example"}]}"#)
                .expect("parses");
        let response: super::SearchResponse = wire.into();
        assert_eq!(response.Results[0].Snippet, "");
        assert!(response.Results[0].Date.is_none());
    }

    #[test]
    fn empty_strings_become_none_so_the_ui_can_skip_them() {
        let wire: WireSearch = serde_json::from_str(
            r#"{"results":[{"url":"https://a.example","site_name":"","summary":"","date":""}]}"#,
        )
        .expect("parses");
        let response: super::SearchResponse = wire.into();
        assert!(response.Results[0].SiteName.is_none());
        assert!(response.Results[0].Summary.is_none());
        assert!(response.Results[0].Date.is_none());
    }

    #[test]
    fn the_request_shapes_deserialize_from_camel_case() {
        let search: SearchRequest =
            serde_json::from_str(r#"{"query":"极限","count":3,"needContent":true}"#)
                .expect("parses");
        assert_eq!(search.Query, "极限");
        assert_eq!(search.Count, Some(3));
        assert_eq!(search.NeedContent, Some(true));

        let fetch: FetchRequest =
            serde_json::from_str(r#"{"url":"https://example.com/a"}"#).expect("parses");
        assert_eq!(fetch.Url, "https://example.com/a");
    }
}
