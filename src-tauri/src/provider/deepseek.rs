use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{Manager, WebviewWindowBuilder};

use super::builtin;
use super::types::ProviderConfig;
use super::{list_models, secret};

/// The platform console, not the inference endpoint.
///
/// Two different hosts back the DeepSeek account: `api.deepseek.com` serves
/// completions, while `platform.deepseek.com` owns the account, its keys and its
/// balance. Signing in and minting a key are console calls, so they live here.
const CONSOLE: &str = "https://platform.deepseek.com";
const CONSOLE_HOST: &str = "platform.deepseek.com";
const SIGN_IN_URL: &str = "https://platform.deepseek.com/sign_in";
const SIGN_IN_PATH: &str = "/sign_in";

/// The name the app gives the key it mints. Re-running the flow finds this name
/// again, which is what makes the "replace the old one?" question answerable.
pub const KEY_NAME: &str = "Morrow Agent";

/// The console session token, kept in memory only.
///
/// The console signs every account call with a bearer token it keeps in
/// `localStorage` under `userToken`, wrapped in an envelope:
/// `{"value":"<token>","__version":"0"}`. Only the inner value is the token —
/// matching the whole string against a token shape is what made earlier attempts
/// fail after a successful sign-in.
///
/// It is deliberately not persisted: it exists to mint one API key during
/// onboarding and then has no further use. A console credential on disk would be
/// a much bigger liability than the convenience is worth.
fn session() -> &'static Mutex<Option<String>> {
    static SESSION: OnceLock<Mutex<Option<String>>> = OnceLock::new();
    SESSION.get_or_init(|| Mutex::new(None))
}

fn remember(token: String) {
    if let Ok(mut guard) = session().lock() {
        *guard = Some(token);
    }
}

fn token() -> Result<String, String> {
    session()
        .lock()
        .ok()
        .and_then(|guard| guard.clone())
        .ok_or_else(|| "登录状态已失效，请重新登录".to_string())
}

fn forget() {
    if let Ok(mut guard) = session().lock() {
        *guard = None;
    }
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

fn device_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join("deepseek.device"))
}

/// The console's risk control reads this id, so it must stay stable per install.
fn device_id(app: &tauri::AppHandle) -> String {
    let path = device_path(app);

    if let Some(path) = &path {
        if let Ok(existing) = std::fs::read_to_string(path) {
            let trimmed = existing.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
    }

    let fresh = random_id();
    store_device(app, &fresh);
    fresh
}

/// Adopts the id the console itself assigned, so later calls look like the same
/// browser that signed in.
fn store_device(app: &tauri::AppHandle, id: &str) {
    if let Some(path) = device_path(app) {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(path, id);
    }
}

// ---------------------------------------------------------------------------
// Reading the signed-in page
// ---------------------------------------------------------------------------

/// Runs a script in the sign-in window and waits for its return value.
///
/// The window is a remote page, so it has no IPC: the only channel back is the
/// script's own return value. `eval_with_callback` hands it over as JSON, which
/// for a string result means a quoted string that has to be unwrapped once.
fn page_value(window: &tauri::WebviewWindow, js: &str) -> Result<String, String> {
    let (sender, receiver) = std::sync::mpsc::channel();
    window
        .eval_with_callback(js, move |value| {
            let _ = sender.send(value);
        })
        .map_err(|error| format!("无法读取登录状态：{error}"))?;

    let raw = receiver
        .recv_timeout(Duration::from_secs(15))
        .map_err(|_| "读取登录状态超时".to_string())?;

    Ok(serde_json::from_str::<String>(&raw).unwrap_or(raw))
}

/// What the console page knows about the session.
#[derive(Debug, Default)]
struct PageSession {
    token: String,
    device: String,
}

/// Reads the bearer token out of `localStorage`.
///
/// Two things matter here. The token is stored inside an envelope object, so it
/// is parsed rather than pattern-matched. And the whole read is guarded: a page
/// that has not finished booting throws instead of returning nothing, and a
/// throw must not be mistaken for "not signed in".
fn read_page_session(window: &tauri::WebviewWindow) -> PageSession {
    let script = r#"(function () {
  var out = { token: "", device: "" };
  try {
    var raw = window.localStorage.getItem("userToken") || "";
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        out.token = (parsed && parsed.value) || "";
      } catch (e) {
        out.token = raw;
      }
    }
    out.device = window.localStorage.getItem("deepseek-device-id:platform") || "";
  } catch (e) {
    out.token = "";
  }
  return JSON.stringify(out);
})()"#;

    let Ok(text) = page_value(window, script) else {
        return PageSession::default();
    };

    let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) else {
        return PageSession::default();
    };

    PageSession {
        token: json["token"].as_str().unwrap_or("").trim().to_string(),
        device: json["device"].as_str().unwrap_or("").trim().to_string(),
    }
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
        "TOKEN_EXPIRED" | "AUTH_EXPIRED" => "登录状态已过期，请重新登录".to_string(),
        other if !other.is_empty() => format!("DeepSeek 拒绝了这次操作：{other}"),
        _ => "DeepSeek 拒绝了这次操作".to_string(),
    }
}

/// The console rejects a bare curl-style client, so the browser identity its own
/// front end sends travels with every call.
///
/// The bearer token is the whole credential: cookies are not needed, which is
/// what lets the sign-in window be closed before any of this runs.
async fn call(
    client: &reqwest::Client,
    device: &str,
    method: reqwest::Method,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<Reply, String> {
    let url = format!("{CONSOLE}{path}");
    let mut builder = client
        .request(method, url)
        .header(
            "user-agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
        )
        .header("accept", "*/*")
        .header("accept-language", "zh-CN")
        .header("origin", CONSOLE)
        .header("referer", format!("{CONSOLE}/usage"))
        .header("authorization", format!("Bearer {}", token()?))
        .header("x-client-platform", "web")
        .header("x-client-version", "1.0.1")
        .header("x-client-bundle-id", "com.deepseek.chat")
        .header("x-client-locale", "zh_CN")
        .header("x-client-timezone-offset", "28800")
        .header("x-device-id", device)
        .header("x-device-model", "");

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

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

/// Wipes the console's own state from the built-in browser.
///
/// WebView2 keeps one profile for the whole app, so a console cookie from an
/// earlier sign-in survives the window being closed. Left alone it does the one
/// thing that makes "重新登录" pointless: the next window lands on `/usage`
/// already signed in as the old account, never showing the form.
///
/// Only DeepSeek's own entries go: the app's UI state lives in the same profile
/// and must not be touched. Cookies are filtered by domain, and the two storages
/// are cleared from a page already on the console origin — from any other origin
/// they are a different (empty) store.
///
/// Returns whether the storages are actually empty, because the console keeps
/// its bearer token in `localStorage`: a cookie deleted while that token
/// survives still reads as signed in, and the account would silently stay the
/// old one.
fn wipe_console_state(window: &tauri::WebviewWindow) -> bool {
    if let Ok(cookies) = window.cookies() {
        for entry in cookies {
            let host = entry.domain().unwrap_or("");
            if !host.ends_with("deepseek.com") {
                continue;
            }
            let _ = window.delete_cookie(entry);
        }
    }

    let script = r#"(function () {
  var ok = true;
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch (e) {
    ok = false;
  }
  try {
    ok = ok && window.localStorage.length === 0;
  } catch (e) {
    ok = false;
  }
  return ok ? "1" : "0";
})()"#;

    page_value(window, script)
        .map(|value| value.trim() == "1")
        .unwrap_or(false)
}

#[derive(Debug, Clone, Serialize)]
pub struct DeepSeekAccount {
    #[serde(rename = "mobile")]
    pub Mobile: String,
    #[serde(rename = "email")]
    pub Email: String,
}

/// Sleeps without blocking the async runtime's worker thread.
async fn pause(millis: u64) {
    tauri::async_runtime::spawn_blocking(move || std::thread::sleep(Duration::from_millis(millis)))
        .await
        .ok();
}

/// Opens the platform's own sign-in page, waits for it to finish, closes it.
///
/// The page is the platform's own, so the phone number, the captcha and the SMS
/// all happen on infrastructure that already knows how to do them: the captcha
/// token is verified server-side against the vendor and cannot be forged, and
/// the risk control that decides which captcha to show keeps working when it
/// changes. The alternative — reimplementing the captcha in this app — would
/// mean loading a third-party fingerprinting script into our own page.
///
/// Every run starts signed out. The built-in browser keeps its profile between
/// windows, so a console session from an earlier sign-in would otherwise be
/// recognised and skip the form entirely — which is fine the first time and
/// wrong every time after, when the learner is deliberately trying to switch
/// accounts. The window is therefore opened hidden, the console's cookies and
/// storages are wiped from inside its own origin, and only then is the sign-in
/// page shown.
///
/// Completion is judged by the URL: the console leaves `/sign_in` the moment a
/// session exists. The token is then read from the page itself, and the window
/// is closed before any console call is made.
pub async fn sign_in(app: tauri::AppHandle) -> Result<DeepSeekAccount, String> {
    forget();

    let label = format!(
        "deepseek-sign-in-{}",
        random_id().split('-').next().unwrap_or("1")
    );

    let target: tauri::Url = SIGN_IN_URL
        .parse()
        .map_err(|_| "登录地址无效".to_string())?;

    let window = WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::External(target.clone()),
    )
    .title("登录 DeepSeek")
    .inner_size(520.0, 780.0)
    .min_inner_size(420.0, 620.0)
    .center()
    // Hidden until the old session is gone, so the learner never watches the
    // console flash the previous account before being logged out.
    .visible(false)
    .build()
    .map_err(|error| format!("无法打开登录窗口：{error}"))?;

    let closed = Arc::new(AtomicBool::new(false));
    window.on_window_event({
        let closed = closed.clone();
        move |event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                closed.store(true, Ordering::SeqCst);
            }
        }
    });

    // The wipe script runs on the console origin, so the page has to be there
    // first: `localStorage` from any other origin is a different, empty store.
    let ready = Instant::now() + Duration::from_secs(30);
    while Instant::now() < ready {
        if closed.load(Ordering::SeqCst) {
            return Err("已取消登录".to_string());
        }
        if let Ok(url) = window.url() {
            if url.host_str() == Some(CONSOLE_HOST) {
                break;
            }
        }
        pause(200).await;
    }

    let mut wiped = false;
    for _ in 0..3 {
        pause(200).await;
        if wipe_console_state(&window) {
            wiped = true;
            break;
        }
    }

    if !wiped {
        let _ = app.get_webview_window(&label).map(|w| w.close());
        return Err("无法清除上次的登录状态，请重启应用后再试".to_string());
    }

    // Back to a clean form: the page is still holding the signed-in shell in
    // memory even though its storage is gone.
    window
        .navigate(target)
        .map_err(|error| format!("无法打开登录页：{error}"))?;
    let _ = window.show();

    // Waiting on the URL covers the arrival: the form submits, the console
    // routes to /usage. A session that somehow survived would also leave
    // /sign_in, and the token read below is what proves which account it is.
    let deadline = Instant::now() + Duration::from_secs(600);
    loop {
        if closed.load(Ordering::SeqCst) {
            return Err("已取消登录".to_string());
        }
        if Instant::now() > deadline {
            let _ = app.get_webview_window(&label).map(|w| w.close());
            return Err("登录超时，请重试".to_string());
        }

        pause(300).await;

        let Ok(url) = window.url() else {
            continue;
        };
        // The host check keeps the blank page a new window starts on from
        // counting as "already past the sign-in form".
        if url.host_str() != Some(CONSOLE_HOST) {
            continue;
        }
        if !url.path().starts_with(SIGN_IN_PATH) {
            break;
        }
    }

    // The console writes the token after it boots the signed-in shell, which can
    // land a moment after the route changes; retry before giving up.
    //
    // The read waits on the page, so it runs off the async runtime: blocking a
    // worker thread on a remote page would stall everything else sharing it.
    let mut page = PageSession::default();
    for _ in 0..20 {
        let probe = window.clone();
        page = tauri::async_runtime::spawn_blocking(move || read_page_session(&probe))
            .await
            .unwrap_or_default();
        if !page.token.is_empty() {
            break;
        }
        pause(250).await;
    }

    let _ = app.get_webview_window(&label).map(|w| w.close());

    if page.token.is_empty() {
        return Err("已经登录，但没能读到登录凭据，请重试".to_string());
    }

    remember(page.token);

    if !page.device.is_empty() {
        store_device(&app, &page.device);
    }
    let device = device_id(&app);

    // The account read is cosmetic: a session that cannot describe itself still
    // works for minting a key, so a failure here must not undo the sign-in.
    let client = reqwest::Client::new();
    let account = match call(
        &client,
        &device,
        reqwest::Method::GET,
        "/auth-api/v0/users/current",
        None,
    )
    .await
    {
        Ok(reply) if reply.biz_code == 0 => DeepSeekAccount {
            Mobile: reply.data["mobile_number"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            Email: reply.data["email"].as_str().unwrap_or("").to_string(),
        },
        _ => DeepSeekAccount {
            Mobile: String::new(),
            Email: String::new(),
        },
    };

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
        book.Providers
            .insert(0, builtin::builtin(&api_key, models.clone()));
    }
    book.ActiveProviderId = Some(builtin::DEEPSEEK_ID.to_string());
    book.ActiveModel = Some(model.clone());
    secret::save(&app, &book)?;

    // The same key pays for search and fetch, so the learner is never asked for
    // it twice.
    secret::save_search_key(&app, &api_key)?;

    forget();

    Ok(ConnectedKey {
        Models: models,
        Model: model,
        Replaced: replaced,
    })
}

/// Forgets the console session when the flow ends without minting anything.
pub fn sign_out() {
    forget();
}
