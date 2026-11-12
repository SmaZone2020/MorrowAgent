// AGENT.md requires PascalCase struct fields while the serialized form stays
// camelCase, so the snake_case lint does not apply to this crate.
#![allow(non_snake_case)]

mod prefs;
mod provider;
mod store;
mod ui_state;

// Public so the shipped-archive integration test can drive the same importer
// the UI uses; unit tests build their own archives and never see the entry
// shape a third-party packer produces.
pub mod package;

use package::ValidationReport;
use provider::secret::{self, ProviderBook};
use provider::types::{ChatRequest, ModelInfo, ProviderConfig};
use store::{
    ConversationSummary, ExamRun, NewAttempt, NewMessage, PointEvidence, PointStats, Store,
    StoreStats, StoredAttempt, StoredMessage, StudyGoal, TrendPoint, Workspace,
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
fn provider_load(app: tauri::AppHandle) -> Result<ProviderBook, String> {
    secret::load(&app)
}

#[tauri::command]
fn provider_clear(app: tauri::AppHandle) -> Result<(), String> {
    secret::clear(&app)
}

/// Saves the DeepSeek key used by web search. An empty key clears it.
#[tauri::command]
fn search_save_key(app: tauri::AppHandle, key: String) -> Result<(), String> {
    secret::save_search_key(&app, &key)
}

#[tauri::command]
fn search_load_key(app: tauri::AppHandle) -> Result<Option<String>, String> {
    secret::load_search_key(&app)
}

/// The key search will actually use, and where it came from: a dedicated key
/// saved on the search page, or the builtin provider's key. The webview only
/// learns whether one exists — never the key itself.
#[derive(serde::Serialize)]
struct SearchKeyStatus {
    #[serde(rename = "configured")]
    Configured: bool,
    #[serde(rename = "source")]
    Source: Option<String>,
}

#[tauri::command]
fn search_key_status(app: tauri::AppHandle) -> Result<SearchKeyStatus, String> {
    let resolved = secret::resolve_search_key(&app)?;
    Ok(match resolved {
        Some((source, _)) => SearchKeyStatus {
            Configured: true,
            Source: Some(
                match source {
                    secret::KeySource::Search => "search",
                    secret::KeySource::Provider => "provider",
                }
                .to_string(),
            ),
        },
        None => SearchKeyStatus {
            Configured: false,
            Source: None,
        },
    })
}

/// The key search will run on, falling back to the builtin provider's key.
///
/// A learner who already pasted a DeepSeek key on the provider page should not
/// have to paste it again on the search page; the dedicated key still wins when
/// both exist, because one typed there is meant for search.
fn search_key(app: &tauri::AppHandle) -> Result<String, String> {
    secret::resolve_search_key(app)?
        .map(|(_, key)| key)
        .ok_or_else(|| "还没有配置 DeepSeek Key".to_string())
}

#[tauri::command]
async fn search_web(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: provider::search::SearchRequest,
) -> Result<provider::search::SearchResponse, String> {
    let key = search_key(&app)?;
    provider::search::search(&state.Client, &key, &request).await
}

#[tauri::command]
async fn fetch_page(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: provider::search::FetchRequest,
) -> Result<provider::search::FetchResponse, String> {
    let key = search_key(&app)?;
    provider::search::fetch(&state.Client, &key, &request).await
}

#[tauri::command]
async fn deepseek_balance(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<provider::search::BalanceResponse, String> {
    let key = search_key(&app)?;
    provider::search::balance(&state.Client, &key).await
}

/// Opens the platform's own sign-in page and keeps the session it yields.
///
/// The console token never reaches the webview: it is used here to mint the API
/// key that the rest of the app actually runs on.
#[tauri::command]
async fn deepseek_sign_in(
    app: tauri::AppHandle,
) -> Result<provider::deepseek::DeepSeekAccount, String> {
    provider::deepseek::sign_in(app).await
}

/// What the account already holds, so a replace can be confirmed first.
#[tauri::command]
async fn deepseek_key_plan(
    app: tauri::AppHandle,
) -> Result<provider::deepseek::KeyPlan, String> {
    provider::deepseek::key_plan(app).await
}

/// Mints the app's key, proves it by listing models, and adopts it for chat and
/// search in one step.
#[tauri::command]
async fn deepseek_connect_key(
    app: tauri::AppHandle,
    replace: bool,
) -> Result<provider::deepseek::ConnectedKey, String> {
    provider::deepseek::create_and_adopt(app, replace).await
}

/// Drops the console session without minting anything.
#[tauri::command]
fn deepseek_sign_out() {
    provider::deepseek::sign_out();
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

/// Settings-level wipe: every package's study data at once.
#[tauri::command]
fn data_reset(state: State<'_, Store>) -> Result<(), String> {
    state.reset_all()
}

#[tauri::command]
fn data_stats(state: State<'_, Store>) -> Result<StoreStats, String> {
    state.stats()
}

/// Packs the local store into `target` and returns the archive size.
#[tauri::command]
fn data_backup(state: State<'_, Store>, target: String) -> Result<u64, String> {
    state.backup_to(std::path::Path::new(&target))
}

/// Replaces the local store from a backup file. The caller must restart the app
/// afterwards; the webview still holds the pre-restore data.
#[tauri::command]
fn data_restore(state: State<'_, Store>, path: String) -> Result<(), String> {
    state.restore_from(std::path::Path::new(&path))
}

/// Restarts the process. Used after a restore, where every in-memory page still
/// describes the store that was just replaced.
#[tauri::command]
fn app_restart(app: tauri::AppHandle) {
    app.restart()
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
fn attempt_recent(
    state: State<'_, Store>,
    workspace_id: String,
    limit: Option<i64>,
) -> Result<Vec<StoredAttempt>, String> {
    state.recent_attempts(&workspace_id, limit.unwrap_or(20))
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
fn attempt_set_error_type(
    state: State<'_, Store>,
    workspace_id: String,
    attempt_id: String,
    error_type: String,
) -> Result<(), String> {
    state.set_error_type(&workspace_id, &attempt_id, &error_type)
}

#[tauri::command]
fn evidence_list(
    state: State<'_, Store>,
    workspace_id: String,
) -> Result<Vec<PointEvidence>, String> {
    state.evidence(&workspace_id)
}

#[tauri::command]
fn evidence_set(
    state: State<'_, Store>,
    workspace_id: String,
    point_id: String,
    state_name: String,
    note: Option<String>,
) -> Result<(), String> {
    state.set_evidence(&workspace_id, &point_id, &state_name, &note.unwrap_or_default())
}

#[tauri::command]
fn evidence_clear(
    state: State<'_, Store>,
    workspace_id: String,
    point_id: String,
) -> Result<(), String> {
    state.clear_evidence(&workspace_id, &point_id)
}

#[tauri::command]
fn goal_load(state: State<'_, Store>, workspace_id: String) -> Result<Option<StudyGoal>, String> {
    state.goal(&workspace_id)
}

#[tauri::command]
fn goal_save(
    state: State<'_, Store>,
    workspace_id: String,
    goal: StudyGoal,
) -> Result<(), String> {
    state.save_goal(&workspace_id, &goal)
}

#[tauri::command]
fn attempt_trend(
    state: State<'_, Store>,
    workspace_id: String,
    days: Option<i64>,
) -> Result<Vec<TrendPoint>, String> {
    state.attempt_trend(&workspace_id, days.unwrap_or(14))
}

#[tauri::command]
fn exam_start(
    state: State<'_, Store>,
    workspace_id: String,
    question_ids: Vec<String>,
    duration: i64,
) -> Result<ExamRun, String> {
    state.start_exam(&workspace_id, &question_ids, duration)
}

#[tauri::command]
fn exam_save(
    state: State<'_, Store>,
    id: String,
    answers: std::collections::BTreeMap<String, String>,
) -> Result<(), String> {
    state.save_exam(&id, &answers)
}

#[tauri::command]
fn exam_submit(
    state: State<'_, Store>,
    id: String,
    answers: std::collections::BTreeMap<String, String>,
    score: i64,
) -> Result<ExamRun, String> {
    state.submit_exam(&id, &answers, score)
}

#[tauri::command]
fn exam_grade(
    state: State<'_, Store>,
    id: String,
    marks: std::collections::BTreeMap<String, bool>,
    score: i64,
) -> Result<ExamRun, String> {
    state.grade_exam(&id, &marks, score)
}

#[tauri::command]
fn exam_list(
    state: State<'_, Store>,
    workspace_id: String,
    limit: Option<i64>,
) -> Result<Vec<ExamRun>, String> {
    state.exams(&workspace_id, limit.unwrap_or(20))
}

#[tauri::command]
fn exam_load(state: State<'_, Store>, id: String) -> Result<Option<ExamRun>, String> {
    state.exam(&id)
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
    let report = package::inspect(std::path::Path::new(&path), &staging, &packages);
    if !matches!(&report, Ok(report) if report.Ok) {
        // A failed inspection must not leave a half-extracted tree behind.
        let _ = std::fs::remove_dir_all(&staging);
    }
    report
}

/// The package id of a staged tree, read before anything is installed.
///
/// A workspace can refuse an update, and that decision has to be made before
/// `package::install` moves the new tree into place — afterwards the old
/// content is already gone.
fn staged_package_id(staging: &std::path::Path) -> Result<String, String> {
    let raw = std::fs::read_to_string(staging.join("manifest.yaml"))
        .map_err(|error| format!("无法读取 manifest.yaml：{error}"))?;
    let manifest: package::manifest::PackageManifest =
        serde_yaml::from_str(&raw).map_err(|error| format!("manifest 解析失败：{error}"))?;
    Ok(manifest.Package.Id)
}

#[tauri::command]
fn package_install(
    app: tauri::AppHandle,
    state: State<'_, Store>,
    staging: String,
    update: bool,
) -> Result<Workspace, String> {
    let packages = packages_dir(&app)?;

    // A locked workspace keeps its content until the learner unlocks it. The
    // check happens before anything is moved, so a refused update leaves the
    // installed tree exactly as it was.
    let guarded = if update {
        state.workspace_for_package(&staged_package_id(std::path::Path::new(&staging))?)?
    } else {
        None
    };
    if let Some(workspace) = &guarded {
        if workspace.VersionPolicy == store::POLICY_LOCKED && !workspace.Orphaned {
            // The staged copy is spent: leaving it behind would make the next
            // import collide with a tree nobody is going to install.
            let _ = std::fs::remove_dir_all(&staging);
            return Err(format!(
                "「{}」已锁定在 v{}，请先在书架解锁后再更新",
                workspace.Name, workspace.PackageVersion
            ));
        }
    }

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

/// Whether this workspace takes newer versions of its package. Separate from
/// install so a learner can lock the version without reimporting anything.
#[tauri::command]
fn workspace_set_policy(
    state: State<'_, Store>,
    workspace_id: String,
    policy: String,
) -> Result<Workspace, String> {
    state.set_version_policy(&workspace_id, &policy)
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

/// Covers are the only file a package can hand back as raw bytes, so the
/// extension is an allowlist rather than a guess: anything else would let a
/// caller read arbitrary package files through this command.
const COVER_MIME: [(&str, &str); 5] = [
    (".png", "image/png"),
    (".jpg", "image/jpeg"),
    (".jpeg", "image/jpeg"),
    (".webp", "image/webp"),
    (".avif", "image/avif"),
];

/// A cover is a thumbnail, not a payload: anything bigger is a mistake in the
/// package and would only bloat the base64 reply.
const COVER_MAX_BYTES: u64 = 8 * 1024 * 1024;

/// Resolves the MIME type for a cover path, or rejects the file. Kept separate
/// from the command so the allowlist can be tested without a Tauri app handle.
fn cover_mime(cover_path: &str) -> Result<&'static str, String> {
    let lower = cover_path.to_ascii_lowercase();
    COVER_MIME
        .iter()
        .find(|(extension, _)| lower.ends_with(extension))
        .map(|(_, mime)| *mime)
        .ok_or_else(|| "封面必须是 png、jpg、webp 或 avif 图片".to_string())
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

    let mime = cover_mime(&cover_path)?;

    let root = std::path::Path::new(&workspace.RootPath);
    let full = package::paths::safe_join(root, &cover_path)?;
    let size = std::fs::metadata(&full)
        .map_err(|error| format!("无法读取封面：{error}"))?
        .len();
    if size > COVER_MAX_BYTES {
        return Err(format!(
            "封面超过 {} MB",
            COVER_MAX_BYTES / 1024 / 1024
        ));
    }

    let bytes = std::fs::read(&full).map_err(|error| format!("无法读取封面：{error}"))?;
    Ok(format!("data:{mime};base64,{}", base64(&bytes)))
}

/// Figures inside a package are referenced from the Markdown body as `media/…`.
/// The reader did not choose that path, so only that one directory is reachable
/// and only image extensions are served — the same reasoning as the cover.
const MEDIA_PREFIX: &str = "media/";
const MEDIA_MAX_BYTES: u64 = 12 * 1024 * 1024;

/// The guard is a function so it can be tested without a Tauri app handle.
fn is_media_path(path: &str) -> bool {
    path.starts_with(MEDIA_PREFIX) && !path.contains("..") && !path.contains('\\')
}

/// Reads one figure out of an installed workspace as a data URI.
#[tauri::command]
fn package_media_data(
    state: State<'_, Store>,
    workspace_id: String,
    path: String,
) -> Result<String, String> {
    if !is_media_path(&path) {
        return Err("只能读取学习包 media/ 下的图片".to_string());
    }
    let mime = cover_mime(&path)?;

    let workspace = state
        .workspace(&workspace_id)?
        .ok_or_else(|| "学习包不存在".to_string())?;
    if workspace.Orphaned || workspace.RootPath.is_empty() {
        return Err("学习包内容已被移除".to_string());
    }

    let root = std::path::Path::new(&workspace.RootPath);
    let full = package::paths::safe_join(root, &path)?;
    let size = std::fs::metadata(&full)
        .map_err(|error| format!("无法读取图片：{error}"))?
        .len();
    if size > MEDIA_MAX_BYTES {
        return Err(format!(
            "图片超过 {} MB",
            MEDIA_MAX_BYTES / 1024 / 1024
        ));
    }

    let bytes = std::fs::read(&full).map_err(|error| format!("无法读取图片：{error}"))?;
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

#[cfg(test)]
mod cover_tests {
    use super::{cover_mime, is_media_path, COVER_MAX_BYTES, MEDIA_MAX_BYTES};

    #[test]
    fn only_image_extensions_are_accepted() {
        assert_eq!(cover_mime("media/covers/a.png").ok(), Some("image/png"));
        assert_eq!(cover_mime("media/covers/a.JPG").ok(), Some("image/jpeg"));
        assert_eq!(cover_mime("media/covers/a.webp").ok(), Some("image/webp"));
        assert_eq!(cover_mime("media/covers/a.avif").ok(), Some("image/avif"));
        // A manifest is not a picture, and neither is a bare name.
        assert!(cover_mime("manifest.yaml").is_err());
        assert!(cover_mime("knowledge/index.yaml").is_err());
        assert!(cover_mime("media/covers/cover").is_err());
    }

    #[test]
    fn the_size_cap_is_a_sane_thumbnail_limit() {
        assert!(COVER_MAX_BYTES >= 1024 * 1024);
        assert!(COVER_MAX_BYTES <= 32 * 1024 * 1024);
        // A figure may be a full page scan, so it gets a larger cap than a cover.
        assert!(MEDIA_MAX_BYTES >= COVER_MAX_BYTES);
    }

    #[test]
    fn figures_are_confined_to_the_media_directory() {
        assert!(is_media_path("media/figures/ch01/a.png"));
        // Anything outside `media/` is not a figure, however it is spelled.
        assert!(!is_media_path("knowledge/index.yaml"));
        assert!(!is_media_path("manifest.yaml"));
        assert!(!is_media_path("media/../manifest.yaml"));
        assert!(!is_media_path("media\\figures\\a.png"));
        assert!(!is_media_path("/media/a.png"));
    }
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
            search_save_key,
            search_load_key,
            search_key_status,
            search_web,
            fetch_page,
            deepseek_balance,
            deepseek_sign_in,
            deepseek_key_plan,
            deepseek_connect_key,
            deepseek_sign_out,
            chat_append,
            chat_messages,
            chat_conversations,
            chat_delete,
            chat_rename,
            chat_discard_empty,
            chat_delete_message,
            chat_truncate,
            chat_reset,
            data_reset,
            data_stats,
            data_backup,
            data_restore,
            app_restart,
            attempt_record,
            attempt_wrong_list,
            attempt_recent,
            attempt_forget,
            attempt_point_stats,
            attempt_set_error_type,
            evidence_list,
            evidence_set,
            evidence_clear,
            goal_load,
            goal_save,
            attempt_trend,
            exam_start,
            exam_save,
            exam_submit,
            exam_grade,
            exam_list,
            exam_load,
            prefs_load,
            prefs_save,
            ui_state_load,
            ui_state_save,
            package_inspect,
            package_install,
            package_cancel,
            package_export,
            package_cover_data,
            package_media_data,
            workspace_list,
            workspace_content,
            workspace_touch,
            workspace_set_policy,
            workspace_remove,
            open_external_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running Morrow Agent");
}
