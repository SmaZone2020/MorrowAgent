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
];
