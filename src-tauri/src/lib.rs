// AGENT.md requires PascalCase struct fields while the serialized form stays
// camelCase, so the snake_case lint does not apply to this crate.
#![allow(non_snake_case)]

mod package;
mod prefs;
mod provider;
mod store;
mod ui_state;

use package::ValidationReport;
use provider::secret::{self, ProviderBook};
use provider::types::{ChatRequest, ModelInfo, ProviderConfig};
use store::{
    ConversationSummary, NewAttempt, NewMessage, PointStats, Store, StoreStats, StoredAttempt,
    StoredMessage, Workspace,
};
use tauri::Manager;
use tauri::State;
use tauri_plugin_opener::OpenerExt;

// One shared client keeps the connection pool warm across turns; a per-request
// client would re-handshake TLS on every message.
struct AppState {
    Client: reqwest::Client,
}

/// Where packages live. Content is deliberately separate from the database: a
/// `.morrow` file is replaceable, the user's history is not.
fn packages_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位应用数据目录：{}", error))?
        .join("packages");
    std::fs::create_dir_all(&dir).map_err(|error| format!("无法创建学习包目录：{error}"))?;
    Ok(dir)
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
fn provider_save(app: tauri::AppHandle, book: ProviderBook) -> Result<(), String> {
    secret::save(&app, &book)
}

#[tauri::command]
fn provider_load(app: tauri::AppHandle) -> Result<Option<ProviderBook>, String> {
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
    workspace_id: String,
    message: NewMessage,
) -> Result<StoredMessage, String> {
    state.append(&conversation_id, &workspace_id, message)
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
    workspace_id: String,
    limit: Option<i64>,
) -> Result<Vec<ConversationSummary>, String> {
    state.conversations(&workspace_id, limit.unwrap_or(20))
}

#[tauri::command]
fn chat_delete(state: State<'_, Store>, conversation_id: String) -> Result<(), String> {
    state.delete_conversation(&conversation_id)
}

#[tauri::command]
fn chat_rename(
    state: State<'_, Store>,
    conversation_id: String,
    title: String,
) -> Result<(), String> {
    state.rename_conversation(&conversation_id, &title)
}

#[tauri::command]
fn chat_discard_empty(state: State<'_, Store>, conversation_id: String) -> Result<(), String> {
    state.discard_empty_conversation(&conversation_id)
}

#[tauri::command]
fn chat_delete_message(state: State<'_, Store>, message_id: String) -> Result<(), String> {
    state.delete_message(&message_id)
}

#[tauri::command]
fn chat_truncate(
    state: State<'_, Store>,
    conversation_id: String,
    message_id: String,
) -> Result<(), String> {
    state.truncate_from(&conversation_id, &message_id)
}

#[tauri::command]
fn chat_reset(state: State<'_, Store>, workspace_id: String) -> Result<(), String> {
    state.reset(&workspace_id)
}

#[tauri::command]
fn data_stats(state: State<'_, Store>) -> Result<StoreStats, String> {
    state.stats()
}

#[tauri::command]
fn attempt_record(
    state: State<'_, Store>,
    workspace_id: String,
    attempt: NewAttempt,
) -> Result<(), String> {
    state.record_attempt(&workspace_id, attempt)
}

#[tauri::command]
fn attempt_wrong_list(
    state: State<'_, Store>,
    workspace_id: String,
    limit: Option<i64>,
) -> Result<Vec<StoredAttempt>, String> {
    state.wrong_attempts(&workspace_id, limit.unwrap_or(50))
}

#[tauri::command]
fn attempt_forget(
    state: State<'_, Store>,
    workspace_id: String,
    question_id: String,
) -> Result<(), String> {
    state.forget_attempt(&workspace_id, &question_id)
}

#[tauri::command]
fn attempt_point_stats(
    state: State<'_, Store>,
    workspace_id: String,
) -> Result<Vec<PointStats>, String> {
    state.point_stats(&workspace_id)
}

#[tauri::command]
fn prefs_load(app: tauri::AppHandle) -> Result<prefs::Preferences, String> {
    prefs::load(&app)
}

#[tauri::command]
fn prefs_save(app: tauri::AppHandle, preferences: prefs::Preferences) -> Result<(), String> {
    prefs::save(&app, &preferences)
}

#[tauri::command]
fn ui_state_load(app: tauri::AppHandle) -> Result<ui_state::UiState, String> {
    ui_state::load(&app)
}

#[tauri::command]
fn ui_state_save(app: tauri::AppHandle, state: ui_state::UiState) -> Result<(), String> {
    ui_state::save(&app, &state)
}

/// Opens a reply's link in the user's real browser. The scheme check is
/// repeated here because the frontend value comes from model output.
#[tauri::command]
fn open_external_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if !(trimmed.starts_with("https://") || trimmed.starts_with("http://")) {
        return Err(format!("不支持的链接协议：{trimmed}"));
    }
    app.opener()
        .open_url(trimmed, None::<&str>)
        .map_err(|error| format!("无法打开浏览器：{error}"))
}

#[tauri::command]
fn package_inspect(app: tauri::AppHandle, path: String) -> Result<ValidationReport, String> {
    let packages = packages_dir(&app)?;
    let staging = package::staging_path(&packages);
    let report = package::inspect(std::path::Path::new(&path), &staging);
    if !matches!(&report, Ok(report) if report.Ok) {
        // A failed inspection must not leave a half-extracted tree behind.
        let _ = std::fs::remove_dir_all(&staging);
    }
    report
}

#[tauri::command]
fn package_install(
    app: tauri::AppHandle,
    state: State<'_, Store>,
    staging: String,
    update: bool,
) -> Result<Workspace, String> {
    let packages = packages_dir(&app)?;
    let installed = package::install(std::path::Path::new(&staging), &packages)?;

    let existing = state.workspace_for_package(&installed.Manifest.Id)?;
    // Reusing the id is what keeps history attached across an update. A fresh
    // install gets its own id so two copies never share a transcript.
    let id = match (&existing, update) {
        (Some(workspace), true) => workspace.Id.clone(),
        _ => format!("ws-{}", installed.Manifest.Id),
    };

    let workspace = state.upsert_workspace(store::NewWorkspace {
        Id: id.clone(),
        PackageId: installed.Manifest.Id.clone(),
        PackageVersion: installed.Manifest.Version.clone(),
        Name: installed.Manifest.Name.clone(),
        RootPath: installed.RootPath.clone(),
        CoverPath: installed.CoverPath.clone(),
        Accent: installed.Manifest.Accent.clone(),
        Tags: installed.Manifest.Tags.clone(),
    })?;

    // Rows written before workspaces existed have an empty id; the first
    // installed package adopts them so an upgrade does not orphan them.
    if existing.is_none() {
        state.adopt_orphan_rows(&id)?;
    }

    Ok(workspace)
}

#[tauri::command]
fn package_cancel(staging: String) -> Result<(), String> {
    let _ = std::fs::remove_dir_all(&staging);
    Ok(())
}

#[tauri::command]
fn package_export(state: State<'_, Store>, workspace_id: String, target: String) -> Result<u64, String> {
    let workspace = state
        .workspace(&workspace_id)?
        .ok_or_else(|| "学习包不存在".to_string())?;
    if workspace.Orphaned || workspace.RootPath.is_empty() {
        return Err("学习包内容已被移除，无法导出".to_string());
    }
    package::export(std::path::Path::new(&workspace.RootPath), std::path::Path::new(&target))
}

#[tauri::command]
fn workspace_list(state: State<'_, Store>) -> Result<Vec<Workspace>, String> {
    state.workspaces()
}

/// Reads the installed tree. A package directory that has disappeared marks the
/// workspace orphaned instead of failing on every page load.
#[tauri::command]
fn workspace_content(
    state: State<'_, Store>,
    workspace_id: String,
) -> Result<package::content::PackageContent, String> {
    let workspace = state
        .workspace(&workspace_id)?
        .ok_or_else(|| "学习包不存在".to_string())?;
    if workspace.Orphaned {
        return Err("学习包内容已被移除".to_string());
    }

    match package::open(std::path::Path::new(&workspace.RootPath))? {
        Some(content) => Ok(content),
        None => {
            state.orphan_workspace(&workspace_id)?;
            Err("学习包目录已不存在，已标记为移除".to_string())
        }
    }
}

#[tauri::command]
fn workspace_touch(state: State<'_, Store>, workspace_id: String) -> Result<(), String> {
    state.touch_workspace(&workspace_id)
}

#[tauri::command]
fn workspace_remove(
    state: State<'_, Store>,
    workspace_id: String,
    delete_data: bool,
) -> Result<(), String> {
    if delete_data {
        return state.delete_workspace(&workspace_id);
    }
    state.orphan_workspace(&workspace_id)
}

/// Reads a cover image out of an installed workspace. The path is relative to
/// the package root and re-validated here: the frontend supplies it, so an
/// absolute path would otherwise be a file read of the user's choosing.
#[tauri::command]
fn package_cover_data(
    state: State<'_, Store>,
    workspace_id: String,
    cover_path: String,
) -> Result<String, String> {
    let workspace = state
        .workspace(&workspace_id)?
        .ok_or_else(|| "学习包不存在".to_string())?;
    if workspace.Orphaned || workspace.RootPath.is_empty() {
        return Err("学习包内容已被移除".to_string());
    }

    let root = std::path::Path::new(&workspace.RootPath);
    let full = package::paths::safe_join(root, &cover_path)?;
    let bytes = std::fs::read(&full).map_err(|error| format!("无法读取封面：{error}"))?;
    let mime = if cover_path.ends_with(".png") {
        "image/png"
    } else if cover_path.ends_with(".webp") {
        "image/webp"
    } else {
        "image/jpeg"
    };
    Ok(format!("data:{mime};base64,{}", base64(&bytes)))
}

fn base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b = [
            chunk[0],
            chunk.get(1).copied().unwrap_or(0),
            chunk.get(2).copied().unwrap_or(0),
        ];
        out.push(TABLE[(b[0] >> 2) as usize] as char);
        out.push(TABLE[(((b[0] & 0b11) << 4) | (b[1] >> 4)) as usize] as char);
        out.push(if chunk.len() > 1 {
            TABLE[(((b[1] & 0b1111) << 2) | (b[2] >> 6)) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            TABLE[(b[2] & 0b111111) as usize] as char
        } else {
            '='
        });
    }
    out
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let client = reqwest::Client::builder()
        .user_agent("MorrowAgent/0.1")
        .build()
        .expect("failed to build the HTTP client");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
            chat_rename,
            chat_discard_empty,
            chat_delete_message,
            chat_truncate,
            chat_reset,
            data_stats,
            attempt_record,
            attempt_wrong_list,
            attempt_forget,
            attempt_point_stats,
            prefs_load,
            prefs_save,
            ui_state_load,
            ui_state_save,
            package_inspect,
            package_install,
            package_cancel,
            package_export,
            package_cover_data,
            workspace_list,
            workspace_content,
            workspace_touch,
            workspace_remove,
            open_external_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running Morrow Agent");
}
