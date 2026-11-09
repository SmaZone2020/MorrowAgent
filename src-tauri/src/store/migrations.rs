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
];
