use rusqlite::{params, OptionalExtension};
use serde::Serialize;
use std::collections::BTreeMap;

use super::{now, Store};

/// One sitting at a mock exam.
///
/// The answers live on the run rather than in `answer_attempts` until the paper
/// is submitted: a half-finished paper is not evidence of anything, and letting
/// it into the wrong book would show a learner their own working mid-exam.
#[derive(Debug, Clone, Serialize)]
pub struct ExamRun {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "workspaceId")]
    pub WorkspaceId: String,
    /// The paper's questions, in the order they are answered.
    #[serde(rename = "questionIds")]
    pub QuestionIds: Vec<String>,
    #[serde(rename = "answers")]
    pub Answers: BTreeMap<String, String>,
    /// The learner's own verdict on a question the app cannot grade. Absent for
    /// an objective question, whose verdict is computed from the answer.
    #[serde(rename = "marks")]
    pub Marks: BTreeMap<String, bool>,
    #[serde(rename = "startedAt")]
    pub StartedAt: i64,
    #[serde(rename = "submittedAt")]
    pub SubmittedAt: Option<i64>,
    #[serde(rename = "durationLimit")]
    pub DurationLimit: i64,
    /// The score as it stood at the last submission or self-marking.
    #[serde(rename = "score")]
    pub Score: Option<i64>,
}

fn read_exam(row: &rusqlite::Row<'_>) -> rusqlite::Result<ExamRun> {
    let questions: String = row.get(2)?;
    let answers: String = row.get(3)?;
    let marks: String = row.get(4)?;
    Ok(ExamRun {
        Id: row.get(0)?,
        WorkspaceId: row.get(1)?,
        QuestionIds: serde_json::from_str(&questions).unwrap_or_default(),
        Answers: serde_json::from_str(&answers).unwrap_or_default(),
        Marks: serde_json::from_str(&marks).unwrap_or_default(),
        StartedAt: row.get(5)?,
        SubmittedAt: row.get(6)?,
        DurationLimit: row.get(7)?,
        Score: row.get(8)?,
    })
}

const COLUMNS: &str = "id, workspace_id, question_ids, answers, marks, started_at,
                       submitted_at, duration_limit, score";

fn json<T: Serialize>(value: &T, fallback: &str) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| fallback.to_string())
}

impl Store {
    /// Starts a paper, dropping any unfinished one in the same workspace.
    ///
    /// An abandoned run has no score and no attempts, so keeping it would only
    /// mean the next launch resumes a paper the learner walked away from.
    pub fn start_exam(
        &self,
        workspace_id: &str,
        question_ids: &[String],
        duration: i64,
    ) -> Result<ExamRun, String> {
        let questions = json(&question_ids, "[]");
        let minutes = duration.clamp(5, 600);
        let connection = self.lock()?;

        connection
            .execute(
                "DELETE FROM exam_runs WHERE workspace_id = ?1 AND submitted_at IS NULL",
                params![workspace_id],
            )
            .map_err(|error| format!("清理未完成的考试失败：{}", error))?;

        let id = format!("exam-{}", now());
        connection
            .execute(
                "INSERT INTO exam_runs
                   (id, workspace_id, question_ids, answers, marks, started_at,
                    submitted_at, duration_limit, score)
                 VALUES (?1, ?2, ?3, '{}', '{}', ?4, NULL, ?5, NULL)",
                params![id, workspace_id, questions, now(), minutes],
            )
            .map_err(|error| format!("开始考试失败：{}", error))?;

        connection
            .query_row(
                &format!("SELECT {} FROM exam_runs WHERE id = ?1", COLUMNS),
                params![id],
                read_exam,
            )
            .map_err(|error| format!("读取考试失败：{}", error))
    }

    /// Saves answers mid-paper. A submitted run is closed to writes.
    pub fn save_exam(
        &self,
        id: &str,
        answers: &BTreeMap<String, String>,
    ) -> Result<(), String> {
        self.lock()?
            .execute(
                "UPDATE exam_runs SET answers = ?2
                 WHERE id = ?1 AND submitted_at IS NULL",
                params![id, json(answers, "{}")],
            )
            .map_err(|error| format!("保存答卷失败：{}", error))?;
        Ok(())
    }

    /// Closes the paper. Submitting twice is a no-op rather than an error: the
    /// timer and the button can both fire, and the second one must not overwrite
    /// the first submission's timestamp.
    pub fn submit_exam(
        &self,
        id: &str,
        answers: &BTreeMap<String, String>,
        score: i64,
    ) -> Result<ExamRun, String> {
        let connection = self.lock()?;
        connection
            .execute(
                "UPDATE exam_runs
                 SET answers = ?2, submitted_at = COALESCE(submitted_at, ?3), score = ?4
                 WHERE id = ?1",
                params![id, json(answers, "{}"), now(), score.max(0)],
            )
            .map_err(|error| format!("交卷失败：{}", error))?;

        connection
            .query_row(
                &format!("SELECT {} FROM exam_runs WHERE id = ?1", COLUMNS),
                params![id],
                read_exam,
            )
            .map_err(|error| format!("读取考试失败：{}", error))
    }

    /// Records the learner's verdict on questions the app cannot grade, and the
    /// total that follows from it. Refuses to touch an unsubmitted paper: a
    /// self-mark before the answer is out would be a guess.
    pub fn grade_exam(
        &self,
        id: &str,
        marks: &BTreeMap<String, bool>,
        score: i64,
    ) -> Result<ExamRun, String> {
        let connection = self.lock()?;
        connection
            .execute(
                "UPDATE exam_runs SET marks = ?2, score = ?3
                 WHERE id = ?1 AND submitted_at IS NOT NULL",
                params![id, json(marks, "{}"), score.max(0)],
            )
            .map_err(|error| format!("保存自评失败：{}", error))?;

        connection
            .query_row(
                &format!("SELECT {} FROM exam_runs WHERE id = ?1", COLUMNS),
                params![id],
                read_exam,
            )
            .map_err(|error| format!("读取考试失败：{}", error))
    }

    /// Every run in this workspace, newest first. A run without `submittedAt`
    /// is the one in progress.
    pub fn exams(&self, workspace_id: &str, limit: i64) -> Result<Vec<ExamRun>, String> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(&format!(
                "SELECT {} FROM exam_runs WHERE workspace_id = ?1
                 ORDER BY started_at DESC LIMIT ?2",
                COLUMNS
            ))
            .map_err(|error| format!("查询考试记录失败：{}", error))?;
        let rows = statement
            .query_map(params![workspace_id, limit.clamp(1, 200)], read_exam)
            .map_err(|error| format!("读取考试记录失败：{}", error))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("解析考试记录失败：{}", error))
    }

    pub fn exam(&self, id: &str) -> Result<Option<ExamRun>, String> {
        self.lock()?
            .query_row(
                &format!("SELECT {} FROM exam_runs WHERE id = ?1", COLUMNS),
                params![id],
                read_exam,
            )
            .optional()
            .map_err(|error| format!("读取考试失败：{}", error))
    }
}

#[cfg(test)]
mod tests {
    use super::super::open;
    use std::collections::BTreeMap;
    use std::sync::atomic::{AtomicU32, Ordering};

    fn temp_store() -> (std::path::PathBuf, super::Store) {
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        let slot = COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "morrow-exams-{}-{}.db",
            std::process::id(),
            slot
        ));
        let _ = std::fs::remove_file(&path);
        let store = open(&path).expect("database opens");
        (path, store)
    }

    fn answers(pairs: &[(&str, &str)]) -> BTreeMap<String, String> {
        pairs
            .iter()
            .map(|(key, value)| (key.to_string(), value.to_string()))
            .collect()
    }

    fn marks(pairs: &[(&str, bool)]) -> BTreeMap<String, bool> {
        pairs
            .iter()
            .map(|(key, value)| (key.to_string(), *value))
            .collect()
    }

    #[test]
    fn a_paper_round_trips_from_start_to_submission() {
        let (path, store) = temp_store();
        let ids = vec!["q1".to_string(), "q2".to_string()];

        let run = store.start_exam("w1", &ids, 120).expect("start");
        assert_eq!(run.QuestionIds, ids);
        assert_eq!(run.DurationLimit, 120);
        assert!(run.SubmittedAt.is_none());

        store
            .save_exam(&run.Id, &answers(&[("q1", "B")]))
            .expect("save");
        let saved = store.exam(&run.Id).expect("load").expect("run");
        assert_eq!(saved.Answers.get("q1").map(String::as_str), Some("B"));

        let closed = store
            .submit_exam(&run.Id, &answers(&[("q1", "B"), ("q2", "1")]), 5)
            .expect("submit");
        assert_eq!(closed.Score, Some(5));
        assert!(closed.SubmittedAt.is_some());

        // A late save must not reopen or rewrite a closed paper.
        store
            .save_exam(&run.Id, &answers(&[("q1", "C")]))
            .expect("late save");
        let after = store.exam(&run.Id).expect("load").expect("run");
        assert_eq!(after.Answers.get("q1").map(String::as_str), Some("B"));

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn self_marking_moves_the_score_of_a_submitted_paper() {
        let (path, store) = temp_store();
        let run = store
            .start_exam("w1", &["q1".to_string(), "q2".to_string()], 120)
            .expect("start");
        store
            .submit_exam(&run.Id, &answers(&[("q1", "B")]), 5)
            .expect("submit");

        let graded = store
            .grade_exam(&run.Id, &marks(&[("q2", true)]), 13)
            .expect("grade");
        assert_eq!(graded.Score, Some(13));
        assert_eq!(graded.Marks.get("q2"), Some(&true));

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn an_unsubmitted_paper_cannot_be_self_marked() {
        let (path, store) = temp_store();
        let run = store
            .start_exam("w1", &["q1".to_string()], 120)
            .expect("start");

        store
            .grade_exam(&run.Id, &marks(&[("q1", true)]), 10)
            .expect("no error");
        let after = store.exam(&run.Id).expect("load").expect("run");
        assert!(after.Marks.is_empty());
        assert!(after.Score.is_none());

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn starting_again_drops_the_paper_left_unfinished() {
        let (path, store) = temp_store();
        let first = store
            .start_exam("w1", &["q1".to_string()], 120)
            .expect("first");
        let second = store
            .start_exam("w1", &["q2".to_string()], 120)
            .expect("second");

        let runs = store.exams("w1", 20).expect("list");
        assert_eq!(runs.len(), 1);
        assert_eq!(runs[0].Id, second.Id);
        assert_ne!(runs[0].Id, first.Id);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn one_workspace_cannot_see_another_workspaces_exams() {
        let (path, store) = temp_store();
        store
            .start_exam("w1", &["q1".to_string()], 120)
            .expect("w1");
        store
            .start_exam("w2", &["q2".to_string()], 120)
            .expect("w2");

        assert_eq!(store.exams("w1", 20).expect("list").len(), 1);
        assert_eq!(store.exams("w2", 20).expect("list").len(), 1);

        let _ = std::fs::remove_file(path);
    }
}
