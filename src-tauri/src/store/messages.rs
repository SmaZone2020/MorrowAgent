use rusqlite::params;

use super::Store;

/// The title the first write derives from the opening question.
fn auto_title(content: &str) -> String {
    content.chars().take(40).collect()
}

/// The opening user turn, captured before a delete so the title can be repaired.
fn opening_turn(
    connection: &rusqlite::Connection,
    conversation_id: &str,
) -> Option<(String, i64, String)> {
    connection
        .query_row(
            "SELECT id, seq, content FROM messages
             WHERE conversation_id = ?1 AND role = 'user'
             ORDER BY seq ASC LIMIT 1",
            params![conversation_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .ok()
}

/// Keeps the history list honest after a delete.
///
/// The title is derived from the opening question, so removing that question
/// would otherwise leave the list naming text the transcript no longer holds.
/// A hand-written title is left alone: it is only replaced while it still
/// matches the question that was just removed.
fn retitle_if_opening_was_removed(
    connection: &rusqlite::Connection,
    conversation_id: &str,
    opening: Option<(String, i64, String)>,
) -> Result<(), String> {
    let Some((opening_id, _, opening_content)) = opening else {
        return Ok(());
    };

    let still_there: bool = connection
        .query_row(
            "SELECT 1 FROM messages WHERE id = ?1",
            params![opening_id],
            |_| Ok(()),
        )
        .is_ok();
    if still_there {
        return Ok(());
    }

    let title: String = connection
        .query_row(
            "SELECT title FROM conversations WHERE id = ?1",
            params![conversation_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("读取会话失败：{}", error))?;
    if title != auto_title(&opening_content) {
        return Ok(());
    }

    let replacement: Option<String> = connection
        .query_row(
            "SELECT content FROM messages
             WHERE conversation_id = ?1 AND role = 'user'
             ORDER BY seq ASC LIMIT 1",
            params![conversation_id],
            |row| row.get(0),
        )
        .ok();

    connection
        .execute(
            "UPDATE conversations SET title = ?1 WHERE id = ?2",
            params![
                replacement.map(|content| auto_title(&content)).unwrap_or_default(),
                conversation_id
            ],
        )
        .map_err(|error| format!("重置标题失败：{}", error))?;
    Ok(())
}

impl Store {
    /// Removes one turn, leaving its neighbours in place.
    pub fn delete_message(&self, message_id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        let target: Option<(String, String)> = connection
            .query_row(
                "SELECT conversation_id, role FROM messages WHERE id = ?1",
                params![message_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .ok();

        // Already gone, so the caller's intent is satisfied; a reload that beat
        // the click must not turn into an error on screen.
        let Some((conversation_id, _)) = target else {
            return Ok(());
        };

        let opening = opening_turn(&connection, &conversation_id);
        connection
            .execute("DELETE FROM messages WHERE id = ?1", params![message_id])
            .map_err(|error| format!("删除消息失败：{}", error))?;
        retitle_if_opening_was_removed(&connection, &conversation_id, opening)
    }

    /// Drops one turn and everything after it. An edit rewrites the question, so
    /// the answers to the old wording cannot stay: they reply to text that is no
    /// longer there.
    pub fn truncate_from(&self, conversation_id: &str, message_id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        let seq: Option<i64> = connection
            .query_row(
                "SELECT seq FROM messages WHERE id = ?1 AND conversation_id = ?2",
                params![message_id, conversation_id],
                |row| row.get(0),
            )
            .ok();

        let Some(seq) = seq else {
            return Ok(());
        };

        let opening = opening_turn(&connection, conversation_id);
        connection
            .execute(
                "DELETE FROM messages WHERE conversation_id = ?1 AND seq >= ?2",
                params![conversation_id, seq],
            )
            .map_err(|error| format!("截断会话失败：{}", error))?;
        retitle_if_opening_was_removed(&connection, conversation_id, opening)
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicU32, Ordering};

    use super::super::{open, NewMessage};

    fn temp_store() -> (std::path::PathBuf, super::Store) {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        let slot = COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "morrow-messages-{}-{}.db",
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

    fn seeded() -> (std::path::PathBuf, super::Store) {
        let (path, store) = temp_store();
        store
            .append("c1", "w1", message("m1", "user", "极限怎么算"))
            .expect("m1");
        store
            .append("c1", "w1", message("m2", "assistant", "先看定义"))
            .expect("m2");
        store
            .append("c1", "w1", message("m3", "user", "然后呢"))
            .expect("m3");
        (path, store)
    }

    #[test]
    fn deleting_one_message_keeps_its_neighbours() {
        let (path, store) = seeded();

        store.delete_message("m2").expect("delete");

        let stored = store.messages("c1").expect("messages load");
        assert_eq!(stored.len(), 2);
        assert_eq!(stored[0].Id, "m1");
        assert_eq!(stored[1].Id, "m3");
        // The opening question is intact, so the title still names it.
        assert_eq!(store.conversations("w1", 10).expect("load")[0].Title, "极限怎么算");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn deleting_the_opening_question_retitles_the_conversation() {
        let (path, store) = seeded();

        store.delete_message("m1").expect("delete");

        let stored = store.messages("c1").expect("messages load");
        assert_eq!(stored.len(), 2);
        assert_eq!(store.conversations("w1", 10).expect("load")[0].Title, "然后呢");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn deleting_every_turn_clears_the_title() {
        let (path, store) = seeded();

        store.delete_message("m1").expect("m1");
        store.delete_message("m2").expect("m2");
        store.delete_message("m3").expect("m3");

        assert!(store.messages("c1").expect("messages load").is_empty());
        assert_eq!(store.conversations("w1", 10).expect("load")[0].Title, "");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn deleting_a_missing_message_is_not_an_error() {
        let (path, store) = seeded();
        store.delete_message("gone").expect("no-op");
        assert_eq!(store.messages("c1").expect("messages load").len(), 3);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn truncating_from_a_reply_drops_the_turns_after_it() {
        let (path, store) = seeded();

        store.truncate_from("c1", "m2").expect("truncate");

        let stored = store.messages("c1").expect("messages load");
        assert_eq!(stored.len(), 1);
        assert_eq!(stored[0].Id, "m1");
        assert_eq!(store.conversations("w1", 10).expect("load")[0].Title, "极限怎么算");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn truncating_the_opening_question_clears_the_old_title() {
        let (path, store) = seeded();

        store.truncate_from("c1", "m1").expect("truncate");

        assert!(store.messages("c1").expect("messages load").is_empty());
        assert_eq!(store.conversations("w1", 10).expect("load")[0].Title, "");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn a_manual_title_survives_deleting_the_opening_question() {
        let (path, store) = seeded();
        store.rename_conversation("c1", "第一章复习").expect("rename");

        store.delete_message("m1").expect("delete");

        assert_eq!(store.conversations("w1", 10).expect("load")[0].Title, "第一章复习");

        let _ = std::fs::remove_file(path);
    }
}
