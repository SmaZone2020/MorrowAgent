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
}
