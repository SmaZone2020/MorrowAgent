use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};

use super::{now, Store};

/// What the learner is aiming at. Everything is optional on purpose: a package
/// can be opened without ever setting a goal, and the plan view then falls back
/// to ranking weak points instead of refusing to render.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudyGoal {
    #[serde(rename = "targetScore", default)]
    pub TargetScore: Option<i64>,
    /// `YYYY-MM-DD`, local to the learner, or absent when no exam is scheduled.
    #[serde(rename = "examDate", default)]
    pub ExamDate: Option<String>,
    #[serde(rename = "minutesPerDay", default = "default_minutes")]
    pub MinutesPerDay: i64,
    /// `basic` / `advanced` / `challenging`, as JSON, because it is one value
    /// the plan reads as a set and the schema never queries.
    #[serde(rename = "difficultyFocus", default)]
    pub DifficultyFocus: Vec<String>,
    #[serde(rename = "note", default)]
    pub Note: String,
}

fn default_minutes() -> i64 {
    30
}

impl Default for StudyGoal {
    fn default() -> Self {
        StudyGoal {
            TargetScore: None,
            ExamDate: None,
            MinutesPerDay: default_minutes(),
            DifficultyFocus: Vec::new(),
            Note: String::new(),
        }
    }
}

/// One day of practice, for the report's trend line.
#[derive(Debug, Clone, Serialize)]
pub struct TrendPoint {
    #[serde(rename = "date")]
    pub Date: String,
    #[serde(rename = "attempts")]
    pub Attempts: i64,
    #[serde(rename = "correct")]
    pub Correct: i64,
}

impl Store {
    pub fn goal(&self, workspace_id: &str) -> Result<Option<StudyGoal>, String> {
        let connection = self.lock()?;
        let row = connection
            .query_row(
                "SELECT target_score, exam_date, minutes_per_day, difficulty_focus, note
                 FROM study_goals WHERE workspace_id = ?1",
                params![workspace_id],
                |row| {
                    let focus: String = row.get(3)?;
                    Ok(StudyGoal {
                        TargetScore: row.get(0)?,
                        ExamDate: row.get(1)?,
                        MinutesPerDay: row.get(2)?,
                        DifficultyFocus: serde_json::from_str(&focus).unwrap_or_default(),
                        Note: row.get(4)?,
                    })
                },
            )
            .optional()
            .map_err(|error| format!("读取学习目标失败：{}", error))?;
        Ok(row)
    }

    /// Replaces the whole goal. A goal is a decision, not a log, so the last
    /// save wins and no history is kept.
    pub fn save_goal(&self, workspace_id: &str, goal: &StudyGoal) -> Result<(), String> {
        let focus =
            serde_json::to_string(&goal.DifficultyFocus).unwrap_or_else(|_| "[]".to_string());
        // A blank date field would otherwise become a real date of "" and make
        // every countdown negative.
        let exam_date = goal
            .ExamDate
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty());

        self.lock()?
            .execute(
                "INSERT INTO study_goals
                   (workspace_id, target_score, exam_date, minutes_per_day,
                    difficulty_focus, note, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(workspace_id) DO UPDATE SET
                   target_score = excluded.target_score,
                   exam_date = excluded.exam_date,
                   minutes_per_day = excluded.minutes_per_day,
                   difficulty_focus = excluded.difficulty_focus,
                   note = excluded.note,
                   updated_at = excluded.updated_at",
                params![
                    workspace_id,
                    goal.TargetScore,
                    exam_date,
                    goal.MinutesPerDay.max(5),
                    focus,
                    goal.Note,
                    now()
                ],
            )
            .map_err(|error| format!("保存学习目标失败：{}", error))?;
        Ok(())
    }

    /// Attempts per local day. Days with no practice are simply absent; the
    /// report fills the gaps so the x axis stays evenly spaced.
    pub fn attempt_trend(&self, workspace_id: &str, days: i64) -> Result<Vec<TrendPoint>, String> {
        let window = days.clamp(1, 365);
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT date(created_at / 1000, 'unixepoch', 'localtime') AS day,
                        COUNT(*),
                        SUM(is_correct)
                 FROM answer_attempts
                 WHERE workspace_id = ?1
                   AND created_at >= (strftime('%s','now','localtime') - ?2 * 86400) * 1000
                 GROUP BY day
                 ORDER BY day ASC",
            )
            .map_err(|error| format!("查询学习趋势失败：{}", error))?;

        let rows = statement
            .query_map(params![workspace_id, window], |row| {
                Ok(TrendPoint {
                    Date: row.get(0)?,
                    Attempts: row.get(1)?,
                    Correct: row.get(2)?,
                })
            })
            .map_err(|error| format!("读取学习趋势失败：{}", error))?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("解析学习趋势失败：{}", error))
    }
}

#[cfg(test)]
mod tests {
    use super::super::{open, NewAttempt};
    use super::StudyGoal;
    use std::sync::atomic::{AtomicU32, Ordering};

    fn temp_store() -> (std::path::PathBuf, super::Store) {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        let slot = COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "morrow-goals-{}-{}.db",
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
            QuestionId: format!("q-{id}"),
            KnowledgePointId: "limit".to_string(),
            QuestionVersion: "1.0.0".to_string(),
            QuestionSnapshot: "题干".to_string(),
            Answer: "B".to_string(),
            IsCorrect: correct,
            ErrorType: String::new(),
            InkSummary: String::new(),
            Source: String::new(),
        }
    }

    #[test]
    fn a_goal_round_trips_and_can_be_replaced() {
        let (path, store) = temp_store();
        assert!(store.goal("w1").expect("load").is_none());

        store
            .save_goal(
                "w1",
                &StudyGoal {
                    TargetScore: Some(120),
                    ExamDate: Some("2027-06-07".to_string()),
                    MinutesPerDay: 60,
                    DifficultyFocus: vec!["basic".to_string()],
                    Note: "先补极限".to_string(),
                },
            )
            .expect("save");

        let loaded = store.goal("w1").expect("load").expect("goal");
        assert_eq!(loaded.TargetScore, Some(120));
        assert_eq!(loaded.MinutesPerDay, 60);
        assert_eq!(loaded.DifficultyFocus, vec!["basic".to_string()]);

        store
            .save_goal(
                "w1",
                &StudyGoal {
                    ExamDate: Some("   ".to_string()),
                    ..StudyGoal::default()
                },
            )
            .expect("replace");
        assert!(store.goal("w1").expect("load").expect("goal").ExamDate.is_none());

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn a_goal_is_invisible_to_another_workspace() {
        let (path, store) = temp_store();
        store
            .save_goal("w1", &StudyGoal::default())
            .expect("save");

        assert!(store.goal("w1").expect("load").is_some());
        assert!(store.goal("w2").expect("load").is_none());

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn the_trend_counts_only_this_workspace() {
        let (path, store) = temp_store();
        store.record_attempt("w1", attempt("a1", true)).expect("a1");
        store.record_attempt("w1", attempt("a2", false)).expect("a2");
        store.record_attempt("w2", attempt("a3", true)).expect("a3");

        let trend = store.attempt_trend("w1", 14).expect("trend");
        assert_eq!(trend.len(), 1);
        assert_eq!(trend[0].Attempts, 2);
        assert_eq!(trend[0].Correct, 1);

        let _ = std::fs::remove_file(path);
    }
}
