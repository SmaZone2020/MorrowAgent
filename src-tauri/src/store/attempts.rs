use rusqlite::params;
use serde::Serialize;

use super::{now, NewAttempt, Store};

/// Per knowledge point tallies, which is what the profile view ranks.
#[derive(Debug, Clone, Serialize)]
pub struct PointStats {
    #[serde(rename = "knowledgePointId")]
    pub KnowledgePointId: String,
    #[serde(rename = "attempts")]
    pub Attempts: i64,
    #[serde(rename = "correct")]
    pub Correct: i64,
    #[serde(rename = "lastAttemptAt")]
    pub LastAttemptAt: i64,
}

/// One answered question as recorded, with the snapshot taken at answer time.
#[derive(Debug, Clone, Serialize)]
pub struct StoredAttempt {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "questionId")]
    pub QuestionId: String,
    #[serde(rename = "knowledgePointId")]
    pub KnowledgePointId: String,
    #[serde(rename = "questionVersion")]
    pub QuestionVersion: String,
    #[serde(rename = "questionSnapshot")]
    pub QuestionSnapshot: String,
    #[serde(rename = "answer")]
    pub Answer: String,
    #[serde(rename = "isCorrect")]
    pub IsCorrect: bool,
    #[serde(rename = "createdAt")]
    pub CreatedAt: i64,
}

impl Store {
    pub fn record_attempt(&self, attempt: NewAttempt) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute(
                "INSERT INTO answer_attempts
                 (id, question_id, knowledge_point_id, question_version,
                  question_snapshot, answer, is_correct, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    attempt.Id,
                    attempt.QuestionId,
                    attempt.KnowledgePointId,
                    attempt.QuestionVersion,
                    attempt.QuestionSnapshot,
                    attempt.Answer,
                    i64::from(attempt.IsCorrect),
                    now()
                ],
            )
            .map_err(|error| format!("记录作答失败：{}", error))?;
        Ok(())
    }

    /// Questions whose most recent attempt was wrong. Answering correctly later
    /// retires the entry without deleting the history behind it.
    pub fn wrong_attempts(&self, limit: i64) -> Result<Vec<StoredAttempt>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT id, question_id, knowledge_point_id, question_version,
                        question_snapshot, answer, is_correct, created_at
                 FROM (
                     SELECT *, ROW_NUMBER() OVER (
                         PARTITION BY question_id
                         ORDER BY created_at DESC, rowid DESC
                     ) AS rank
                     FROM answer_attempts
                 )
                 WHERE rank = 1 AND is_correct = 0
                 ORDER BY created_at DESC LIMIT ?1",
            )
            .map_err(|error| format!("查询错题失败：{}", error))?;

        let rows = statement
            .query_map(params![limit], read_attempt)
            .map_err(|error| format!("读取错题失败：{}", error))?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("解析错题失败：{}", error))
    }

    pub fn forget_attempt(&self, question_id: &str) -> Result<(), String> {
        let connection = self.lock()?;
        connection
            .execute(
                "DELETE FROM answer_attempts WHERE question_id = ?1",
                params![question_id],
            )
            .map_err(|error| format!("移除错题失败：{}", error))?;
        Ok(())
    }

    /// Raw tallies per knowledge point. These are evidence, not mastery: the
    /// 0-100 mastery model is still an open product question, so nothing here
    /// pretends to be a score.
    pub fn point_stats(&self) -> Result<Vec<PointStats>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT knowledge_point_id,
                        COUNT(*),
                        SUM(is_correct),
                        MAX(created_at)
                 FROM answer_attempts
                 WHERE knowledge_point_id <> ''
                 GROUP BY knowledge_point_id
                 ORDER BY COUNT(*) DESC",
            )
            .map_err(|error| format!("查询知识点统计失败：{}", error))?;

        let rows = statement
            .query_map([], |row| {
                Ok(PointStats {
                    KnowledgePointId: row.get(0)?,
                    Attempts: row.get(1)?,
                    Correct: row.get(2)?,
                    LastAttemptAt: row.get(3)?,
                })
            })
            .map_err(|error| format!("读取知识点统计失败：{}", error))?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("解析知识点统计失败：{}", error))
    }
}

fn read_attempt(row: &rusqlite::Row<'_>) -> rusqlite::Result<StoredAttempt> {
    Ok(StoredAttempt {
        Id: row.get(0)?,
        QuestionId: row.get(1)?,
        KnowledgePointId: row.get(2)?,
        QuestionVersion: row.get(3)?,
        QuestionSnapshot: row.get(4)?,
        Answer: row.get(5)?,
        IsCorrect: row.get::<_, i64>(6)? != 0,
        CreatedAt: row.get(7)?,
    })
}

#[cfg(test)]
mod tests {
    use super::super::{open, NewAttempt};
    use std::sync::atomic::{AtomicU32, Ordering};

    fn temp_store() -> (std::path::PathBuf, super::Store) {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        let slot = COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "morrow-attempts-{}-{}.db",
            std::process::id(),
            slot
        ));
        let _ = std::fs::remove_file(&path);
        let store = open(&path).expect("database opens");
        (path, store)
    }

    fn attempt(id: &str, correct: bool) -> NewAttempt {
        NewAttempt {
            Id: id.to_string(),
            QuestionId: "q1".to_string(),
            KnowledgePointId: "limit".to_string(),
            QuestionVersion: "1.0.0".to_string(),
            QuestionSnapshot: "题干".to_string(),
            Answer: "B".to_string(),
            IsCorrect: correct,
        }
    }

    #[test]
    fn a_later_correct_attempt_retires_the_wrong_entry() {
        let (path, store) = temp_store();

        store.record_attempt(attempt("a1", false)).expect("wrong");
        assert_eq!(store.wrong_attempts(10).expect("list").len(), 1);

        store.record_attempt(attempt("a2", true)).expect("right");
        assert!(store.wrong_attempts(10).expect("list").is_empty());
        assert_eq!(store.stats().expect("stats").Attempts, 2);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn forgetting_a_question_clears_its_whole_history() {
        let (path, store) = temp_store();

        store.record_attempt(attempt("a1", false)).expect("wrong");
        store.forget_attempt("q1").expect("forget");

        assert!(store.wrong_attempts(10).expect("list").is_empty());
        assert_eq!(store.stats().expect("stats").Attempts, 0);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn point_tallies_count_every_attempt_not_just_the_latest() {
        let (path, store) = temp_store();

        store.record_attempt(attempt("a1", false)).expect("first");
        store.record_attempt(attempt("a2", true)).expect("second");

        let stats = store.point_stats().expect("point stats");
        assert_eq!(stats.len(), 1);
        assert_eq!(stats[0].KnowledgePointId, "limit");
        assert_eq!(stats[0].Attempts, 2);
        assert_eq!(stats[0].Correct, 1);

        let _ = std::fs::remove_file(path);
    }
}
