use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct StoredMessage {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "conversationId")]
    pub ConversationId: String,
    #[serde(rename = "role")]
    pub Role: String,
    #[serde(rename = "content")]
    pub Content: String,
    #[serde(rename = "createdAt")]
    pub CreatedAt: i64,
    /// Files the user attached to this turn, in the order they picked them.
    #[serde(rename = "attachments")]
    pub Attachments: Vec<MessageAttachment>,
}

/// One file attached to a turn.
///
/// An image keeps its bytes (`Data`); a document keeps the text extracted from
/// it (`Text`). Splitting the two here means a reload can redraw a thumbnail
/// without re-reading the file, and the transcript still carries what the model
/// actually saw.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MessageAttachment {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "kind")]
    pub Kind: String,
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "mimeType", default)]
    pub MimeType: String,
    #[serde(rename = "size", default)]
    pub Size: i64,
    /// Base64 image bytes, empty for documents.
    #[serde(rename = "data", default)]
    pub Data: String,
    /// Text pulled out of a PDF or a plain-text file.
    #[serde(rename = "text", default)]
    pub Text: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewMessage {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "role")]
    pub Role: String,
    #[serde(rename = "content")]
    pub Content: String,
    #[serde(rename = "createdAt", default)]
    pub CreatedAt: Option<i64>,
    #[serde(rename = "attachments", default)]
    pub Attachments: Vec<MessageAttachment>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConversationSummary {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "title")]
    pub Title: String,
    #[serde(rename = "updatedAt")]
    pub UpdatedAt: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct StoreStats {
    #[serde(rename = "path")]
    pub Path: String,
    #[serde(rename = "sizeBytes")]
    pub SizeBytes: u64,
    #[serde(rename = "conversations")]
    pub Conversations: i64,
    #[serde(rename = "messages")]
    pub Messages: i64,
    #[serde(rename = "attempts")]
    pub Attempts: i64,
    #[serde(rename = "correctAttempts")]
    pub CorrectAttempts: i64,
    #[serde(rename = "attemptedPoints")]
    pub AttemptedPoints: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewAttempt {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "questionId")]
    pub QuestionId: String,
    #[serde(rename = "knowledgePointId", default)]
    pub KnowledgePointId: String,
    #[serde(rename = "questionVersion", default)]
    pub QuestionVersion: String,
    #[serde(rename = "questionSnapshot", default)]
    pub QuestionSnapshot: String,
    #[serde(rename = "answer")]
    pub Answer: String,
    #[serde(rename = "isCorrect")]
    pub IsCorrect: bool,
    /// Why the answer went wrong, from the diagnostic vocabulary. Empty for a
    /// correct answer and for one the learner has not classified yet.
    #[serde(rename = "errorType", default)]
    pub ErrorType: String,
    /// A small JSON summary of the scratchpad work, so a later read can tell
    /// "worked it out on paper" from "guessed".
    #[serde(rename = "inkSummary", default)]
    pub InkSummary: String,
    /// Where the answer came from: empty for practice, `exam:<runId>` for a
    /// mock exam. The wrong book keeps both, but a paper's mistakes deserve to
    /// be read together.
    #[serde(rename = "source", default)]
    pub Source: String,
}
