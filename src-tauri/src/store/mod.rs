use std::path::Path;
use std::sync::Mutex;

use rusqlite::{params, Connection};

pub mod attempts;
pub mod messages;
pub mod migrations;
pub mod stats;
pub mod types;
pub mod workspaces;

pub use attempts::{PointStats, StoredAttempt};
pub use types::{
    ConversationSummary, MessageAttachment, NewAttempt, NewMessage, StoreStats, StoredMessage,
};
pub use workspaces::{NewWorkspace, Workspace};

/// The database handle shared by every command. SQLite serialises writes
/// anyway, and the app has one window, so a single connection behind a mutex is
/// simpler than a pool and never blocks on contention in practice.
pub struct Store {
    pub Connection: Mutex<Connection>,
    pub Path: std::path::PathBuf,
}

fn now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as i64)
        .unwrap_or(0)
}

/// Attachments go into a text column as JSON. A malformed blob reads back as
/// "no attachments" rather than failing the whole transcript: a lost thumbnail
/// must not cost the user their conversation.
fn attachments_json(attachments: &[MessageAttachment]) -> String {
    if attachments.is_empty() {
        return "[]".to_string();
    }
    serde_json::to_string(attachments).unwrap_or_else(|_| "[]".to_string())
}

fn parse_attachments(raw: String) -> Vec<MessageAttachment> {
    serde_json::from_str(&raw).unwrap_or_default()
}

pub fn open(path: &Path) -> Result<Store, String> {
    let connection = Connection::open(path).map_err(|error| format!("打开数据库失败：{}", error))?;

    // WAL keeps a long read from blocking the next write, and the foreign keys
    // pragma is off by default in SQLite, which would silently orphan turns.
    connection
        .execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
        .map_err(|error| format!("初始化数据库失败：{}", error))?;

    migrate(&connection)?;

    Ok(Store {
        Connection: Mutex::new(connection),
        Path: path.to_path_buf(),
    })
}

fn migrate(connection: &Connection) -> Result<(), String> {
    let version: i64 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| format!("读取版本失败：{}", error))?;

    let applied = version.max(0) as usize;

    for (index, migration) in migrations::MIGRATIONS.iter().enumerate().skip(applied) {
        connection
            .execute_batch(migration)
            .map_err(|error| format!("迁移 {} 失败：{}", index + 1, error))?;
        // Interpolating the index is safe: it comes from our own array.
        connection
            .execute_batch(&format!("PRAGMA user_version = {}", index + 1))
            .map_err(|error| format!("记录版本失败：{}", error))?;
    }

    Ok(())
}

impl Store {
    fn lock(&self) -> Result<std::sync::MutexGuard<'_, Connection>, String> {
        self.Connection
            .lock()
            .map_err(|_| "数据库连接已失效".to_string())
    }

    /// Append one turn, creating its conversation on first write. Returning the
    /// stored row keeps the caller from guessing what the database assigned.
    ///
    /// `workspace_id` keeps two learning packages apart: the same question
    /// asked in calculus and in linear algebra are different transcripts, not
    /// two rows in one list (MLPS §1.2).
    pub fn append(
        &self,
        conversation_id: &str,
        workspace_id: &str,
        message: NewMessage,
    ) -> Result<StoredMessage, String> {
        let connection = self.lock()?;
        let created_at = message.CreatedAt.unwrap_or_else(now);

        connection
            .execute(
                "INSERT INTO conversations (id, title, created_at, updated_at, workspace_id)
                 VALUES (?1, '', ?2, ?2, ?3)
                 ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at",
                params![conversation_id, created_at, workspace_id],
            )
            .map_err(|error| format!("写入会话失败：{}", error))?;

        let seq: i64 = connection
            .query_row(
                "SELECT COALESCE(MAX(seq), 0) + 1 FROM messages WHERE conversation_id = ?1",
                params![conversation_id],
                |row| row.get(0),
            )
            .map_err(|error| format!("读取序号失败：{}", error))?;

        connection
            .execute(
                "INSERT INTO messages
                   (id, conversation_id, seq, role, content, created_at, attachments)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    message.Id,
                    conversation_id,
                    seq,
                    message.Role,
                    message.Content,
                    created_at,
                    attachments_json(&message.Attachments)
                ],
            )
            .map_err(|error| format!("写入消息失败：{}", error))?;

        // The first user turn doubles as the conversation title, which is what
        // a history list is actually useful for.
        if message.Role == "user" {
            connection
                .execute(
                    "UPDATE conversations SET title = ?1
                     WHERE id = ?2 AND title = ''",
                    params![message.Content.chars().take(40).collect::<String>(), conversation_id],
                )
                .map_err(|error| format!("更新标题失败：{}", error))?;
        }

        Ok(StoredMessage {
            Id: message.Id,
            ConversationId: conversation_id.to_string(),
            Role: message.Role,
            Content: message.Content,
            CreatedAt: created_at,
            Attachments: message.Attachments,
        })
    }

    pub fn messages(&self, conversation_id: &str) -> Result<Vec<StoredMessage>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT id, conversation_id, role, content, created_at, attachments
                 FROM messages WHERE conversation_id = ?1 ORDER BY seq ASC",
            )
            .map_err(|error| format!("查询消息失败：{}", error))?;

        let rows = statement
            .query_map(params![conversation_id], |row| {
                Ok(StoredMessage {
                    Id: row.get(0)?,
                    ConversationId: row.get(1)?,
                    Role: row.get(2)?,
                    Content: row.get(3)?,
                    CreatedAt: row.get(4)?,
                    Attachments: parse_attachments(row.get::<_, String>(5)?),
                })
            })
            .map_err(|error| format!("读取消息失败：{}", error))?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("解析消息失败：{}", error))
    }

    /// Conversations in one workspace. An orphaned workspace still lists its
    /// own history, which is the point of orphaning rather than deleting.
    pub fn conversations(
        &self,
        workspace_id: &str,
        limit: i64,
    ) -> Result<Vec<ConversationSummary>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT id, title, updated_at FROM conversations
                 WHERE workspace_id = ?1
                 ORDER BY updated_at DESC LIMIT ?2",
            )
            .map_err(|error| format!("查询会话失败：{}", error))?;

        let rows = statement
            .query_map(params![workspace_id, limit], |row| {
                Ok(ConversationSummary {
                    Id: row.get(0)?,
                    Title: row.get(1)?,
                    UpdatedAt: row.get(2)?,
                })
            })
            .map_err(|error| format!("读取会话失败：{}", error))?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("解析会话失败：{}", error))
    }

    pub fn delete_conversation(&self, conversation_id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute(
                "DELETE FROM conversations WHERE id = ?1",
                params![conversation_id],
            )
            .map_err(|error| format!("删除会话失败：{}", error))?;
        Ok(())
    }

    /// Renames a conversation. A blank title is rejected rather than stored: an
    /// unnamed row is indistinguishable from a failed one in the history list.
    pub fn rename_conversation(&self, conversation_id: &str, title: &str) -> Result<(), String> {
        let trimmed = title.trim();
        if trimmed.is_empty() {
            return Err("会话标题不能为空".to_string());
        }

        let connection = self.lock()?;
        let changed = connection
            .execute(
                "UPDATE conversations SET title = ?1 WHERE id = ?2",
                params![trimmed, conversation_id],
            )
            .map_err(|error| format!("重命名会话失败：{}", error))?;

        if changed == 0 {
            return Err("会话不存在".to_string());
        }
        Ok(())
    }

    /// Drops a conversation that never received a turn. Creating an id before
    /// the first send leaves an empty row behind when the user changes their
    /// mind, and an empty row in a history list is just noise.
    pub fn discard_empty_conversation(&self, conversation_id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute(
                "DELETE FROM conversations
                 WHERE id = ?1
                   AND NOT EXISTS (
                     SELECT 1 FROM messages WHERE conversation_id = ?1
                   )",
                params![conversation_id],
            )
            .map_err(|error| format!("清理空会话失败：{}", error))?;
        Ok(())
    }

    pub fn touch_conversation(&self, conversation_id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute(
                "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
                params![now(), conversation_id],
            )
            .map_err(|error| format!("更新会话时间失败：{}", error))?;
        Ok(())
    }

    /// Wipes conversations and attempts in one workspace; credentials live
    /// outside the database. Other packages keep their history.
    pub fn reset(&self, workspace_id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        // Messages hang off conversations by foreign key, so they go with them;
        // deleting them first keeps the cascade from depending on the pragma.
        connection
            .execute(
                "DELETE FROM messages WHERE conversation_id IN
                   (SELECT id FROM conversations WHERE workspace_id = ?1)",
                params![workspace_id],
            )
            .map_err(|error| format!("清空消息失败：{}", error))?;
        connection
            .execute(
                "DELETE FROM conversations WHERE workspace_id = ?1",
                params![workspace_id],
            )
            .map_err(|error| format!("清空会话失败：{}", error))?;
        connection
            .execute(
                "DELETE FROM answer_attempts WHERE workspace_id = ?1",
                params![workspace_id],
            )
            .map(|_| ())
            .map_err(|error| format!("清空作答失败：{}", error))
    }

    /// Wipes every workspace's history at once. The shelf rows survive: this
    /// clears study data, not installed packages.
    pub fn reset_all(&self) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute("DELETE FROM messages", [])
            .map_err(|error| format!("清空消息失败：{}", error))?;
        connection
            .execute("DELETE FROM conversations", [])
            .map_err(|error| format!("清空会话失败：{}", error))?;
        connection
            .execute("DELETE FROM answer_attempts", [])
            .map(|_| ())
            .map_err(|error| format!("清空作答失败：{}", error))
    }
}

#[cfg(test)]
mod tests {
    use super::{open, MessageAttachment, NewMessage};
    use std::sync::atomic::{AtomicU32, Ordering};

    // Each test gets its own file: the pid alone would let two tests in the
    // same process share one database and see each other's rows.
    fn temp_store() -> (std::path::PathBuf, super::Store) {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        let slot = COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "morrow-test-{}-{}.db",
            std::process::id(),
            slot
        ));
        let _ = std::fs::remove_file(&path);
        let store = open(&path).expect("database opens");
        (path, store)
    }

    fn message(id: &str, role: &str, content: &str) -> NewMessage {
        NewMessage {
            Id: id.to_string(),
            Role: role.to_string(),
            Content: content.to_string(),
            CreatedAt: Some(1_700_000_000_000),
            Attachments: Vec::new(),
        }
    }

    #[test]
    fn appends_turns_in_order_and_titles_the_conversation() {
        let (path, store) = temp_store();

        store
            .append("c1", "w1", message("m1", "user", "极限怎么算"))
            .expect("first turn");
        store
            .append("c1", "w1", message("m2", "assistant", "先看定义"))
            .expect("second turn");

        let stored = store.messages("c1").expect("messages load");
        assert_eq!(stored.len(), 2);
        assert_eq!(stored[0].Role, "user");
        assert_eq!(stored[1].Content, "先看定义");

        let conversations = store.conversations("w1", 10).expect("conversations load");
        assert_eq!(conversations.len(), 1);
        assert_eq!(conversations[0].Title, "极限怎么算");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn deleting_a_conversation_removes_its_turns() {
        let (path, store) = temp_store();

        store
            .append("c1", "w1", message("m1", "user", "hello"))
            .expect("turn");
        store.delete_conversation("c1").expect("delete");

        assert!(store.messages("c1").expect("messages load").is_empty());
        assert!(store.conversations("w1", 10).expect("load").is_empty());

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn renaming_rejects_a_blank_title_and_keeps_the_old_one() {
        let (path, store) = temp_store();

        store
            .append("c1", "w1", message("m1", "user", "极限怎么算"))
            .expect("turn");
        assert!(store.rename_conversation("c1", "   ").is_err());
        assert_eq!(
            store.conversations("w1", 10).expect("load")[0].Title,
            "极限怎么算"
        );

        store.rename_conversation("c1", "第一章复习").expect("rename");
        assert_eq!(
            store.conversations("w1", 10).expect("load")[0].Title,
            "第一章复习"
        );

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn discarding_an_empty_conversation_leaves_a_used_one_alone() {
        let (path, store) = temp_store();

        store
            .append("used", "w1", message("m1", "user", "hello"))
            .expect("turn");
        store
            .discard_empty_conversation("unused")
            .expect("discard empty");
        store
            .discard_empty_conversation("used")
            .expect("discard used");

        let conversations = store.conversations("w1", 10).expect("load");
        assert_eq!(conversations.len(), 1);
        assert_eq!(conversations[0].Id, "used");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn attachments_survive_a_reload() {
        let (path, store) = temp_store();

        store
            .append(
                "c1",
                "w1",
                NewMessage {
                    Id: "m1".to_string(),
                    Role: "user".to_string(),
                    Content: "这道题怎么做".to_string(),
                    CreatedAt: Some(1_700_000_000_000),
                    Attachments: vec![
                        MessageAttachment {
                            Id: "a1".to_string(),
                            Kind: "image".to_string(),
                            Name: "page.png".to_string(),
                            MimeType: "image/png".to_string(),
                            Size: 1234,
                            Data: "aGVsbG8=".to_string(),
                            Text: String::new(),
                        },
                        MessageAttachment {
                            Id: "a2".to_string(),
                            Kind: "document".to_string(),
                            Name: "notes.md".to_string(),
                            MimeType: "text/markdown".to_string(),
                            Size: 20,
                            Data: String::new(),
                            Text: "导数定义".to_string(),
                        },
                    ],
                },
            )
            .expect("append");

        let stored = store.messages("c1").expect("messages load");
        let attachments = &stored[0].Attachments;
        assert_eq!(attachments.len(), 2);
        assert_eq!(attachments[0].Kind, "image");
        assert_eq!(attachments[0].MimeType, "image/png");
        assert_eq!(attachments[0].Data, "aGVsbG8=");
        assert_eq!(attachments[1].Text, "导数定义");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn a_turn_without_attachments_reads_back_empty() {
        let (path, store) = temp_store();
        store
            .append("c1", "w1", message("m1", "user", "hello"))
            .expect("append");

        assert!(store.messages("c1").expect("load")[0].Attachments.is_empty());

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn opening_a_version_one_database_applies_the_rest() {
        // Build a database that only knows migration 1, the shape shipped
        // before attempts and workspaces existed, and mark it as such. It has
        // to be its own file: `open` would otherwise have created the full
        // schema first, and the later `ALTER TABLE` steps would see columns
        // they had already added.
        let path = std::env::temp_dir().join(format!(
            "morrow-legacy-{}-{}.db",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|elapsed| elapsed.as_nanos())
                .unwrap_or(0)
        ));
        let _ = std::fs::remove_file(&path);
        {
            let connection = rusqlite::Connection::open(&path).expect("open");
            connection
                .execute_batch(super::migrations::MIGRATIONS[0])
                .expect("v1 schema");
            connection
                .execute_batch("PRAGMA user_version = 1")
                .expect("version");
        }

        let store = open(&path).expect("reopen migrates");
        assert_eq!(store.stats().expect("stats").Attempts, 0);
        assert!(store.workspaces().expect("workspaces").is_empty());

        let version: i64 = store
            .lock()
            .expect("lock")
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("read version");
        assert_eq!(version, super::migrations::MIGRATIONS.len() as i64);

        let _ = std::fs::remove_file(path);
    }
}
