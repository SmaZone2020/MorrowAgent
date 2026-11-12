use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{Manager, WebviewWindowBuilder};

use super::builtin;
use super::{list_models, secret};
use super::types::ProviderConfig;

/// The platform console, not the inference endpoint.
///
/// Two different hosts back the DeepSeek account: `api.deepseek.com` serves
/// completions, while `platform.deepseek.com` owns the account, its keys and its
/// balance. Signing in and minting a key are console calls, so they live here.
const CONSOLE: &str = "https://platform.deepseek.com";
const SIGN_IN_URL: &str = "https://platform.deepseek.com/sign_in";

/// The name the app gives the key it mints. Re-running the flow finds this name
/// again, which is what makes the "replace the old one?" question answerable.
pub const KEY_NAME: &str = "Morrow Agent";

/// Marks the token hand-off inside the sign-in window's document title.
///
/// The console page is a foreign origin with no IPC bridge, so the only channel
/// back to Rust is something the page already has: its title. An initialization
/// script lifts the token out of `localStorage` and writes it here; the window
/// builder listens for title changes and takes it from there. Nothing is
/// injected into the remote page's own code and no remote origin is granted
/// access to this app's commands.
const TOKEN_PREFIX: &str = "MORROW_DS_TOKEN:";
const CANCEL: &str = "__MORROW_CANCELLED__";

/// The console token for this process only.
///
/// It is deliberately not persisted: it exists to mint one API key during
/// onboarding and then has no further use. A stale console credential on disk
/// would be a much bigger liability than the convenience is worth.
fn session() -> &'static Mutex<Option<String>> {
    static SESSION: OnceLock<Mutex<Option<String>>> = OnceLock::new();
    SESSION.get_or_init(|| Mutex::new(None))
}

fn set_token(token: Option<String>) {
    if let Ok(mut guard) = session().lock() {
        *guard = token;
    }
}

fn token() -> Result<String, String> {
    session()
        .lock()
        .ok()
        .and_then(|guard| guard.clone())
        .ok_or_else(|| "登录状态已失效，请重新登录".to_string())
}

/// A stable per-install device id, which the console's risk control reads.
///
/// It only has to be the same string on every launch, so a persisted random hex
/// id is enough; no cryptographic property is claimed.
fn device_id(app: &tauri::AppHandle) -> String {
    let path = app
        .path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join("deepseek.device"));

    if let Some(path) = &path {
        if let Ok(existing) = std::fs::read_to_string(path) {
            let trimmed = existing.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
    }

    let fresh = random_id();
    if let Some(path) = path {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(path, &fresh);
    }
    fresh
}

fn random_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|span| span.as_nanos())
        .unwrap_or(0);
    let mut state = nanos ^ ((std::process::id() as u128) << 40) | 1;
    let mut hex = String::with_capacity(32);
    for _ in 0..32 {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        hex.push(char::from_digit((state % 16) as u32, 16).unwrap_or('0'));
    }
    format!(
        "{}-{}-{}-{}-{}",
        &hex[0..8],
        &hex[8..12],
        &hex[12..16],
        &hex[16..20],
        &hex[20..32]
    )
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

/// The console wraps every answer twice: a gateway envelope around a business
/// envelope. Both can say "no", and the business one is the interesting half.
struct Reply {
    biz_code: i64,
    biz_msg: String,
    data: serde_json::Value,
}

/// The console rejects a bare curl-style client, so the browser identity the
/// web app sends travels with every call.
fn headers(builder: reqwest::RequestBuilder, device: &str) -> reqwest::RequestBuilder {
    builder
        .header("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36")
        .header("x-client-platform", "web")
        .header("x-client-version", "1.0.1")
        .header("x-client-bundle-id", "com.deepseek.chat")
        .header("x-client-locale", "zh_CN")
        .header("x-client-timezone-offset", "28800")
        .header("x-device-id", device)
        .header("x-device-model", "")
}

async fn call(
    client: &reqwest::Client,
    device: &str,
    token: Option<&str>,
    method: reqwest::Method,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<Reply, String> {
    let url = format!("{CONSOLE}{path}");
    let mut builder = headers(client.request(method, url), device);
    if let Some(token) = token {
        builder = builder.bearer_auth(token);
    }
    if let Some(body) = body {
        builder = builder.json(&body);
    }

    let response = builder
        .send()
        .await
        .map_err(|error| format!("连接 DeepSeek 失败：{error}"))?;
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("读取响应失败：{error}"))?;

    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|_| format!("DeepSeek 返回了无法识别的内容（HTTP {status}）"))?;

    // 422 carries FastAPI's validation detail instead of the usual envelope.
    if status.as_u16() == 422 {
        let field = json["detail"][0]["loc"]
            .as_str()
            .unwrap_or("未知字段")
            .to_string();
        return Err(format!("请求参数不被接受：{field}"));
    }

    let code = json["code"].as_i64().unwrap_or(0);
    if code != 0 {
        return Err(json["msg"]
            .as_str()
            .map(str::to_string)
            .unwrap_or_else(|| format!("DeepSeek 网关错误 {code}")));
    }

    let biz = &json["data"];
    Ok(Reply {
        biz_code: biz["biz_code"].as_i64().unwrap_or(0),
        biz_msg: biz["biz_msg"].as_str().unwrap_or("").to_string(),
        data: biz["biz_data"].clone(),
    })
}

/// Console errors arrive as shouting constants. A learner gets a sentence.
fn explain(reply: &Reply) -> String {
    match reply.biz_msg.as_str() {
        "RECAPTCHA_VERIFY_FAILED" => "人机验证没有通过，请重新登录".to_string(),
        "SMS_SEND_TOO_FREQUENT" => "验证码发得太频繁，请稍后再试".to_string(),
        "SMS_CODE_INCORRECT" => "验证码不对".to_string(),
        "SMS_EXPIRED" => "验证码已过期，请重新获取".to_string(),
        "EXCEED_MAXIMUM_KEY_NUM" => "API Key 数量已达上限，请先去开放平台删掉几个".to_string(),
        "API_KEY_NAME_TOO_LONG" => "Key 名称太长".to_string(),
        "IDENTITY_VERIFICATION_REQUIRED" => "需要先在开放平台完成实名认证".to_string(),
        other if !other.is_empty() => format!("DeepSeek 拒绝了这次操作：{other}"),
        _ => "DeepSeek 拒绝了这次操作".to_string(),
    }
}

// ---------------------------------------------------------------------------
// Sign-in window
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct DeepSeekAccount {
    #[serde(rename = "mobile")]
    pub Mobile: String,
    #[serde(rename = "email")]
    pub Email: String,
}

/// Lifts the console's token into the document title.
///
/// The web app keeps it in `localStorage.userToken` as JSON. Only that key is
/// trusted: the console also stores device fingerprints and risk-control ids
/// there, and several of them are long base64 runs that look exactly like a
/// token. An earlier version scanned every key and accepted the first long
/// string it found, which reported a fingerprint as the token within a second of
/// the page loading — the window then closed itself and the flow failed with a
/// credential that was never a credential. So: the documented key first, then
/// only keys whose own name says "token", and every candidate has to have the
/// shape of the 64+ character JWT the console actually issues.
const TITLE_BRIDGE: &str = r#"
(function () {
  if (window.top !== window) return;
  var PREFIX = "MORROW_DS_TOKEN:";
  var SHAPE = /^[A-Za-z0-9._-]{40,}$/;
  function pick(raw) {
    if (!raw) return null;
    var value = raw;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        value = parsed.value || parsed.token || null;
      }
    } catch (error) {}
    if (typeof value !== "string") return null;
    value = value.trim();
    return SHAPE.test(value) ? value : null;
  }
  function read() {
    try {
      var direct = pick(localStorage.getItem("userToken"));
      if (direct) return direct;
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.toLowerCase().indexOf("token") === -1) continue;
        var candidate = pick(localStorage.getItem(key));
        if (candidate) return candidate;
      }
    } catch (error) {}
    return null;
  }
  setInterval(function () {
    var token = read();
    if (!token) return;
    // Keep re-asserting: the console is a router app and rewrites its own title
    // on navigation, which would otherwise overwrite the hand-off before the
    // window gets a chance to read it.
    if (document.title === PREFIX + token) return;
    document.title = PREFIX + token;
  }, 700);
})();
"#;

/// Whether a reported value could be a console token at all.
///
/// A second gate behind the script: the title channel is a plain string, and a
/// page is free to set any title it likes. Rejecting a malformed value here
/// leaves the window open and the script still polling, instead of closing on
/// something that would only fail later at the first API call.
fn plausible_token(value: &str) -> bool {
    value.len() >= 40
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
}

/// Opens the official sign-in page and waits for it to yield a token.
///
/// The page is the platform's own, so the phone number, the captcha and the SMS
/// all happen on infrastructure that already knows how to do them: the captcha
/// token is verified server-side against the vendor and cannot be forged, and
/// the risk control that decides which captcha to show keeps working when it
/// changes. The alternative — reimplementing the captcha in this app — would
/// mean loading a third-party fingerprinting script into our own page.
pub async fn sign_in(app: tauri::AppHandle) -> Result<DeepSeekAccount, String> {
    let (tx, rx) = std::sync::mpsc::channel::<String>();
    let sink = Arc::new(Mutex::new(tx));

    let label = format!(
        "deepseek-sign-in-{}",
        random_id().split('-').next().unwrap_or("1")
    );

    // Every candidate token goes into the same queue; the loop below decides
    // whether it is real. Nothing here closes the window: a value only ends the
    // flow once the console has confirmed it describes an account.
    let send = {
        let sink = sink.clone();
        move |value: String| {
            if let Ok(guard) = sink.lock() {
                let _ = guard.send(value);
            }
        }
    };

    let on_title = {
        let send = send.clone();
        move |_window: tauri::WebviewWindow, title: String| {
            let Some(token) = title.strip_prefix(TOKEN_PREFIX) else {
                return;
            };
            if plausible_token(token) {
                send(token.to_string());
            }
        }
    };

    let window = WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::External(
            SIGN_IN_URL
                .parse()
                .map_err(|_| "登录地址无效".to_string())?,
        ),
    )
    .title("登录 DeepSeek")
    .inner_size(520.0, 780.0)
    .min_inner_size(420.0, 620.0)
    .center()
    .initialization_script(TITLE_BRIDGE)
    .on_document_title_changed(on_title)
    .build()
    .map_err(|error| format!("无法打开登录窗口：{error}"))?;

    // Closing the window is how a learner says "not now".
    window.on_window_event({
        let send = send.clone();
        move |event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                send(CANCEL.to_string());
            }
        }
    });

    let inbox = Arc::new(Mutex::new(rx));
    let deadline = Instant::now() + Duration::from_secs(600);
    let device = device_id(&app);
    let client = reqwest::Client::new();

    let account = loop {
        let left = deadline.saturating_duration_since(Instant::now());
        if left.is_zero() {
            let _ = app.get_webview_window(&label).map(|w| w.close());
            return Err("登录超时，请重试".to_string());
        }

        let inbox = inbox.clone();
        let received = tauri::async_runtime::spawn_blocking(move || {
            inbox
                .lock()
                .ok()
                .and_then(|guard| guard.recv_timeout(left).ok())
        })
        .await
        .map_err(|error| format!("登录等待中断：{error}"))?;

        let Some(value) = received else {
            continue;
        };

        if value == CANCEL {
            return Err("已取消登录".to_string());
        }

        // The token is proven before the window goes away: the console answers
        // 40003 for a stale or invented one, and in that case the page stays up
        // so the learner can finish signing in instead of the flow dying on a
        // string that only looked like a credential.
        let verified = call(
            &client,
            &device,
            Some(&value),
            reqwest::Method::GET,
            "/auth-api/v0/users/current",
            None,
        )
        .await;

        if let Ok(reply) = verified {
            set_token(Some(value));
            break DeepSeekAccount {
                Mobile: reply.data["mobile_number"]
                    .as_str()
                    .unwrap_or("")
                    .to_string(),
                Email: reply.data["email"].as_str().unwrap_or("").to_string(),
            };
        }
    };

    let _ = app.get_webview_window(&label).map(|w| w.close());

    Ok(account)
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct KeySlot {
    #[serde(rename = "name")]
    pub Name: String,
    /// The masked value; the console never repeats a key in full.
    #[serde(rename = "masked")]
    pub Masked: String,
    #[serde(rename = "trackingId")]
    pub TrackingId: String,
    #[serde(rename = "createdAt")]
    pub CreatedAt: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct KeyPlan {
    /// Whether a key called [`KEY_NAME`] already exists.
    #[serde(rename = "exists")]
    pub Exists: bool,
    #[serde(rename = "total")]
    pub Total: usize,
    #[serde(rename = "limit")]
    pub Limit: i64,
    #[serde(rename = "keys")]
    pub Keys: Vec<KeySlot>,
}

async fn list_keys(client: &reqwest::Client, device: &str) -> Result<KeyPlan, String> {
    let reply = call(
        client,
        device,
        Some(&token()?),
        reqwest::Method::GET,
        "/api/v0/users/get_api_keys",
        None,
    )
    .await?;

    if reply.biz_code != 0 {
        return Err(explain(&reply));
    }

    let keys = reply.data["api_keys"]
        .as_array()
        .map(|rows| {
            rows.iter()
                .map(|row| KeySlot {
                    Name: row["name"].as_str().unwrap_or("").to_string(),
                    Masked: row["sensitive_id"].as_str().unwrap_or("").to_string(),
                    TrackingId: row["tracking_id"].as_str().unwrap_or("").to_string(),
                    CreatedAt: row["created_at"].as_i64().unwrap_or(0),
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Ok(KeyPlan {
        Exists: keys.iter().any(|key| key.Name == KEY_NAME),
        Total: keys.len(),
        Limit: reply.data["key_quota"]["total"]["limit"]
            .as_i64()
            .unwrap_or(0),
        Keys: keys,
    })
}

/// Which keys the account already holds, so the caller can warn before
/// replacing one.
pub async fn key_plan(app: tauri::AppHandle) -> Result<KeyPlan, String> {
    let device = device_id(&app);
    list_keys(&reqwest::Client::new(), &device).await
}

#[derive(Debug, Clone, Serialize)]
pub struct ConnectedKey {
    /// Models the new key can reach, filled by the same fetch that proves it.
    #[serde(rename = "models")]
    pub Models: Vec<String>,
    #[serde(rename = "model")]
    pub Model: String,
    /// Whether an older key of the same name was removed on the way.
    #[serde(rename = "replaced")]
    pub Replaced: bool,
}

/// Mints a key, proves it, and adopts it for chat and search.
///
/// The plaintext of a freshly created key is returned by the console exactly
/// once, so it is never sent to the webview: it goes straight into the encrypted
/// provider blob and the search blob here. The caller only learns what it got.
pub async fn create_and_adopt(
    app: tauri::AppHandle,
    replace: bool,
) -> Result<ConnectedKey, String> {
    let device = device_id(&app);
    let client = reqwest::Client::new();

    let existing = list_keys(&client, &device).await?;
    let stale = existing
        .Keys
        .iter()
        .find(|key| key.Name == KEY_NAME)
        .cloned();

    if stale.is_some() && !replace {
        return Err("KEY_EXISTS".to_string());
    }

    let mut replaced = false;
    if let Some(stale) = stale {
        let reply = call(
            &client,
            &device,
            Some(&token()?),
            reqwest::Method::POST,
            "/api/v0/users/edit_api_keys",
            Some(serde_json::json!({
                "action": "delete",
                "name": serde_json::Value::Null,
                "redacted_key": stale.Masked,
                "created_at": stale.CreatedAt,
                "tracking_id": stale.TrackingId,
            })),
        )
        .await?;
        if reply.biz_code != 0 {
            return Err(explain(&reply));
        }
        replaced = true;
    }

    let created = call(
        &client,
        &device,
        Some(&token()?),
        reqwest::Method::POST,
        "/api/v0/users/edit_api_keys",
        Some(serde_json::json!({
            "action": "create",
            "name": KEY_NAME,
            "redacted_key": serde_json::Value::Null,
            "created_at": serde_json::Value::Null,
            "tracking_id": serde_json::Value::Null,
            "is_exp": false,
        })),
    )
    .await?;

    if created.biz_code != 0 {
        return Err(explain(&created));
    }

    let api_key = created.data["api_key"]["sensitive_id"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();
    if !api_key.starts_with("sk-") {
        return Err("DeepSeek 没有返回可用的 Key".to_string());
    }

    let models = list_models(
        &client,
        &ProviderConfig {
            BaseUrl: builtin::DEEPSEEK_BASE_URL.to_string(),
            ApiKey: api_key.clone(),
            Model: String::new(),
            Protocol: super::protocol::Protocol::OpenaiChat,
        },
    )
    .await
    .map(|entries| entries.into_iter().map(|entry| entry.Id).collect::<Vec<_>>())
    .unwrap_or_default();

    // A key that cannot list models is still a key: keep the shipped names so
    // the picker is usable, and let the settings page refetch later.
    let models = if models.is_empty() {
        builtin::default_models()
    } else {
        models
    };
    let model = models.first().cloned().unwrap_or_default();

    let mut book = secret::load(&app)?;
    let mut found = false;
    for provider in book.Providers.iter_mut() {
        if provider.Id == builtin::DEEPSEEK_ID {
            provider.ApiKey = api_key.clone();
            provider.Models = models.clone();
            found = true;
        }
    }
    if !found {
        book.Providers.insert(0, builtin::builtin(&api_key, models.clone()));
    }
    book.ActiveProviderId = Some(builtin::DEEPSEEK_ID.to_string());
    book.ActiveModel = Some(model.clone());
    secret::save(&app, &book)?;

    // The same key pays for search and fetch, so the learner is never asked for
    // it twice.
    secret::save_search_key(&app, &api_key)?;

    set_token(None);

    Ok(ConnectedKey {
        Models: models,
        Model: model,
        Replaced: replaced,
    })
}

/// Forgets the console token when the flow ends without minting anything.
pub fn sign_out() {
    set_token(None);
}
