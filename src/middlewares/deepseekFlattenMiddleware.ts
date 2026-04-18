import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { createMiddleware } from "langchain";

/**
 * Coerce message `content` to plain strings and drop `output_version` metadata so
 * DeepSeek's OpenAI-compatible API accepts the request (tool/system rows were
 * emitting `[{type:"text",text:"..."}]` arrays).
 */
function joinTextContent(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content);
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block === "string") parts.push(block);
    else if (block && typeof block === "object" && "type" in block) {
      const b = block as { type: string; text?: unknown };
      if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
    }
  }
  return parts.join("\n\n");
}

function stripOutputVersion(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!meta) return {};
  const { output_version: _ignored, ...rest } = meta;
  return rest;
}

function normalizeForDeepSeek(m: BaseMessage): BaseMessage {
  const meta = stripOutputVersion(
    m.response_metadata as Record<string, unknown> | undefined,
  );
  const text = joinTextContent(m.content);

  if (SystemMessage.isInstance(m)) {
    return new SystemMessage({
      content: text,
      id: m.id,
      name: m.name,
      additional_kwargs: m.additional_kwargs,
      response_metadata: meta,
    });
  }
  if (HumanMessage.isInstance(m)) {
    return new HumanMessage({
      content: text,
      id: m.id,
      name: m.name,
      additional_kwargs: m.additional_kwargs,
      response_metadata: meta,
    });
  }
  if (ToolMessage.isInstance(m)) {
    return new ToolMessage({
      content: text,
      tool_call_id: m.tool_call_id,
      id: m.id,
      name: m.name,
      additional_kwargs: m.additional_kwargs,
      response_metadata: meta,
    });
  }
  if (AIMessage.isInstance(m)) {
    return new AIMessage({
      content: text,
      tool_calls: m.tool_calls,
      invalid_tool_calls: m.invalid_tool_calls,
      id: m.id,
      name: m.name,
      additional_kwargs: m.additional_kwargs,
      response_metadata: meta,
    });
  }
  return m;
}

export const deepseekFlattenMiddleware = createMiddleware({
  name: "DeepSeekFlattenMessageContent",
  wrapModelCall: async (request, handler) => {
    const systemMessage = new SystemMessage({
      content: joinTextContent(request.systemMessage.content),
      id: request.systemMessage.id,
      name: request.systemMessage.name,
      additional_kwargs: request.systemMessage.additional_kwargs,
      response_metadata: stripOutputVersion(
        request.systemMessage.response_metadata as
          | Record<string, unknown>
          | undefined,
      ),
    });
    const messages = request.messages.map(normalizeForDeepSeek);
    return handler({ ...request, systemMessage, messages });
  },
});
