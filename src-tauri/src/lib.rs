// AGENT.md requires PascalCase struct fields while the serialized form stays
// camelCase, so the snake_case lint does not apply to this crate.
#![allow(non_snake_case)]

mod provider;

use provider::secret::{self, StoredProvider};
use provider::types::{ChatRequest, ChatResponse, ModelInfo, ProviderConfig};
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

#[tauri::command]
async fn ai_chat(
    state: State<'_, AppState>,
    config: ProviderConfig,
    request: ChatRequest,
) -> Result<ChatResponse, String> {
    provider::chat(&state.Client, &config, &request).await
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let client = reqwest::Client::builder()
        .user_agent("MorrowAgent/0.1")
        .build()
        .expect("failed to build the HTTP client");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { Client: client })
        .invoke_handler(tauri::generate_handler![
            ai_list_models,
            ai_chat,
            provider_save,
            provider_load,
            provider_clear
        ])
        .run(tauri::generate_context!())
        .expect("error while running Morrow Agent");
}
