use std::collections::HashMap;

use serde_json::Value;

use crate::provider::types::ToolCall;

/// One fragment decoded from an SSE frame.
///
/// Text is appended by the caller as it arrives. A tool call arrives as a start
/// frame followed by argument fragments, because that is how every provider
/// encodes it: the JSON is never complete until the last fragment.
pub enum WireEvent {
    Text(String),
    ToolStart {
        Key: String,
        Id: String,
        Name: String,
    },
    ToolArgs {
        Key: String,
        Fragment: String,
    },
}

/// Reassembles streamed tool calls into whole calls.
///
/// Ordering follows first appearance, not completion, so a reply that requests
/// two tools still executes them in the order the model asked.
#[derive(Default)]
pub struct ToolAccumulator {
    order: Vec<String>,
    entries: HashMap<String, (String, String, String)>,
}

impl ToolAccumulator {
    pub fn apply(&mut self, event: &WireEvent) {
        match event {
            WireEvent::ToolStart { Key, Id, Name } => {
                if !self.entries.contains_key(Key) {
                    self.order.push(Key.clone());
                }
                self.entries
                    .insert(Key.clone(), (Id.clone(), Name.clone(), String::new()));
            }
            WireEvent::ToolArgs { Key, Fragment } => {
                if let Some(entry) = self.entries.get_mut(Key) {
                    entry.2.push_str(Fragment);
                }
            }
            WireEvent::Text(_) => {}
        }
    }

    /// Completed calls. A call whose arguments never parsed is still returned:
    /// the frontend reports it as a failed tool rather than dropping the turn.
    pub fn finish(self) -> Vec<ToolCall> {
        self.order
            .into_iter()
            .filter_map(|key| self.entries.get(&key).cloned())
            .map(|(Id, Name, Arguments)| ToolCall {
                Id,
                Name,
                Arguments,
            })
            .collect()
    }
}

fn payload(line: &str) -> Option<Value> {
    let data = line.strip_prefix("data:")?.trim();
    if data.is_empty() || data == "[DONE]" {
        return None;
    }
    serde_json::from_str(data).ok()
}

fn text(text: &str) -> Option<WireEvent> {
    (!text.is_empty()).then(|| WireEvent::Text(text.to_string()))
}

pub fn read_openai_chat(line: &str) -> Vec<WireEvent> {
    let Some(value) = payload(line) else {
        return Vec::new();
    };
    let Some(delta) = value
        .get("choices")
        .and_then(|choices| choices.get(0))
        .and_then(|choice| choice.get("delta"))
    else {
        return Vec::new();
    };

    let mut events = Vec::new();
    if let Some(content) = delta.get("content").and_then(Value::as_str) {
        events.extend(text(content));
    }
    // Tool calls stream in one or more entries keyed by `index`.
    if let Some(calls) = delta.get("tool_calls").and_then(Value::as_array) {
        for call in calls {
            let index = call.get("index").and_then(Value::as_u64).unwrap_or(0);
            let key = index.to_string();
            let function = call.get("function");

            // The first fragment carries the id and name; later ones only args.
            if let Some(id) = call.get("id").and_then(Value::as_str) {
                let name = function
                    .and_then(|entry| entry.get("name"))
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                events.push(WireEvent::ToolStart {
                    Key: key.clone(),
                    Id: id.to_string(),
                    Name: name.to_string(),
                });
            }
            if let Some(args) = function
                .and_then(|entry| entry.get("arguments"))
                .and_then(Value::as_str)
            {
                events.push(WireEvent::ToolArgs {
                    Key: key,
                    Fragment: args.to_string(),
                });
            }
        }
    }
    events
}

pub fn read_openai_responses(line: &str) -> Vec<WireEvent> {
    let Some(value) = payload(line) else {
        return Vec::new();
    };
    match value.get("type").and_then(Value::as_str).unwrap_or_default() {
        "response.output_text.delta" => value
            .get("delta")
            .and_then(Value::as_str)
            .and_then(text)
            .into_iter()
            .collect(),
        // A function call is announced with its id and name, then filled in.
        "response.output_item.added" => {
            let Some(item) = value.get("item") else {
                return Vec::new();
            };
            if item.get("type").and_then(Value::as_str) != Some("function_call") {
                return Vec::new();
            }
            let key = value
                .get("output_index")
                .and_then(Value::as_u64)
                .map(|index| index.to_string())
                .or_else(|| {
                    item.get("id")
                        .and_then(Value::as_str)
                        .map(str::to_string)
                })
                .unwrap_or_default();
            let id = item
                .get("call_id")
                .or_else(|| item.get("id"))
                .and_then(Value::as_str)
                .unwrap_or_default();
            let name = item.get("name").and_then(Value::as_str).unwrap_or_default();
            vec![WireEvent::ToolStart {
                Key: key,
                Id: id.to_string(),
                Name: name.to_string(),
            }]
        }
        "response.function_call_arguments.delta" => {
            let key = value
                .get("output_index")
                .and_then(Value::as_u64)
                .map(|index| index.to_string())
                .or_else(|| {
                    value
                        .get("item_id")
                        .and_then(Value::as_str)
                        .map(str::to_string)
                })
                .unwrap_or_default();
            let Some(fragment) = value.get("delta").and_then(Value::as_str) else {
                return Vec::new();
            };
            vec![WireEvent::ToolArgs {
                Key: key,
                Fragment: fragment.to_string(),
            }]
        }
        _ => Vec::new(),
    }
}

pub fn read_anthropic(line: &str) -> Vec<WireEvent> {
    let Some(value) = payload(line) else {
        return Vec::new();
    };
    match value.get("type").and_then(Value::as_str).unwrap_or_default() {
        "content_block_start" => {
            let block = value.get("content_block");
            if block.and_then(|entry| entry.get("type")).and_then(Value::as_str) != Some("tool_use")
            {
                return Vec::new();
            }
            let key = value
                .get("index")
                .and_then(Value::as_u64)
                .map(|index| index.to_string())
                .unwrap_or_default();
            let id = block
                .and_then(|entry| entry.get("id"))
                .and_then(Value::as_str)
                .unwrap_or_default();
            let name = block
                .and_then(|entry| entry.get("name"))
                .and_then(Value::as_str)
                .unwrap_or_default();
            vec![WireEvent::ToolStart {
                Key: key,
                Id: id.to_string(),
                Name: name.to_string(),
            }]
        }
        "content_block_delta" => {
            let delta = value.get("delta");
            let kind = delta
                .and_then(|entry| entry.get("type"))
                .and_then(Value::as_str)
                .unwrap_or_default();
            let key = value
                .get("index")
                .and_then(Value::as_u64)
                .map(|index| index.to_string())
                .unwrap_or_default();
            match kind {
                "text_delta" => delta
                    .and_then(|entry| entry.get("text"))
                    .and_then(Value::as_str)
                    .and_then(text)
                    .into_iter()
                    .collect(),
                // Anthropic calls the argument fragments `partial_json`.
                "input_json_delta" => delta
                    .and_then(|entry| entry.get("partial_json"))
                    .and_then(Value::as_str)
                    .map(|fragment| {
                        vec![WireEvent::ToolArgs {
                            Key: key,
                            Fragment: fragment.to_string(),
                        }]
                    })
                    .unwrap_or_default(),
                _ => Vec::new(),
            }
        }
        _ => Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::{read_anthropic, read_openai_chat, read_openai_responses, ToolAccumulator, WireEvent};

    fn texts(events: &[WireEvent]) -> String {
        events
            .iter()
            .filter_map(|event| match event {
                WireEvent::Text(text) => Some(text.as_str()),
                _ => None,
            })
            .collect()
    }

    #[test]
    fn chat_reads_a_delta() {
        let line = r#"data: {"choices":[{"delta":{"content":"Hi"}}]}"#;
        assert_eq!(texts(&read_openai_chat(line)), "Hi");
        assert!(read_openai_chat("data: [DONE]").is_empty());
    }

    #[test]
    fn responses_reads_only_text_deltas() {
        let delta = r#"data: {"type":"response.output_text.delta","delta":"Hi"}"#;
        assert_eq!(texts(&read_openai_responses(delta)), "Hi");
        assert!(read_openai_responses(r#"data: {"type":"response.created"}"#).is_empty());
    }

    #[test]
    fn anthropic_reads_content_block_deltas() {
        let delta = r#"data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}"#;
        assert_eq!(texts(&read_anthropic(delta)), "Hi");
        assert!(read_anthropic(r#"data: {"type":"ping"}"#).is_empty());
    }

    /// The three protocols spell tool streaming differently; each has to end up
    /// as the same call once the fragments are reassembled.
    #[test]
    fn openai_chat_reassembles_a_tool_call() {
        let mut accumulator = ToolAccumulator::default();
        let start = r#"data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"ask_questions","arguments":""}}]}}]}"#;
        let part = r#"data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\"count\":2}"}}]}}]}"#;
        for event in read_openai_chat(start).iter().chain(read_openai_chat(part).iter()) {
            accumulator.apply(event);
        }
        let calls = accumulator.finish();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].Name, "ask_questions");
        assert_eq!(calls[0].Arguments, r#"{"count":2}"#);
    }

    #[test]
    fn anthropic_reassembles_a_tool_call() {
        let mut accumulator = ToolAccumulator::default();
        let start = r#"data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_1","name":"ask_questions"}}"#;
        let partial = r#"data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"count\":"}}"#;
        let rest = r#"data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"3}"}}"#;
        for event in read_anthropic(start)
            .iter()
            .chain(read_anthropic(partial).iter())
            .chain(read_anthropic(rest).iter())
        {
            accumulator.apply(event);
        }
        let calls = accumulator.finish();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].Id, "toolu_1");
        assert_eq!(calls[0].Arguments, r#"{"count":3}"#);
    }

    #[test]
    fn responses_reassembles_a_tool_call() {
        let mut accumulator = ToolAccumulator::default();
        let start = r#"data: {"type":"response.output_item.added","output_index":0,"item":{"type":"function_call","id":"fc_1","call_id":"call_1","name":"ask_questions"}}"#;
        let part = r#"data: {"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\"count\":4}"}"#;
        for event in read_openai_responses(start)
            .iter()
            .chain(read_openai_responses(part).iter())
        {
            accumulator.apply(event);
        }
        let calls = accumulator.finish();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].Name, "ask_questions");
        assert_eq!(calls[0].Arguments, r#"{"count":4}"#);
    }
}
