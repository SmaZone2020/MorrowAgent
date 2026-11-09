use super::{Store, StoreStats};

impl Store {
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

        // WAL keeps recent writes in a sidecar, so the main file alone would
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
