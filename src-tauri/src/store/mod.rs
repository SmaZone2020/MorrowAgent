use std::path::Path;
use std::sync::Mutex;

use rusqlite::{params, Connection};

pub mod attempts;
pub mod migrations;
pub mod types;

pub use attempts::StoredAttempt;
pub use types::{ConversationSummary, NewAttempt, NewMessage, StoreStats, StoredMessage};

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
    pub fn append(&self, conversation_id: &str, message: NewMessage) -> Result<StoredMessage, String> {
        let connection = self.lock()?;
        let created_at = message.CreatedAt.unwrap_or_else(now);

        connection
            .execute(
                "INSERT INTO conversations (id, title, created_at, updated_at)
                 VALUES (?1, '', ?2, ?2)
                 ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at",
                params![conversation_id, created_at],
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
                "INSERT INTO messages (id, conversation_id, seq, role, content, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    message.Id,
                    conversation_id,
                    seq,
                    message.Role,
                    message.Content,
                    created_at
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
        })
    }

    pub fn messages(&self, conversation_id: &str) -> Result<Vec<StoredMessage>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT id, conversation_id, role, content, created_at
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
                })
            })
            .map_err(|error| format!("读取消息失败：{}", error))?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("解析消息失败：{}", error))
    }

    pub fn conversations(&self, limit: i64) -> Result<Vec<ConversationSummary>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT id, title, updated_at FROM conversations
                 ORDER BY updated_at DESC LIMIT ?1",
            )
            .map_err(|error| format!("查询会话失败：{}", error))?;

        let rows = statement
            .query_map(params![limit], |row| {
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

    /// Wipes conversations and attempts; credentials live outside the database.
    pub fn reset(&self) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute_batch(
                "DELETE FROM messages; DELETE FROM conversations; DELETE FROM answer_attempts;",
            )
            .map_err(|error| format!("清空数据失败：{}", error))
    }

    pub fn stats(&self) -> Result<StoreStats, String> {
        let (conversations, messages, attempts, correct_attempts, attempted_points) = {
            let connection = self.lock()?;
            let conversations: i64 = connection
                .query_row("SELECT COUNT(*) FROM conversations", [], |row| row.get(0))
                .map_err(|error| format!("统计会话失败：{}", error))?;
            let messages: i64 = connection
                .query_row("SELECT COUNT(*) FROM messages", [], |row| row.get(0))
                .map_err(|error| format!("统计消息失败：{}", error))?;
            let attempts: i64 = connection
                .query_row("SELECT COUNT(*) FROM answer_attempts", [], |row| row.get(0))
                .map_err(|error| format!("统计作答失败：{}", error))?;
            let correct_attempts: i64 = connection
                .query_row(
                    "SELECT COUNT(*) FROM answer_attempts WHERE is_correct = 1",
                    [],
                    |row| row.get(0),
                )
                .map_err(|error| format!("统计正确作答失败：{}", error))?;
            let attempted_points: i64 = connection
                .query_row(
                    "SELECT COUNT(DISTINCT knowledge_point_id) FROM answer_attempts
                     WHERE knowledge_point_id <> ''",
                    [],
                    |row| row.get(0),
                )
                .map_err(|error| format!("统计已作答知识点失败：{}", error))?;
            (
                conversations,
                messages,
                attempts,
                correct_attempts,
                attempted_points,
            )
        };

        // WAL keeps recent writes in a sidecar, so the page count alone would
        // understate what the user sees on disk.
        let size_bytes = std::fs::metadata(&self.Path)
            .map(|meta| meta.len())
            .unwrap_or(0)
            + std::fs::metadata(self.Path.with_extension("db-wal"))
                .map(|meta| meta.len())
                .unwrap_or(0);

        Ok(StoreStats {
            Path: self.Path.to_string_lossy().to_string(),
            SizeBytes: size_bytes,
            Conversations: conversations,
            Messages: messages,
            Attempts: attempts,
            CorrectAttempts: correct_attempts,
            AttemptedPoints: attempted_points,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{open, NewMessage};
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
        }
    }

    #[test]
    fn appends_turns_in_order_and_titles_the_conversation() {
        let (path, store) = temp_store();

        store
            .append("c1", message("m1", "user", "极限怎么算"))
            .expect("first turn");
        store
            .append("c1", message("m2", "assistant", "先看定义"))
            .expect("second turn");

        let stored = store.messages("c1").expect("messages load");
        assert_eq!(stored.len(), 2);
        assert_eq!(stored[0].Role, "user");
        assert_eq!(stored[1].Content, "先看定义");

        let conversations = store.conversations(10).expect("conversations load");
        assert_eq!(conversations.len(), 1);
        assert_eq!(conversations[0].Title, "极限怎么算");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn deleting_a_conversation_removes_its_turns() {
        let (path, store) = temp_store();

        store
            .append("c1", message("m1", "user", "hello"))
            .expect("turn");
        store.delete_conversation("c1").expect("delete");

        assert!(store.messages("c1").expect("messages load").is_empty());
        assert!(store.conversations(10).expect("load").is_empty());

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn opening_a_version_one_database_applies_the_rest() {
        let (path, _) = temp_store();
        {
            // Build a database that only knows migration 1, the shape shipped
            // before attempts existed, and mark it as such.
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

        let version: i64 = store
            .lock()
            .expect("lock")
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("read version");
        assert_eq!(version, super::migrations::MIGRATIONS.len() as i64);

        let _ = std::fs::remove_file(path);
    }
}
