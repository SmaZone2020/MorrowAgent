use serde::{Deserialize, Serialize};

use crate::provider::types::{ChatMessage, ChatRequest, ContentPart, MessageContent, ProviderConfig};

/// One HTTP request, fully prepared for a specific protocol. Keeping the wire
/// details here means the stream loop never branches on protocol.
pub struct Prepared {
    pub Url: String,
    pub Headers: Vec<(String, String)>,
    pub Body: serde_json::Value,
}

/// The three wire protocols supported. The choice belongs to the provider
/// profile: one base URL rarely offers more than one shape.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Protocol {
    #[default]
    OpenaiChat,
    OpenaiResponses,
    Anthropic,
}

/// An image part rendered for one protocol.
fn image_block(protocol: Protocol, mime: &str, data: &str) -> serde_json::Value {
    match protocol {
        Protocol::OpenaiChat => serde_json::json!({
            "type": "image_url",
            "image_url": { "url": format!("data:{mime};base64,{data}") },
        }),
        // The responses API takes a flat image payload.
        Protocol::OpenaiResponses => serde_json::json!({
            "type": "input_image",
            "image_url": format!("data:{mime};base64,{data}"),
        }),
        Protocol::Anthropic => serde_json::json!({
            "type": "image",
            "source": { "type": "base64", "media_type": mime, "data": data },
        }),
    }
}

/// Converts one message body to the protocol's content shape.
///
/// A plain string stays a string: some providers behave differently for an
/// array of one text part, and there is no reason to send the harder shape
/// when the turn carries no images.
fn content_value(protocol: Protocol, content: &MessageContent) -> serde_json::Value {
    match content {
        MessageContent::Text(text) => serde_json::json!(text),
        MessageContent::Parts(parts) => {
            if !content.has_image() {
                return serde_json::json!(content.flatten());
            }
            let mapped: Vec<serde_json::Value> = parts
                .iter()
                .map(|part| match part {
                    ContentPart::Text { Text } => {
                        serde_json::json!({ "type": "text", "text": Text })
                    }
                    ContentPart::Image { MimeType, Data } => image_block(protocol, MimeType, Data),
                })
                .collect();
            serde_json::json!(mapped)
        }
    }
}

fn tools_value(protocol: Protocol, request: &ChatRequest) -> Option<serde_json::Value> {
    if request.Tools.is_empty() {
        return None;
    }
    let mapped: Vec<serde_json::Value> = request
        .Tools
        .iter()
        .map(|tool| match protocol {
            Protocol::OpenaiChat => serde_json::json!({
                "type": "function",
                "function": {
                    "name": tool.Name,
                    "description": tool.Description,
                    "parameters": tool.Parameters,
                },
            }),
            // The responses API flattens the function envelope.
            Protocol::OpenaiResponses => serde_json::json!({
                "type": "function",
                "name": tool.Name,
                "description": tool.Description,
                "parameters": tool.Parameters,
            }),
            Protocol::Anthropic => serde_json::json!({
                "name": tool.Name,
                "description": tool.Description,
                "input_schema": tool.Parameters,
            }),
        })
        .collect();
    Some(serde_json::json!(mapped))
}

fn split_system(messages: &[ChatMessage]) -> (Option<String>, Vec<&ChatMessage>) {
    // Anthropic takes the system prompt as a top-level field and rejects a
    // "system" role in messages, so it moves out of the list.
    let mut system = None;
    let mut turns = Vec::new();
    for message in messages {
        if message.Role == "system" {
            system = Some(message.Content.flatten());
        } else {
            turns.push(message);
        }
    }
    (system, turns)
}

/// A tool result is its own message shape in all three protocols: the output
/// string is tied to the call id the model produced earlier.
fn tool_result_value(protocol: Protocol, message: &ChatMessage) -> serde_json::Value {
    let id = message.ToolCallId.clone().unwrap_or_default();
    let output = message.Content.flatten();
    match protocol {
        Protocol::OpenaiChat => serde_json::json!({
            "role": "tool",
            "tool_call_id": id,
            "content": output,
        }),
        Protocol::OpenaiResponses => serde_json::json!({
            "type": "function_call_output",
            "call_id": id,
            "output": output,
        }),
        Protocol::Anthropic => serde_json::json!({
            "role": "user",
            "content": [{
                "type": "tool_result",
                "tool_use_id": id,
                "content": output,
            }],
        }),
    }
}

/// An assistant turn that requested tools. Every protocol needs the calls
/// echoed back so the model can match its own results to them.
fn assistant_tool_calls_value(protocol: Protocol, message: &ChatMessage) -> serde_json::Value {
    match protocol {
        Protocol::OpenaiChat => serde_json::json!({
            "role": "assistant",
            "content": message.Content.flatten(),
            "tool_calls": message.ToolCalls.iter().map(|call| serde_json::json!({
                "id": call.Id,
                "type": "function",
                "function": { "name": call.Name, "arguments": call.Arguments },
            })).collect::<Vec<_>>(),
        }),
        Protocol::OpenaiResponses => serde_json::json!({
            "role": "assistant",
            "content": [{ "type": "output_text", "text": message.Content.flatten() }],
            "tool_calls": message.ToolCalls.iter().map(|call| serde_json::json!({
                "type": "function_call",
                "call_id": call.Id,
                "name": call.Name,
                "arguments": call.Arguments,
            })).collect::<Vec<_>>(),
        }),
        Protocol::Anthropic => {
            let mut blocks: Vec<serde_json::Value> = message
                .ToolCalls
                .iter()
                .map(|call| {
                    // `input` is an object, but the call arrives as a JSON
                    // string; an unparsable one becomes `{}` rather than a 400.
                    let input: serde_json::Value =
                        serde_json::from_str(&call.Arguments).unwrap_or(serde_json::json!({}));
                    serde_json::json!({
                        "type": "tool_use",
                        "id": call.Id,
                        "name": call.Name,
                        "input": input,
                    })
                })
                .collect();
            let text = message.Content.flatten();
            if !text.is_empty() {
                blocks.insert(0, serde_json::json!({ "type": "text", "text": text }));
            }
            serde_json::json!({ "role": "assistant", "content": blocks })
        }
    }
}

fn turn_value(protocol: Protocol, message: &ChatMessage) -> serde_json::Value {
    if message.Role == "tool" {
        return tool_result_value(protocol, message);
    }
    if !message.ToolCalls.is_empty() {
        return assistant_tool_calls_value(protocol, message);
    }
    serde_json::json!({
        "role": message.Role,
        "content": content_value(protocol, &message.Content),
    })
}

pub fn prepare(config: &ProviderConfig, request: &ChatRequest) -> Prepared {
    let base = config.BaseUrl.trim_end_matches('/');
    let mut body = serde_json::json!({ "model": config.Model, "stream": true });

    if let Some(temperature) = request.Temperature {
        body["temperature"] = serde_json::json!(temperature);
    }

    let tools = tools_value(config.Protocol, request);

    match config.Protocol {
        Protocol::OpenaiChat => {
            if let Some(max_tokens) = request.MaxTokens {
                body["max_tokens"] = serde_json::json!(max_tokens);
            }
            body["messages"] = serde_json::json!(request
                .Messages
                .iter()
                .map(|message| turn_value(config.Protocol, message))
                .collect::<Vec<_>>());
            if let Some(tools) = tools {
                body["tools"] = tools;
            }
            Prepared {
                Url: format!("{}/chat/completions", base),
                Headers: Vec::new(),
                Body: body,
            }
        }
        Protocol::OpenaiResponses => {
            if let Some(max_tokens) = request.MaxTokens {
                body["max_output_tokens"] = serde_json::json!(max_tokens);
            }
            body["input"] = serde_json::json!(request
                .Messages
                .iter()
                .flat_map(|message| {
                    // Instructions cannot carry tool output; results are items.
                    if message.Role == "system" {
                        vec![serde_json::json!({
                            "role": "system",
                            "content": message.Content.flatten(),
                        })]
                    } else if message.Role == "tool" {
                        vec![tool_result_value(config.Protocol, message)]
                    } else if !message.ToolCalls.is_empty() {
                        let mut items = Vec::new();
                        let text = message.Content.flatten();
                        if !text.is_empty() {
                            items.push(serde_json::json!({
                                "role": "assistant",
                                "content": text,
                            }));
                        }
                        for call in &message.ToolCalls {
                            items.push(serde_json::json!({
                                "type": "function_call",
                                "call_id": call.Id,
                                "name": call.Name,
                                "arguments": call.Arguments,
                            }));
                        }
                        items
                    } else {
                        vec![serde_json::json!({
                            "role": "user",
                            "content": content_value(config.Protocol, &message.Content),
                        })]
                    }
                })
                .collect::<Vec<_>>());
            if let Some(tools) = tools {
                body["tools"] = tools;
            }
            Prepared {
                Url: format!("{}/responses", base),
                Headers: Vec::new(),
                Body: body,
            }
        }
        Protocol::Anthropic => {
            let (system, turns) = split_system(&request.Messages);
            if let Some(system) = system {
                body["system"] = serde_json::json!(system);
            }
            // Anthropic requires max_tokens, so fall back to a sane ceiling.
            body["max_tokens"] = serde_json::json!(request.MaxTokens.unwrap_or(2048));
            body["messages"] = serde_json::json!(turns
                .iter()
                .map(|message| turn_value(config.Protocol, message))
                .collect::<Vec<_>>());
            if let Some(tools) = tools {
                body["tools"] = tools;
            }
            Prepared {
                Url: format!("{}/messages", base),
                Headers: vec![
                    ("x-api-key".to_string(), config.ApiKey.clone()),
                    ("anthropic-version".to_string(), "2023-06-01".to_string()),
                ],
                Body: body,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{prepare, Protocol};
    use crate::provider::types::{
        ChatMessage, ChatRequest, ContentPart, MessageContent, ProviderConfig, ToolCall, ToolDef,
    };

    fn config(protocol: Protocol) -> ProviderConfig {
        ProviderConfig {
            BaseUrl: "https://example.test/v1".to_string(),
            ApiKey: "k".to_string(),
            Model: "m".to_string(),
            Protocol: protocol,
        }
    }

    fn request(messages: Vec<ChatMessage>) -> ChatRequest {
        ChatRequest {
            Messages: messages,
            Temperature: None,
            MaxTokens: None,
            Tools: Vec::new(),
        }
    }

    fn text_message(role: &str, text: &str) -> ChatMessage {
        ChatMessage {
            Role: role.to_string(),
            Content: MessageContent::Text(text.to_string()),
            ToolCalls: Vec::new(),
            ToolCallId: None,
        }
    }

    #[test]
    fn anthropic_moves_the_system_prompt_out_of_messages() {
        let prepared = prepare(
            &config(Protocol::Anthropic),
            &request(vec![
                text_message("system", "be brief"),
                text_message("user", "hi"),
            ]),
        );
        assert_eq!(prepared.Url, "https://example.test/v1/messages");
        assert_eq!(prepared.Body["system"], "be brief");
        assert_eq!(prepared.Body["messages"].as_array().unwrap().len(), 1);
        // Anthropic rejects a payload without max_tokens.
        assert!(prepared.Body["max_tokens"].is_number());
    }

    #[test]
    fn a_tool_definition_is_shaped_per_protocol() {
        let definition = ToolDef {
            Name: "ask_questions".to_string(),
            Description: "出题".to_string(),
            Parameters: serde_json::json!({"type": "object"}),
        };

        let chat = prepare(
            &config(Protocol::OpenaiChat),
            &ChatRequest {
                Tools: vec![definition.clone()],
                ..request(vec![text_message("user", "hi")])
            },
        );
        assert_eq!(chat.Body["tools"][0]["type"], "function");
        assert_eq!(chat.Body["tools"][0]["function"]["name"], "ask_questions");

        let anthropic = prepare(
            &config(Protocol::Anthropic),
            &ChatRequest {
                Tools: vec![definition],
                ..request(vec![text_message("user", "hi")])
            },
        );
        assert_eq!(anthropic.Body["tools"][0]["name"], "ask_questions");
        assert!(anthropic.Body["tools"][0]["input_schema"].is_object());
    }

    #[test]
    fn an_image_turn_is_wrapped_per_protocol() {
        let message = ChatMessage {
            Role: "user".to_string(),
            Content: MessageContent::Parts(vec![
                ContentPart::Text {
                    Text: "看这张图".to_string(),
                },
                ContentPart::Image {
                    MimeType: "image/png".to_string(),
                    Data: "AAA".to_string(),
                },
            ]),
            ToolCalls: Vec::new(),
            ToolCallId: None,
        };

        let chat = prepare(&config(Protocol::OpenaiChat), &request(vec![message.clone()]));
        assert_eq!(
            chat.Body["messages"][0]["content"][1]["image_url"]["url"],
            "data:image/png;base64,AAA"
        );

        let anthropic = prepare(&config(Protocol::Anthropic), &request(vec![message]));
        assert_eq!(
            anthropic.Body["messages"][0]["content"][1]["source"]["media_type"],
            "image/png"
        );
    }

    #[test]
    fn a_tool_result_carries_its_call_id() {
        let assistant = ChatMessage {
            Role: "assistant".to_string(),
            Content: MessageContent::Text(String::new()),
            ToolCalls: vec![ToolCall {
                Id: "call_1".to_string(),
                Name: "ask_questions".to_string(),
                Arguments: "{}".to_string(),
            }],
            ToolCallId: None,
        };
        let result = ChatMessage {
            Role: "tool".to_string(),
            Content: MessageContent::Text(r#"{"answered":1}"#.to_string()),
            ToolCalls: Vec::new(),
            ToolCallId: Some("call_1".to_string()),
        };

        let chat = prepare(
            &config(Protocol::OpenaiChat),
            &request(vec![assistant.clone(), result.clone()]),
        );
        assert_eq!(chat.Body["messages"][0]["tool_calls"][0]["id"], "call_1");
        assert_eq!(chat.Body["messages"][1]["tool_call_id"], "call_1");

        let anthropic = prepare(
            &config(Protocol::Anthropic),
            &request(vec![assistant, result]),
        );
        assert_eq!(
            anthropic.Body["messages"][1]["content"][0]["tool_use_id"],
            "call_1"
        );
    }
}
