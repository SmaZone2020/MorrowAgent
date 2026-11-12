/// Ordered schema migrations. Index + 1 is the version the database reaches
/// after applying it, so never reorder or edit a shipped entry: append only.
pub const MIGRATIONS: &[&str] = &[
    // 1 — conversations and their turns.
    r#"
    CREATE TABLE IF NOT EXISTS conversations (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL DEFAULT '',
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
        id               TEXT PRIMARY KEY,
        conversation_id  TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        seq              INTEGER NOT NULL,
        role             TEXT NOT NULL,
        content          TEXT NOT NULL,
        created_at       INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation
        ON messages(conversation_id, seq);
    "#,
    // 2 — answer attempts. The question text is snapshotted on purpose: a later
    // knowledge-pack update must not rewrite the history of what was answered.
    r#"
    CREATE TABLE IF NOT EXISTS answer_attempts (
        id                TEXT PRIMARY KEY,
        question_id       TEXT NOT NULL,
        knowledge_point_id TEXT NOT NULL DEFAULT '',
        question_version  TEXT NOT NULL DEFAULT '',
        question_snapshot TEXT NOT NULL DEFAULT '',
        answer            TEXT NOT NULL,
        is_correct        INTEGER NOT NULL,
        created_at        INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_question
        ON answer_attempts(question_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_attempts_point
        ON answer_attempts(knowledge_point_id, created_at);
    "#,
    // 3 — workspaces. A workspace is the data side of a learning package: a
    // package can be uninstalled while its history stays readable, so the row
    // keeps its own identity and only loses `root_path` when orphaned.
    r#"
    CREATE TABLE IF NOT EXISTS workspaces (
        id               TEXT PRIMARY KEY,
        package_id       TEXT NOT NULL,
        package_version  TEXT NOT NULL DEFAULT '',
        name             TEXT NOT NULL DEFAULT '',
        root_path        TEXT NOT NULL DEFAULT '',
        cover_path       TEXT,
        accent           TEXT,
        tags             TEXT NOT NULL DEFAULT '[]',
        installed_at     INTEGER NOT NULL,
        last_opened_at   INTEGER NOT NULL DEFAULT 0,
        orphaned         INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_workspaces_package
        ON workspaces(package_id);

    ALTER TABLE conversations ADD COLUMN workspace_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE answer_attempts ADD COLUMN workspace_id TEXT NOT NULL DEFAULT '';
    "#,
    // 4 — files a turn carried. Stored as JSON so the column stays opaque to
    // SQL: a turn's attachments are read as one list or not at all, and an
    // older build that does not know about them still sees the text.
    r#"
    ALTER TABLE messages ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]';
    "#,
    // 5 — one study goal per workspace. It is a target, not a record: nothing
    // here is derived from attempts, so replacing the row is always safe.
    r#"
    CREATE TABLE IF NOT EXISTS study_goals (
        workspace_id     TEXT PRIMARY KEY,
        target_score     INTEGER,
        exam_date        TEXT,
        minutes_per_day  INTEGER NOT NULL DEFAULT 30,
        difficulty_focus TEXT NOT NULL DEFAULT '[]',
        note             TEXT NOT NULL DEFAULT '',
        updated_at       INTEGER NOT NULL
    );
    "#,
    // 6 — why an answer went wrong, and how sure the app is of a point's state.
    // Both are overlays: mastery stays a pure function of the tallies, so the
    // numbers a user has already seen do not shift under them. Kept as one
    // migration on purpose — `ADD COLUMN` is not idempotent, so a database that
    // has already applied this half must never be asked to apply it again.
    r#"
    ALTER TABLE answer_attempts ADD COLUMN error_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE answer_attempts ADD COLUMN ink_summary TEXT NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS point_evidence (
        workspace_id TEXT NOT NULL,
        point_id     TEXT NOT NULL,
        state        TEXT NOT NULL,
        note         TEXT NOT NULL DEFAULT '',
        updated_at   INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, point_id)
    );
    "#,
    // 7 — mock exam sittings. The answers stay on the run until it is submitted
    // so a half-finished paper never becomes an attempt: a learner's working
    // mid-exam is not evidence of what they know. `question_ids`, `answers` and
    // `marks` are JSON because the paper is read whole or not at all.
    //
    // `answer_attempts.source` rides along in the same migration: an attempt
    // made during an exam has to say so, or the wrong book cannot tell practice
    // from a paper.
    r#"
    CREATE TABLE IF NOT EXISTS exam_runs (
        id             TEXT PRIMARY KEY,
        workspace_id   TEXT NOT NULL,
        question_ids   TEXT NOT NULL,
        answers        TEXT NOT NULL DEFAULT '{}',
        marks          TEXT NOT NULL DEFAULT '{}',
        started_at     INTEGER NOT NULL,
        submitted_at   INTEGER,
        duration_limit INTEGER NOT NULL,
        score          INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_exams_workspace
        ON exam_runs(workspace_id, started_at);

    ALTER TABLE answer_attempts ADD COLUMN source TEXT NOT NULL DEFAULT '';
    "#,
];
