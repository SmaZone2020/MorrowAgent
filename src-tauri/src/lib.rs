// AGENT.md requires PascalCase struct fields while the serialized form stays
// camelCase, so the snake_case lint does not apply to this crate.
#![allow(non_snake_case)]

mod prefs;
mod provider;
mod store;

use provider::secret::{self, StoredProvider};
use provider::types::{ChatRequest, ModelInfo, ProviderConfig};
use store::{
    ConversationSummary, NewAttempt, NewMessage, PointStats, Store, StoreStats, StoredAttempt,
    StoredMessage,
};
use tauri::Manager;
use tauri::State;

// One shared client keeps the connection pool warm across turns; a per-request
// client would re-handshake TLS on every message.
struct AppState {
    Client: reqwest::Client,
}

#[tauri::command]
async fn ai_list_models(
    state: State<'_, AppState>,
    config: ProviderConfig,
) -> Result<Vec<ModelInfo>, String> {
    provider::list_models(&state.Client, &config).await
}

/// Spawns the stream and returns immediately; fragments arrive on
/// `ai://delta`, tagged with the caller's request id.
#[tauri::command]
fn ai_chat_stream(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    config: ProviderConfig,
    request: ChatRequest,
    request_id: String,
) -> Result<(), String> {
    let client = state.Client.clone();
    tauri::async_runtime::spawn(async move {
        provider::stream::run(app, client, config, request, request_id).await;
    });
    Ok(())
}

#[tauri::command]
fn provider_save(app: tauri::AppHandle, provider: StoredProvider) -> Result<(), String> {
    secret::save(&app, &provider)
}

#[tauri::command]
fn provider_load(app: tauri::AppHandle) -> Result<Option<StoredProvider>, String> {
    secret::load(&app)
}

#[tauri::command]
fn provider_clear(app: tauri::AppHandle) -> Result<(), String> {
    secret::clear(&app)
}

#[tauri::command]
fn chat_append(
    state: State<'_, Store>,
    conversation_id: String,
    message: NewMessage,
) -> Result<StoredMessage, String> {
    state.append(&conversation_id, message)
}

#[tauri::command]
fn chat_messages(
    state: State<'_, Store>,
    conversation_id: String,
) -> Result<Vec<StoredMessage>, String> {
    state.messages(&conversation_id)
}

#[tauri::command]
fn chat_conversations(
    state: State<'_, Store>,
    limit: Option<i64>,
) -> Result<Vec<ConversationSummary>, String> {
    state.conversations(limit.unwrap_or(20))
}

#[tauri::command]
fn chat_delete(state: State<'_, Store>, conversation_id: String) -> Result<(), String> {
    state.delete_conversation(&conversation_id)
}

#[tauri::command]
fn chat_reset(state: State<'_, Store>) -> Result<(), String> {
    state.reset()
}

#[tauri::command]
fn data_stats(state: State<'_, Store>) -> Result<StoreStats, String> {
    state.stats()
}

#[tauri::command]
fn attempt_record(state: State<'_, Store>, attempt: NewAttempt) -> Result<(), String> {
    state.record_attempt(attempt)
}

#[tauri::command]
fn attempt_wrong_list(
    state: State<'_, Store>,
    limit: Option<i64>,
) -> Result<Vec<StoredAttempt>, String> {
    state.wrong_attempts(limit.unwrap_or(50))
}

#[tauri::command]
fn attempt_forget(state: State<'_, Store>, question_id: String) -> Result<(), String> {
    state.forget_attempt(&question_id)
}

#[tauri::command]
fn attempt_point_stats(state: State<'_, Store>) -> Result<Vec<PointStats>, String> {
    state.point_stats()
}

#[tauri::command]
fn prefs_load(app: tauri::AppHandle) -> Result<prefs::Preferences, String> {
    prefs::load(&app)
}

#[tauri::command]
fn prefs_save(app: tauri::AppHandle, preferences: prefs::Preferences) -> Result<(), String> {
    prefs::save(&app, &preferences)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let client = reqwest::Client::builder()
        .user_agent("MorrowAgent/0.1")
        .build()
        .expect("failed to build the HTTP client");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { Client: client })
        .setup(|app| {
            // The database lives in the app data dir, so it can only be opened
            // once Tauri knows which platform path that is.
            let dir = app
                .path()
                .app_data_dir()
                .map_err(|error| format!("无法定位应用数据目录：{}", error))?;
            std::fs::create_dir_all(&dir)
                .map_err(|error| format!("无法创建数据目录：{}", error))?;
            let store = store::open(&dir.join("morrow.db"))?;
            app.manage(store);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ai_list_models,
            ai_chat_stream,
            provider_save,
            provider_load,
            provider_clear,
            chat_append,
            chat_messages,
            chat_conversations,
            chat_delete,
            chat_reset,
            data_stats,
            attempt_record,
            attempt_wrong_list,
            attempt_forget,
            attempt_point_stats,
            prefs_load,
            prefs_save
        ])
        .run(tauri::generate_context!())
        .expect("error while running Morrow Agent");
}
