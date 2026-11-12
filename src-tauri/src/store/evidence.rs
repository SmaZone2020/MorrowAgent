use rusqlite::params;
use serde::Serialize;

use super::{now, Store};

/// How much the app trusts what it says about a knowledge point.
///
/// The mastery score is arithmetic over the attempts and never changes shape.
/// This is the layer beside it: a judgement the model only suspects is not the
/// same as one the learner confirmed, and a learner who says "I actually know
/// this" outranks both.
pub const STATES: [&str; 4] = ["observed", "hypothesized", "verified", "user_corrected"];

#[derive(Debug, Clone, Serialize)]
pub struct PointEvidence {
    #[serde(rename = "pointId")]
    pub PointId: String,
    #[serde(rename = "state")]
    pub State: String,
    #[serde(rename = "note")]
    pub Note: String,
    #[serde(rename = "updatedAt")]
    pub UpdatedAt: i64,
}

impl Store {
    pub fn evidence(&self, workspace_id: &str) -> Result<Vec<PointEvidence>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT point_id, state, note, updated_at
                 FROM point_evidence WHERE workspace_id = ?1",
            )
            .map_err(|error| format!("查询证据状态失败：{}", error))?;

        let rows = statement
            .query_map(params![workspace_id], |row| {
                Ok(PointEvidence {
                    PointId: row.get(0)?,
                    State: row.get(1)?,
                    Note: row.get(2)?,
                    UpdatedAt: row.get(3)?,
                })
            })
            .map_err(|error| format!("读取证据状态失败：{}", error))?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("解析证据状态失败：{}", error))
    }

    /// One state per point. A correction is a decision, so the last write wins
    /// and there is no history to reconcile.
    pub fn set_evidence(
        &self,
        workspace_id: &str,
        point_id: &str,
        state: &str,
        note: &str,
    ) -> Result<(), String> {
        if !STATES.contains(&state) {
            return Err(format!("未知的证据状态：{state}"));
        }

        self.lock()?
            .execute(
                "INSERT INTO point_evidence (workspace_id, point_id, state, note, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(workspace_id, point_id) DO UPDATE SET
                   state = excluded.state,
                   note = excluded.note,
                   updated_at = excluded.updated_at",
                params![workspace_id, point_id, state, note, now()],
            )
            .map_err(|error| format!("保存证据状态失败：{}", error))?;
        Ok(())
    }

    pub fn clear_evidence(&self, workspace_id: &str, point_id: &str) -> Result<(), String> {
        self.lock()?
            .execute(
                "DELETE FROM point_evidence WHERE workspace_id = ?1 AND point_id = ?2",
                params![workspace_id, point_id],
            )
            .map_err(|error| format!("清除证据状态失败：{}", error))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::super::open;
    use std::sync::atomic::{AtomicU32, Ordering};

    fn temp_store() -> (std::path::PathBuf, super::Store) {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        let slot = COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "morrow-evidence-{}-{}.db",
            std::process::id(),
            slot
        ));
        let _ = std::fs::remove_file(&path);
        let store = open(&path).expect("database opens");
        (path, store)
    }

    #[test]
    fn a_state_round_trips_and_the_last_write_wins() {
        let (path, store) = temp_store();

        store
            .set_evidence("w1", "limit", "hypothesized", "")
            .expect("set");
        store
            .set_evidence("w1", "limit", "user_corrected", "其实会")
            .expect("correct");

        let rows = store.evidence("w1").expect("list");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].State, "user_corrected");
        assert_eq!(rows[0].Note, "其实会");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn an_unknown_state_is_rejected() {
        let (path, store) = temp_store();
        assert!(store.set_evidence("w1", "limit", "guessed", "").is_err());
        assert!(store.evidence("w1").expect("list").is_empty());
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn clearing_removes_only_that_point_in_that_workspace() {
        let (path, store) = temp_store();
        store.set_evidence("w1", "a", "verified", "").expect("a");
        store.set_evidence("w1", "b", "verified", "").expect("b");
        store.set_evidence("w2", "a", "verified", "").expect("other");

        store.clear_evidence("w1", "a").expect("clear");

        assert_eq!(store.evidence("w1").expect("list").len(), 1);
        assert_eq!(store.evidence("w2").expect("list").len(), 1);

        let _ = std::fs::remove_file(path);
    }
}
